<?php
/**
 * testimonials_api.php — testimonials shown on the public testimonials.html page,
 * managed by the owner from the Next.js admin dashboard.
 *
 * Actions:
 *   GET  testimonials_api.php?action=public        → visible testimonials (NO auth; used by the website)
 *   GET  testimonials_api.php                      → all testimonials incl. hidden (admin)
 *   POST testimonials_api.php?action=create        → create, body = testimonial JSON (admin)
 *   POST testimonials_api.php?action=update&id=#   → update (admin)
 *   POST testimonials_api.php?action=delete&id=#   → delete (admin)
 *   POST testimonials_api.php?action=toggle&id=#   → flip hidden on/off (admin)
 *   POST testimonials_api.php?action=move&id=#&dir=up|down → reorder within its section (admin)
 *
 * Testimonial shape: { id, name, role, message, type: "customer"|"business",
 *                      rating: 0-5 (0 = no stars), photo, hidden, date }
 * Photos are stored INLINE as a data URL (like blog covers) so they survive
 * redeploys on hosts with an ephemeral disk; existing site images are stored as
 * relative paths (e.g. "image/customer Photo/1.webp").
 *
 * The table is created (and seeded with the testimonials that used to be
 * hard-coded in testimonials.html) on first use.
 */

require __DIR__ . '/db.php';
send_cors_headers();

header('Content-Type: application/json; charset=utf-8');

function out($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }

const TESTIMONIAL_TYPES = ['customer', 'business'];

