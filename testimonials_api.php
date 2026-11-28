<?php
/**
 * testimonials_api.php — every customer/partner review on the public site,
 * managed by the owner from the Next.js admin dashboard.
 *
 * Each review belongs to one "placement" (a review section on one page). The
 * same person can appear on several pages with different wording or role, so
 * each placement keeps its own rows; the dashboard can create one review on
 * several placements at once.
 *
 * Actions:
 *   GET  ?action=public[&placement=a,b]        → visible reviews (NO auth; used by the website)
 *   GET  (no action)                           → all reviews incl. hidden + placement list (admin)
 *   POST ?action=create                        → body = review + placements:[...]  (admin)
 *   POST ?action=update&id=#                   → body = review (+ placement to move it) (admin)
 *   POST ?action=delete&id=#                   (admin)
 *   POST ?action=toggle&id=#                   → flip hidden (admin)
 *   POST ?action=move&id=#&dir=up|down         → reorder within its placement (admin)
 *
 * Review shape: { id, placement, name, role, message, rating: 0-5 (0 = no stars),
 *                 photo, featured, hidden, date }
 * Photos are stored INLINE as a data URL (survives redeploys on an ephemeral
 * disk); the original site photos are stored as site-relative paths.
 *
 * The table is created on first use and each placement is filled ONCE from
 * testimonials_seed.php (the reviews that used to be hard-coded in the pages).
 * A table made by the earlier testimonials-page-only version is upgraded in place.
 */

require __DIR__ . '/db.php';
send_cors_headers();

header('Content-Type: application/json; charset=utf-8');

function out($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }

// placement key => [page, section label, card style, page path]. The website's
// grids name these keys in data-reviews="..."; the dashboard shows the labels.
const PLACEMENTS = [
    'home'                   => ['Homepage', 'Customer Stories', 'testi', 'index.html#testimonials'],
    'testimonials-customers' => ['Testimonials page', 'What Our Customers Say', 'quote', 'testimonials.html'],
    'testimonials-business'  => ['Testimonials page', 'Trusted by Businesses', 'quote', 'testimonials.html'],
    'offering-home'          => ['Home Solar page', 'Customers Recommend Us', 'testi', 'our-offering/home.html'],
    'offering-commercial'    => ['Commercial page', 'Delighted Customers', 'testi', 'our-offering/commercial.html'],
    'offering-housing'       => ['Housing Society page', 'Managing Committees', 'testi', 'our-offering/housing-society.html'],
    'partnership'            => ['Partnership page', 'Business Partners', 'testi', 'partnership.html'],
];

function column_exists(PDO $pdo, string $col): bool {
    $s = $pdo->prepare("SHOW COLUMNS FROM testimonials LIKE ?");
    $s->execute([$col]);
    return (bool)$s->fetch();
}

