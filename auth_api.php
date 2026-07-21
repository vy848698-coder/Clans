<?php
/**
 * auth_api.php — server-side login for the Next.js dashboard, backed by bcrypt
 * password hashes in the `admin_users` table. Replaces the old client-side
 * localStorage auth. Issues a stateless bearer token (see auth_lib.php) that the
 * dashboard then sends on every API call.
 *
 * Actions:
 *   POST auth_api.php?action=login            {email,password}            → {ok, token, user}
 *   GET  auth_api.php?action=me               (Bearer token)              → {ok, user}
 *   POST auth_api.php?action=change_password  {currentPassword,newPassword}
 *   POST auth_api.php?action=update_profile   {name,email}                → {ok, user, token}
 *   GET  auth_api.php?action=list_users       (Bearer token)             → {ok, users:[...]}
 *   POST auth_api.php?action=add_user         {email,password,name?}
 *   POST auth_api.php?action=remove_user      {email}
 */

require __DIR__ . '/db.php';        // $pdo + send_cors_headers()
require __DIR__ . '/auth_lib.php';  // token helpers

send_cors_headers();                // handles CORS + OPTIONS preflight

function out($data, $code = 200) { http_response_code($code); echo json_encode($data); exit; }

// Require a valid bearer token; returns the fresh DB row for the token's user.
function require_user(PDO $pdo): array {
    $payload = verify_token(bearer_token());
    if (!$payload) out(["error" => "Unauthorized"], 401);
    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE email = :email");
    $stmt->execute([":email" => $payload["email"]]);
    $user = $stmt->fetch();
    if (!$user) out(["error" => "Unauthorized"], 401);
    return $user;
}

function public_user(array $row): array {
    return ["name" => $row["name"], "email" => $row["email"]];
}

$action = $_GET["action"] ?? "";
$input  = json_decode(file_get_contents("php://input"), true) ?: [];

// --- login ------------------------------------------------------------------
if ($action === "login") {
    $email = strtolower(trim($input["email"] ?? ""));
    $password = (string)($input["password"] ?? "");
    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE LOWER(email) = :email");
    $stmt->execute([":email" => $email]);
    $user = $stmt->fetch();
    // Constant-ish path: always run a verify to reduce user-enumeration timing.
    $hash = $user["password_hash"] ?? '$2y$10$............................................';
    if (!password_verify($password, $hash) || !$user) {
        out(["error" => "Invalid email or password."], 401);
    }
    out(["ok" => true, "token" => make_token($user["email"], $user["name"]), "user" => public_user($user)]);
}

// --- me ---------------------------------------------------------------------
if ($action === "me") {
    $user = require_user($pdo);
    out(["ok" => true, "user" => public_user($user)]);
}

// --- change_password --------------------------------------------------------
if ($action === "change_password") {
    $user = require_user($pdo);
    $current = (string)($input["currentPassword"] ?? "");
    $next = (string)($input["newPassword"] ?? "");
    if (!password_verify($current, $user["password_hash"])) {
        out(["error" => "Current password is incorrect."], 400);
    }
    if (strlen($next) < 4) out(["error" => "New password must be at least 4 characters."], 400);
    if (password_verify($next, $user["password_hash"])) {
        out(["error" => "New password must be different from the current one."], 400);
    }
    $stmt = $pdo->prepare("UPDATE admin_users SET password_hash = :h WHERE id = :id");
    $stmt->execute([":h" => password_hash($next, PASSWORD_DEFAULT), ":id" => $user["id"]]);
    out(["ok" => true]);
}

// --- update_profile ---------------------------------------------------------
if ($action === "update_profile") {
    $user = require_user($pdo);
    $name = trim($input["name"] ?? "");
    $email = strtolower(trim($input["email"] ?? ""));
    if ($name === "") out(["error" => "Name is required."], 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(["error" => "Enter a valid email."], 400);

    $chk = $pdo->prepare("SELECT COUNT(*) FROM admin_users WHERE LOWER(email) = :email AND id <> :id");
    $chk->execute([":email" => $email, ":id" => $user["id"]]);
    if ($chk->fetchColumn() > 0) out(["error" => "Another owner already uses that email."], 409);

    $stmt = $pdo->prepare("UPDATE admin_users SET name = :name, email = :email WHERE id = :id");
    $stmt->execute([":name" => $name, ":email" => $email, ":id" => $user["id"]]);
    // Email/name may have changed → re-issue the token so it stays valid.
    out(["ok" => true, "user" => ["name" => $name, "email" => $email], "token" => make_token($email, $name)]);
}

// --- list_users -------------------------------------------------------------
if ($action === "list_users") {
    require_user($pdo);
    $rows = $pdo->query("SELECT id, name, email FROM admin_users ORDER BY id")->fetchAll();
    $primaryId = $rows[0]["id"] ?? null;
    $users = array_map(fn($r) => [
        "name" => $r["name"], "email" => $r["email"], "primary" => ((int)$r["id"] === (int)$primaryId),
    ], $rows);
    out(["ok" => true, "users" => $users]);
}

// --- add_user ---------------------------------------------------------------
if ($action === "add_user") {
    require_user($pdo);
    $email = strtolower(trim($input["email"] ?? ""));
    $password = (string)($input["password"] ?? "");
    $name = trim($input["name"] ?? "") ?: explode("@", $email)[0];
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(["error" => "Enter a valid email."], 400);
    if (strlen($password) < 4) out(["error" => "Password must be at least 4 characters."], 400);

    $chk = $pdo->prepare("SELECT COUNT(*) FROM admin_users WHERE LOWER(email) = :email");
    $chk->execute([":email" => $email]);
    if ($chk->fetchColumn() > 0) out(["error" => "An owner with this email already exists."], 409);

    $stmt = $pdo->prepare("INSERT INTO admin_users (name, email, password_hash) VALUES (:name, :email, :h)");
    $stmt->execute([":name" => $name, ":email" => $email, ":h" => password_hash($password, PASSWORD_DEFAULT)]);
    out(["ok" => true, "user" => ["name" => $name, "email" => $email]]);
}

// --- remove_user ------------------------------------------------------------
if ($action === "remove_user") {
    require_user($pdo);
    $email = strtolower(trim($input["email"] ?? ""));
    $rows = $pdo->query("SELECT id, email FROM admin_users ORDER BY id")->fetchAll();
    if (count($rows) <= 1) out(["error" => "At least one owner is required."], 409);
    if (strtolower($rows[0]["email"]) === $email) {
        out(["error" => "The primary owner cannot be removed."], 409);
    }
    $stmt = $pdo->prepare("DELETE FROM admin_users WHERE LOWER(email) = :email");
    $stmt->execute([":email" => $email]);
    out(["ok" => true, "removed" => $stmt->rowCount()]);
}

out(["error" => "Unknown action"], 400);
