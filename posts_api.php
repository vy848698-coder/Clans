<?php
/**
 * posts_api.php — CRUD API for blog posts, used by the admin dashboard.
 *
 * The public website (blog.php / post.php) READS the `posts` table directly.
 * This endpoint lets the Next.js dashboard CREATE / UPDATE / DELETE / HIDE posts.
 *
 * Actions (all POST except list):
 *   GET  posts_api.php                       → list all posts (admin: includes hidden)
 *   POST posts_api.php?action=create         → create, body = post JSON
 *   POST posts_api.php?action=update&id=#     → update, body = post JSON
 *   POST posts_api.php?action=delete&id=#     → delete
 *   POST posts_api.php?action=toggle&id=#     → flip hidden on/off
 *
 * Cover images are sent as a base64 data URL in `image` and saved to
 * /image/blog/uploads/, so the public site can serve them by path.
 */

require __DIR__ . '/db.php';

// CORS for the admin dashboard (origin configurable via DASHBOARD_ORIGIN env).
send_cors_headers();

// Require the shared admin key on every real request (see api_guard.php).
require __DIR__ . '/api_guard.php';
require_api_key();

function out($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }

// Blog content from the dashboard is plain text; content from the PHP admin is
// rich HTML. Only sanitize when it actually contains markup — that's exactly the
// case where post.php renders the body as raw HTML — so plain text is stored
// untouched (no entity double-encoding) while any injected tags (e.g. <script>)
// are run through the safe-tag whitelist in sanitize_html(). Prevents stored XSS.
function sanitize_blog_content($content) {
    $content = (string) $content;
    if ($content === "" || strip_tags($content) === $content) return $content;
    return sanitize_html($content);
}

// Map a DB row to the shape the dashboard expects.
function shape($r) {
    return [
        "id"       => (int) $r["id"],
        "title"    => $r["title"],
        "excerpt"  => $r["excerpt"],
        "content"  => $r["body"],
        "category" => $r["category"],
        "chip"     => $r["chip"],
        "author"   => $r["author"],
        "readTime" => $r["read_time"],
        "cover"    => $r["image"],
        "hidden"   => (bool) $r["hidden"],
        "date"     => date("M j, Y", strtotime($r["created_at"])),
    ];
}

// Resolve the cover value the dashboard sent into something the PUBLIC site can
// actually render. Images are kept INLINE as a base64 data URL so they travel
// with the DB row (surviving redeploys / DB import-export). Rules:
//   - data URL  → downscaled + recompressed, then stored inline.
//   - http(s)   → stored as-is (external image).
//   - local path→ ONLY kept if that file exists on THIS server; a dead path is
//                 dropped and the existing cover is kept, so uploads made on a
//                 different host never leave the public card imageless.
//   - empty     → keep the existing cover unchanged.
function save_image($image, $existing = "") {
    $image = trim((string)$image);
    if ($image === "") return $existing;

    if (strpos($image, "data:image/") === 0) {
        if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#s', $image, $m)) return $existing;
        if (strlen($image) > 12 * 1024 * 1024) return $existing; // sanity cap on the raw payload
        $bytes = base64_decode($m[2], true);
        if ($bytes === false) return $existing;
        $tmp = tempnam(sys_get_temp_dir(), 'cov');
        if ($tmp && file_put_contents($tmp, $bytes) !== false) {
            $err = null;
            $url = make_cover_data_url($tmp, 'image/' . ($m[1] === 'jpg' ? 'jpeg' : $m[1]), $err);
            @unlink($tmp);
            if ($url !== null) return $url;         // compressed data URL
        }
        return $image;                              // fall back to the raw data URL
    }

    if (preg_match('#^https?://#i', $image)) return $image;   // external URL

    // A local/relative path: keep only if the file is really here.
    $rel = ltrim(str_replace('\\', '/', $image), '/');
    if ($rel !== "" && is_file(__DIR__ . '/' . $rel)) return $image;
    return $existing;                               // dead path → don't store it
}

$action = $_GET["action"] ?? "";
$id     = (int) ($_GET["id"] ?? 0);

// --- LIST (GET) -------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $rows = $pdo->query("SELECT * FROM posts ORDER BY created_at DESC")->fetchAll();
    out(array_map("shape", $rows));
}

// --- Mutations (POST) -------------------------------------------------------
$input = json_decode(file_get_contents("php://input"), true) ?: [];

if ($action === "create") {
    if (empty(trim($input["title"] ?? ""))) out(["error" => "Title is required"], 400);
    $stmt = $pdo->prepare(
        "INSERT INTO posts (title, chip, category, excerpt, body, author, read_time, image, hidden)
         VALUES (:title, :chip, :category, :excerpt, :body, :author, :read_time, :image, 0)"
    );
    $stmt->execute([
        ":title"     => $input["title"],
        ":chip"      => $input["category"] ?? "",        // chip mirrors category for the public card
        ":category"  => $input["category"] ?? "",
        ":excerpt"   => $input["excerpt"] ?? "",
        ":body"      => sanitize_blog_content($input["content"] ?? ""),
        ":author"    => $input["author"] ?? "",
        ":read_time" => $input["readTime"] ?? "",
        ":image"     => save_image($input["cover"] ?? ""),
    ]);
    $newId = (int) $pdo->lastInsertId(); // (create has no existing cover)
    $row = $pdo->query("SELECT * FROM posts WHERE id = $newId")->fetch();
    out(["ok" => true, "post" => shape($row)]);
}

if ($action === "update") {
    if ($id <= 0) out(["error" => "Invalid id"], 400);
    // Current cover: reused when the dashboard sends nothing or a dead path,
    // so an edit never accidentally wipes / dead-links an existing image.
    $currentImage = (string) ($pdo->query("SELECT image FROM posts WHERE id = $id")->fetchColumn() ?: "");
    $stmt = $pdo->prepare(
        "UPDATE posts SET title=:title, chip=:chip, category=:category, excerpt=:excerpt,
                body=:body, author=:author, read_time=:read_time, image=:image
         WHERE id=:id"
    );
    $stmt->execute([
        ":title"     => $input["title"] ?? "",
        ":chip"      => $input["category"] ?? "",
        ":category"  => $input["category"] ?? "",
        ":excerpt"   => $input["excerpt"] ?? "",
        ":body"      => sanitize_blog_content($input["content"] ?? ""),
        ":author"    => $input["author"] ?? "",
        ":read_time" => $input["readTime"] ?? "",
        ":image"     => save_image($input["cover"] ?? "", $currentImage),
        ":id"        => $id,
    ]);
    $row = $pdo->query("SELECT * FROM posts WHERE id = $id")->fetch();
    out(["ok" => true, "post" => $row ? shape($row) : null]);
}

if ($action === "delete") {
    if ($id <= 0) out(["error" => "Invalid id"], 400);
    $pdo->prepare("DELETE FROM posts WHERE id = :id")->execute([":id" => $id]);
    out(["ok" => true, "id" => $id]);
}

if ($action === "toggle") {
    if ($id <= 0) out(["error" => "Invalid id"], 400);
    $pdo->prepare("UPDATE posts SET hidden = 1 - hidden WHERE id = :id")->execute([":id" => $id]);
    $row = $pdo->query("SELECT * FROM posts WHERE id = $id")->fetch();
    out(["ok" => true, "post" => $row ? shape($row) : null]);
}

out(["error" => "Unknown action"], 400);