function ensure_testimonials_table(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS testimonials (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(120)  NOT NULL,
        role        VARCHAR(160)  NOT NULL DEFAULT '',
        message     TEXT          NOT NULL,
        type        VARCHAR(20)   NOT NULL DEFAULT 'customer',
        rating      TINYINT       NOT NULL DEFAULT 5,
        photo       MEDIUMTEXT    NULL,
        hidden      TINYINT(1)    NOT NULL DEFAULT 0,
        sort_order  INT           NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    if ((int)$pdo->query("SELECT COUNT(*) FROM testimonials")->fetchColumn() > 0) return;

    // First run: seed with the testimonials that were hard-coded in testimonials.html.
    $seed = [
        ['Rajesh Sahoo', 'Homeowner', 'customer', 0, 'image/customer Photo/1.webp',
         'Maine Clans Machina Solar se apne ghar me solar system install karwaya hai aur experience bahut hi accha raha. Team bahut professional thi aur installation bhi time par complete hua. Ab mera electricity bill pehle se kaafi kam aa raha hai. Highly recommended!'],
        ['Mohammed Arif Khan', 'Business Owner', 'customer', 0, 'image/customer Photo/2.webp',
         'Hamare office ke liye Clans Machina Solar ne rooftop solar install kiya. Installation quality bahut achhi hai aur ab monthly electricity cost me kaafi savings ho rahi hai. Team ka support bhi outstanding hai.'],
        ['Anil Patel', 'Business Owner', 'customer', 0, 'image/customer Photo/3.webp',
         'I am extremely satisfied with the service provided by Clans Machina Solar. From the initial consultation to the final installation, the entire process was smooth, professional, and transparent.'],
        ['Sasmita Behera', '3 kW Residential Install — Odisha', 'customer', 0, 'image/customer Photo/4.webp',
         'Clans Machina Solar ra service re mu bahut khusi. Installation bahut neat au professional way re hela. Ebe mora electricity bill bahut kama asuchi. Dhanyabad pura team ku.'],
        // The next five were published on the homepage (index.html) but not on testimonials.html.
        ['Imran Khan', 'Business Owner', 'customer', 0, 'image/customer Photo/5.webp',
         'Excellent service from start to finish! The installation was completed on time, and my electricity bill has reduced significantly. The team was professional and very supportive throughout the process. Highly recommended!'],
        ['Rajesh Khanna', 'Housing Society', 'customer', 0, 'image/customer Photo/6.webp',
         'Our housing society went solar with Clans Machina and the common-area bills have dropped dramatically. The team coordinated with the whole committee patiently and delivered exactly what they promised.'],
        ['Sushant Behera', 'Homeowner', 'customer', 0, 'image/customer Photo/7.webp',
         'Mu mora relatives recommendation re Clans Machina Solar choose karithili. Experience expected tharu bhi better hela. Quality au service dunita top class.'],
        ['Manoj Mishra', 'Homeowner', 'customer', 0, 'image/customer Photo/8.webp',
         'Initially mujhe solar lagwane ko lekar thoda doubt tha, lekin Clans Machina Solar ki team ne har cheez clearly explain ki. Installation smooth raha aur service bhi excellent hai. Main bahut satisfied hoon.'],
        // Hidden by default: the homepage pairs him with photo 1.webp, which is Rajesh Sahoo's.
        ['Abdul Rahman', 'Homeowner', 'customer', 0, '',
         'Choosing Clans Machina Solar was one of the best decisions for my home. The installation was completed on schedule, the team was courteous and professional, and the quality of work exceeded my expectations. I am already seeing noticeable savings on my electricity bills. Thank you for the excellent service and support.', 1],
        ['Iceberg', 'Management Team · Commercial Solar', 'business', 5, '',
         'We chose Clans Machina for our commercial solar installation because of their professionalism and technical expertise. From the initial site survey to the final commissioning, the entire process was well organized and completed on schedule. Our team is happy with the quality of the installation and the support provided throughout the project. We highly recommend Clans Machina for commercial solar solutions.'],
        ['Shree Ganesh Food', 'Management Team · Rooftop Solar', 'business', 5, '',
         'Working with Clans Machina was a smooth and hassle-free experience. Their engineers understood our energy requirements and delivered a reliable rooftop solar system with excellent workmanship. The installation was completed efficiently, and their after-sales support has been prompt and professional. We are satisfied with our decision to partner with Clans Machina.'],
        ['Greenmandap', 'Management Team · Commercial Solar', 'business', 5, '',
         'Clans Machina delivered exactly what they promised. Their team maintained clear communication throughout the project and ensured every aspect of the installation met high quality standards. The project was completed efficiently, and we appreciate their commitment to customer satisfaction. We confidently recommend Clans Machina for commercial solar projects.'],
    ];
    $stmt = $pdo->prepare("INSERT INTO testimonials (name, role, type, rating, photo, message, hidden, sort_order)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($seed as $i => $t) {
        $stmt->execute([$t[0], $t[1], $t[2], $t[3], $t[4], $t[5], $t[6] ?? 0, $i + 1]);
    }
}

function shape_testimonial(array $r, bool $admin): array {
    $t = [
        "id"      => (int)$r["id"],
        "name"    => $r["name"],
        "role"    => $r["role"],
        "message" => $r["message"],
        "type"    => $r["type"],
        "rating"  => (int)$r["rating"],
        "photo"   => (string)($r["photo"] ?? ""),
    ];
    if ($admin) {
        $t["hidden"] = (bool)$r["hidden"];
        $t["date"]   = date("M j, Y", strtotime($r["created_at"]));
    }
    return $t;
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
    $type    = in_array($in["type"] ?? "", TESTIMONIAL_TYPES, true) ? $in["type"] : "customer";
    $rating  = max(0, min(5, (int)($in["rating"] ?? 5)));

    if ($name === "")    out(["error" => "Name is required."], 400);
    if ($message === "") out(["error" => "Testimonial text is required."], 400);
    if (mb_strlen($name) > 120)     out(["error" => "Name is too long (max 120 characters)."], 400);
    if (mb_strlen($role) > 160)     out(["error" => "Role is too long (max 160 characters)."], 400);
    if (mb_strlen($message) > 3000) out(["error" => "Testimonial is too long (max 3000 characters)."], 400);

    return compact("name", "role", "message", "type", "rating");
}

function fetch_testimonial(PDO $pdo, int $id) {
    $stmt = $pdo->prepare("SELECT * FROM testimonials WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

ensure_testimonials_table($pdo);

$action = $_GET["action"] ?? "";
$id     = (int)($_GET["id"] ?? 0);

// --- PUBLIC list (website) — no auth, visible only ---------------------------
if ($_SERVER["REQUEST_METHOD"] === "GET" && $action === "public") {
    header('Cache-Control: no-cache');
    $rows = $pdo->query("SELECT * FROM testimonials WHERE hidden = 0 ORDER BY sort_order ASC, id ASC")->fetchAll();
    out(array_map(fn($r) => shape_testimonial($r, false), $rows));
}

// --- Everything below is admin-only ------------------------------------------
require __DIR__ . '/api_guard.php';
require_api_key();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $rows = $pdo->query("SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC")->fetchAll();
    out(array_map(fn($r) => shape_testimonial($r, true), $rows));
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];

if ($action === "create") {
    $f = read_testimonial_input($input);
    $photo = save_testimonial_photo($input["photo"] ?? "", "", true);
    // New testimonials go to the top of their section.
    $stmt = $pdo->prepare("SELECT COALESCE(MIN(sort_order), 1) - 1 FROM testimonials WHERE type = ?");
    $stmt->execute([$f["type"]]);
    $order = (int)$stmt->fetchColumn();
    $pdo->prepare("INSERT INTO testimonials (name, role, message, type, rating, photo, hidden, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        ->execute([$f["name"], $f["role"], $f["message"], $f["type"], $f["rating"], $photo,
                   !empty($input["hidden"]) ? 1 : 0, $order]);
    out(["ok" => true, "testimonial" => shape_testimonial(fetch_testimonial($pdo, (int)$pdo->lastInsertId()), true)]);
}

if ($action === "update") {
    $row = $id > 0 ? fetch_testimonial($pdo, $id) : false;
    if (!$row) out(["error" => "Testimonial not found."], 404);
    $f = read_testimonial_input($input);
    $photo = save_testimonial_photo($input["photo"] ?? "", (string)($row["photo"] ?? ""), !empty($input["removePhoto"]));
    $pdo->prepare("UPDATE testimonials SET name=?, role=?, message=?, type=?, rating=?, photo=? WHERE id=?")
        ->execute([$f["name"], $f["role"], $f["message"], $f["type"], $f["rating"], $photo, $id]);
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
    if (!$row) out(["error" => "Testimonial not found."], 404);
    $up = ($_GET["dir"] ?? "") === "up";
    // Renumber the section 1..n in its current order, then swap with the neighbour.
    $stmt = $pdo->prepare("SELECT id FROM testimonials WHERE type = ? ORDER BY sort_order ASC, id ASC");
    $stmt->execute([$row["type"]]);
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
