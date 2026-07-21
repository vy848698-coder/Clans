<?php
/**
 * categories_api.php — CRUD API for blog categories, used by the admin dashboard.
 *
 * The public website (blog.php) reads categories via get_categories() in db.php.
 * This endpoint lets the Next.js dashboard LIST / ADD / REMOVE them, so both the
 * dashboard's category dropdown and the public "Browse by Category" sidebar stay
 * in sync from one MySQL `categories` table.
 *
 * Actions:
 *   GET  categories_api.php                  → list all categories
 *   POST categories_api.php?action=add       → body: { "name": "..." }
 *   POST categories_api.php?action=remove     → body: { "name": "..." }  (or ?slug=)
 */

require __DIR__ . '/db.php';

// CORS for the admin dashboard (origin configurable via DASHBOARD_ORIGIN env).
send_cors_headers();

// Require the shared admin key on every real request (see api_guard.php).
require __DIR__ . '/api_guard.php';
require_api_key();

function out($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }

// Turn a display name into a URL-friendly slug, e.g. "Subsidy & Finance" → "subsidy-finance".
function slugify($name) {
    $s = strtolower(trim($name));
    $s = preg_replace('/&/', ' and ', $s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-');
}

// --- LIST (GET) -------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $rows = $pdo->query("SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order, name")->fetchAll();
    out($rows);
}

// --- Mutations (POST) -------------------------------------------------------
$action = $_GET["action"] ?? "";
$input  = json_decode(file_get_contents("php://input"), true) ?: [];

if ($action === "add") {
    $name = trim($input["name"] ?? "");
    if ($name === "") out(["error" => "Category name is required."], 400);
    $slug = slugify($name);
    if ($slug === "") out(["error" => "Invalid category name."], 400);

    // Reject duplicates by name or slug.
    $chk = $pdo->prepare("SELECT COUNT(*) FROM categories WHERE LOWER(name) = LOWER(:name) OR slug = :slug");
    $chk->execute([":name" => $name, ":slug" => $slug]);
    if ($chk->fetchColumn() > 0) out(["error" => "That category already exists."], 409);

    // Put new categories at the end.
    $next = (int) $pdo->query("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories")->fetchColumn();
    $stmt = $pdo->prepare("INSERT INTO categories (name, slug, sort_order) VALUES (:name, :slug, :sort)");
    $stmt->execute([":name" => $name, ":slug" => $slug, ":sort" => $next]);

    out(["ok" => true, "category" => [
        "id" => (int) $pdo->lastInsertId(), "name" => $name, "slug" => $slug, "sort_order" => $next,
    ]]);
}

if ($action === "remove") {
    $name = trim($input["name"] ?? "");
    $slug = trim($_GET["slug"] ?? ($input["slug"] ?? ""));

    if ($pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn() <= 1) {
        out(["error" => "At least one category is required."], 409);
    }

    if ($slug !== "") {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE slug = :slug");
        $stmt->execute([":slug" => $slug]);
    } elseif ($name !== "") {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE LOWER(name) = LOWER(:name)");
        $stmt->execute([":name" => $name]);
    } else {
        out(["error" => "Category name or slug is required."], 400);
    }
    out(["ok" => true, "removed" => $stmt->rowCount()]);
}

out(["error" => "Unknown action"], 400);
