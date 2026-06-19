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

function out($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }

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

// Save a base64 data-URL image to /image/blog/uploads/ and return its web path.
// If $image is already a plain path (existing cover, unchanged), return as-is.
function save_image($image) {
    if (!$image) return "";
    if (strpos($image, "data:image/") !== 0) return $image; // already a path
    if (!preg_match('/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/', $image, $m)) return "";
    $ext  = $m[1] === "jpeg" ? "jpg" : $m[1];
    $data = base64_decode($m[2]);
    if ($data === false) return "";
    $dir = __DIR__ . "/image/blog/uploads";
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $name = "post_" . time() . "_" . bin2hex(random_bytes(4)) . "." . $ext;
    file_put_contents("$dir/$name", $data);
    return "image/blog/uploads/$name"; // relative path the site can serve
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
        ":body"      => $input["content"] ?? "",
        ":author"    => $input["author"] ?? "",
        ":read_time" => $input["readTime"] ?? "",
        ":image"     => save_image($input["cover"] ?? ""),
    ]);
    $newId = (int) $pdo->lastInsertId();
    $row = $pdo->query("SELECT * FROM posts WHERE id = $newId")->fetch();
    out(["ok" => true, "post" => shape($row)]);
}

if ($action === "update") {
    if ($id <= 0) out(["error" => "Invalid id"], 400);
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
        ":body"      => $input["content"] ?? "",
        ":author"    => $input["author"] ?? "",
        ":read_time" => $input["readTime"] ?? "",
        ":image"     => save_image($input["cover"] ?? ""),
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
