<?php
/**
 * api_guard.php — shared gate for the JSON APIs the Next.js dashboard calls
 * (posts_api.php, categories_api.php, get_inquiries.php, update_status.php).
 *
 * Rejects any request that does not present the correct X-Admin-Key header.
 * Without it those endpoints are wide open: anyone who knows the URL could read
 * every customer inquiry (name, phone, email) or create/delete blog posts. CORS
 * does NOT protect them — it only restrains browsers, not curl/scripts.
 *
 * Standalone by design (no DB connection) so the mysqli endpoints can include it
 * cheaply. The key comes from the ADMIN_API_KEY env var in production (set it in
 * Railway) and falls back to a local default; keep it identical to
 * NEXT_PUBLIC_ADMIN_KEY in the dashboard.
 *
 * Usage — call require_api_key() AFTER emitting CORS headers and handling the
 * OPTIONS preflight (the browser preflight carries no custom headers):
 *
 *     send_cors_headers();               // or the inline CORS block
 *     require __DIR__ . '/api_guard.php';
 *     require_api_key();
 *
 * This is an app-level key, not per-user login — pair it with real owner
 * authentication before hosting the dashboard publicly.
 */

require_once __DIR__ . '/auth_lib.php';

if (!defined('ADMIN_API_KEY')) {
    define('ADMIN_API_KEY', getenv('ADMIN_API_KEY') ?: 'ab115070f8ba8769435ffa8eb99a7b1cb0d4cc8a4c47fe55');
}

// Authorize the request if it carries EITHER a valid login token (real per-owner
// auth, issued by auth_api.php) OR the shared admin key (fallback for scripts and
// server-to-server use). The dashboard sends both; browsers use the login token.
function require_api_key(): void {
    if (verify_token(bearer_token()) !== null) return;
    $provided = $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
    if (ADMIN_API_KEY !== '' && is_string($provided) && hash_equals(ADMIN_API_KEY, $provided)) return;

    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