function ensure_testimonials_table(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS testimonials (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        placement   VARCHAR(40)   NOT NULL DEFAULT 'testimonials-customers',
        name        VARCHAR(120)  NOT NULL,
        role        VARCHAR(160)  NOT NULL DEFAULT '',
        message     TEXT          NOT NULL,
        type        VARCHAR(20)   NOT NULL DEFAULT 'customer',
        rating      TINYINT       NOT NULL DEFAULT 5,
        photo       MEDIUMTEXT    NULL,
        featured    TINYINT(1)    NOT NULL DEFAULT 0,
        hidden      TINYINT(1)    NOT NULL DEFAULT 0,
        sort_order  INT           NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_placement (placement, hidden, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS testimonials_seeded (
        placement VARCHAR(40) PRIMARY KEY
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Fast path: already upgraded and every placement seeded (every request after the first).
    $needs_upgrade = !column_exists($pdo, 'placement');
    if (!$needs_upgrade) {
        $done = $pdo->query("SELECT placement FROM testimonials_seeded")->fetchAll(PDO::FETCH_COLUMN);
        if (!array_diff(array_keys(PLACEMENTS), $done)) return;
    }

    // One request at a time from here: right after a deploy several visitors can
    // hit this at once, and without the lock each would run the ALTER (the second
    // one fails) and insert the seed rows (duplicating every review).
    $pdo->query("SELECT GET_LOCK('clans_testimonials_setup', 15)")->fetchColumn();
    try {
        testimonials_upgrade_and_seed($pdo);
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('clans_testimonials_setup')")->fetchColumn();
    }
}

// Runs under the setup lock; re-checks everything, since another request may
// have finished the work while this one waited.
function testimonials_upgrade_and_seed(PDO $pdo): void {
    // Upgrade a table from the testimonials-page-only version (type = customer|business).
    if (!column_exists($pdo, 'placement')) {
        $pdo->exec("ALTER TABLE testimonials
            ADD COLUMN placement VARCHAR(40) NOT NULL DEFAULT 'testimonials-customers' AFTER id,
            ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0 AFTER photo,
            ADD KEY idx_placement (placement, hidden, sort_order)");
        $pdo->exec("UPDATE testimonials SET placement = 'testimonials-business' WHERE type = 'business'");
    }

    // Fill each placement from the seed exactly once, so a section the owner has
    // emptied on purpose never comes back.
    $done = $pdo->query("SELECT placement FROM testimonials_seeded")->fetchAll(PDO::FETCH_COLUMN);
    $todo = array_diff(array_keys(PLACEMENTS), $done);
    if (!$todo) return;

    $seed = require __DIR__ . '/testimonials_seed.php';
    $count = $pdo->prepare("SELECT COUNT(*) FROM testimonials WHERE placement = ?");
    $ins = $pdo->prepare("INSERT INTO testimonials
        (placement, name, role, message, type, rating, photo, featured, hidden, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $mark = $pdo->prepare("INSERT IGNORE INTO testimonials_seeded (placement) VALUES (?)");
    $pdo->beginTransaction();
    foreach ($todo as $p) {
        $count->execute([$p]);
        if ((int)$count->fetchColumn() === 0) {   // rows already there (upgraded table) → keep them
            $order = 0;
            foreach ($seed as $r) {
                if ($r['placement'] !== $p) continue;
                $ins->execute([$p, $r['name'], $r['role'], $r['message'], type_for($p), $r['rating'],
                               $r['photo'], $r['featured'], $r['hidden'], ++$order]);
            }
        }
        $mark->execute([$p]);
    }
    $pdo->commit();
}

// Legacy column kept in sync for anything still reading `type`.
function type_for(string $placement): string {
    return $placement === 'testimonials-business' ? 'business' : 'customer';
}

function shape_testimonial(array $r, bool $admin): array {
    $t = [
        "id"        => (int)$r["id"],
        "placement" => $r["placement"],
        "name"      => $r["name"],
        "role"      => $r["role"],
        "message"   => $r["message"],
        "rating"    => (int)$r["rating"],
        "photo"     => (string)($r["photo"] ?? ""),
        "featured"  => (bool)$r["featured"],
    ];
    if ($admin) {
        $t["hidden"] = (bool)$r["hidden"];
        $t["date"]   = date("M j, Y", strtotime($r["created_at"]));
    }
    return $t;
}

function placement_list(): array {
    $list = [];
    foreach (PLACEMENTS as $key => [$page, $section, $style, $path]) {
        $list[] = ["key" => $key, "page" => $page, "section" => $section, "style" => $style, "path" => $path];
    }
    return $list;
}

function valid_placement($p): bool {
    return is_string($p) && array_key_exists($p, PLACEMENTS);
}

// Accept a photo from the dashboard and return what to store:
//   data:image/... → re-encoded via GD (strips anything that isn't an image)
//   http(s) URL    → kept as-is
//   local path     → kept only if the file exists on this server
//   "" + $clear    → removed;  "" otherwise → keep existing
function save_testimonial_photo($photo, string $existing, bool $clear) {
    $photo = trim((string)$photo);
    if ($photo === "") return $clear ? "" : $existing;
    if ($photo === $existing) return $existing;

    if (strpos($photo, "data:image/") === 0) {
        if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#s', $photo, $m)) return $existing;
        if (strlen($photo) > 4 * 1024 * 1024) return $existing;
        $bytes = base64_decode($m[2], true);
        if ($bytes === false) return $existing;
        $tmp = tempnam(sys_get_temp_dir(), 'tst');
        if ($tmp && file_put_contents($tmp, $bytes) !== false) {
            $err = null;
            $url = make_cover_data_url($tmp, 'image/' . ($m[1] === 'jpg' ? 'jpeg' : $m[1]), $err);
            @unlink($tmp);
            if ($url !== null) return $url;
        }
        return $existing;
    }
    if (preg_match('#^https?://#i', $photo)) return $photo;

    $rel = ltrim(str_replace('\\', '/', $photo), '/');
    if ($rel !== "" && strpos($rel, '..') === false && is_file(__DIR__ . '/' . $rel)) return $rel;
    return $existing;
}

// Validate + normalise the editable fields from the request body.
function read_testimonial_input(array $in): array {
    $name    = trim((string)($in["name"] ?? ""));
    $message = trim((string)($in["message"] ?? ""));
    $role    = trim((string)($in["role"] ?? ""));
    $rating  = max(0, min(5, (int)($in["rating"] ?? 5)));
    $featured = !empty($in["featured"]) ? 1 : 0;

    if ($name === "")    out(["error" => "Name is required."], 400);
    if ($message === "") out(["error" => "Review text is required."], 400);
    if (mb_strlen($name) > 120)     out(["error" => "Name is too long (max 120 characters)."], 400);
    if (mb_strlen($role) > 160)     out(["error" => "Role is too long (max 160 characters)."], 400);
    if (mb_strlen($message) > 3000) out(["error" => "Review is too long (max 3000 characters)."], 400);

    return compact("name", "role", "message", "rating", "featured");
}

function fetch_testimonial(PDO $pdo, int $id) {
    $stmt = $pdo->prepare("SELECT * FROM testimonials WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

// sort_order that puts a row at the top of a placement.
function top_order(PDO $pdo, string $placement): int {
    $stmt = $pdo->prepare("SELECT COALESCE(MIN(sort_order), 1) - 1 FROM testimonials WHERE placement = ?");
    $stmt->execute([$placement]);
    return (int)$stmt->fetchColumn();
}

ensure_testimonials_table($pdo);

$action = $_GET["action"] ?? "";
$id     = (int)($_GET["id"] ?? 0);

// --- PUBLIC list (website) — no auth, visible only ---------------------------
if ($_SERVER["REQUEST_METHOD"] === "GET" && $action === "public") {
    header('Cache-Control: no-cache');
    $wanted = array_values(array_filter(
        array_map('trim', explode(',', (string)($_GET["placement"] ?? ""))),
        'valid_placement'
    ));
    if ($wanted) {
        $in = implode(',', array_fill(0, count($wanted), '?'));
        $stmt = $pdo->prepare("SELECT * FROM testimonials WHERE hidden = 0 AND placement IN ($in)
                               ORDER BY sort_order ASC, id ASC");
        $stmt->execute($wanted);
        $rows = $stmt->fetchAll();
    } else {
        $rows = $pdo->query("SELECT * FROM testimonials WHERE hidden = 0 ORDER BY sort_order ASC, id ASC")->fetchAll();
    }
    out(array_map(fn($r) => shape_testimonial($r, false), $rows));
}

// --- Everything below is admin-only ------------------------------------------
require __DIR__ . '/api_guard.php';
require_api_key();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $rows = $pdo->query("SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC")->fetchAll();
    out([
        "placements"   => placement_list(),
        "testimonials" => array_map(fn($r) => shape_testimonial($r, true), $rows),
    ]);
}

$raw = file_get_contents("php://input");
$input = json_decode($raw, true);
if (!is_array($input)) {
    if (trim((string)$raw) !== "") out(["error" => "Invalid request (the data couldn't be read)."], 400);
    $input = [];
}

if ($action === "create") {
    $f = read_testimonial_input($input);
    $placements = $input["placements"] ?? (isset($input["placement"]) ? [$input["placement"]] : []);
    $placements = array_values(array_unique(array_filter((array)$placements, 'valid_placement')));
    if (!$placements) out(["error" => "Choose at least one page to show this review on."], 400);

    // Process the photo once and reuse it for every placement.
    $photo = save_testimonial_photo($input["photo"] ?? "", "", true);
    $hidden = !empty($input["hidden"]) ? 1 : 0;
    $ins = $pdo->prepare("INSERT INTO testimonials
        (placement, name, role, message, type, rating, photo, featured, hidden, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $created = [];
    $pdo->beginTransaction();
    foreach ($placements as $p) {   // new reviews go to the top of each section
        $ins->execute([$p, $f["name"], $f["role"], $f["message"], type_for($p), $f["rating"],
                       $photo, $f["featured"], $hidden, top_order($pdo, $p)]);
        $created[] = (int)$pdo->lastInsertId();
    }
    $pdo->commit();
    out(["ok" => true, "testimonials" => array_map(
        fn($newId) => shape_testimonial(fetch_testimonial($pdo, $newId), true), $created)]);
}

if ($action === "update") {
    $row = $id > 0 ? fetch_testimonial($pdo, $id) : false;
    if (!$row) out(["error" => "Review not found."], 404);
    $f = read_testimonial_input($input);
    $placement = valid_placement($input["placement"] ?? null) ? $input["placement"] : $row["placement"];
    $order = $placement === $row["placement"] ? (int)$row["sort_order"] : top_order($pdo, $placement);
    $photo = save_testimonial_photo($input["photo"] ?? "", (string)($row["photo"] ?? ""), !empty($input["removePhoto"]));
    $pdo->prepare("UPDATE testimonials SET placement=?, name=?, role=?, message=?, type=?, rating=?, photo=?,
                   featured=?, sort_order=? WHERE id=?")
        ->execute([$placement, $f["name"], $f["role"], $f["message"], type_for($placement), $f["rating"],
                   $photo, $f["featured"], $order, $id]);
    out(["ok" => true, "testimonial" => shape_testimonial(fetch_testimonial($pdo, $id), true)]);
}

if ($action === "delete") {
    if ($id <= 0) out(["error" => "Invalid id"], 400);
    $pdo->prepare("DELETE FROM testimonials WHERE id = ?")->execute([$id]);
    out(["ok" => true, "id" => $id]);
}

if ($action === "toggle") {
    if ($id <= 0) out(["error" => "Invalid id"], 400);
    $pdo->prepare("UPDATE testimonials SET hidden = 1 - hidden WHERE id = ?")->execute([$id]);
    $row = fetch_testimonial($pdo, $id);
    out(["ok" => true, "testimonial" => $row ? shape_testimonial($row, true) : null]);
}

if ($action === "move") {
    $row = $id > 0 ? fetch_testimonial($pdo, $id) : false;
    if (!$row) out(["error" => "Review not found."], 404);
    $up = ($_GET["dir"] ?? "") === "up";
    // Renumber the placement 1..n in its current order, then swap with the neighbour.
    $stmt = $pdo->prepare("SELECT id FROM testimonials WHERE placement = ? ORDER BY sort_order ASC, id ASC");
    $stmt->execute([$row["placement"]]);
    $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    $pos = array_search($id, $ids, true);
    $swap = $up ? $pos - 1 : $pos + 1;
    if ($pos !== false && $swap >= 0 && $swap < count($ids)) {
        [$ids[$pos], $ids[$swap]] = [$ids[$swap], $ids[$pos]];
    }
    $pdo->beginTransaction();
    $upd = $pdo->prepare("UPDATE testimonials SET sort_order = ? WHERE id = ?");
    foreach ($ids as $i => $tid) $upd->execute([$i + 1, $tid]);
    $pdo->commit();
    out(["ok" => true]);
}

out(["error" => "Unknown action"], 400);
