<?php
/**
 * auth_lib.php — stateless bearer-token helpers for the dashboard's server-side
 * login. A token is `base64url(payload).base64url(HMAC-SHA256(payload))`, signed
 * with ADMIN_TOKEN_SECRET. No sessions table needed: verification just recomputes
 * the HMAC and checks the expiry. Included by auth_api.php and api_guard.php.
 *
 * Set ADMIN_TOKEN_SECRET (and rotate it to log everyone out) via env in production.
 */

if (!defined('ADMIN_TOKEN_SECRET')) {
    define('ADMIN_TOKEN_SECRET', getenv('ADMIN_TOKEN_SECRET') ?: 'change-me-3f9c1a7d6b2e4808bc51a09f77e6d214');
}
if (!defined('ADMIN_TOKEN_TTL')) {
    define('ADMIN_TOKEN_TTL', 60 * 60 * 12); // 12 hours
}

function b64url_encode(string $bin): string {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}
function b64url_decode(string $s): string {
    return base64_decode(strtr($s, '-_', '+/'));
}

// Issue a signed token for a logged-in owner.
function make_token(string $email, string $name): string {
    $payload = json_encode([
        'email' => $email,
        'name'  => $name,
        'exp'   => time() + ADMIN_TOKEN_TTL,
    ]);
    $p = b64url_encode($payload);
    $sig = b64url_encode(hash_hmac('sha256', $p, ADMIN_TOKEN_SECRET, true));
    return "$p.$sig";
}

// Verify a token; returns the payload array on success, or null if invalid/expired.
function verify_token(?string $token): ?array {
    if (!$token || substr_count($token, '.') !== 1) return null;
    [$p, $sig] = explode('.', $token, 2);
    $expected = b64url_encode(hash_hmac('sha256', $p, ADMIN_TOKEN_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

// Pull the bearer token from the Authorization header (if any).
function bearer_token(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (stripos($h, 'Bearer ') === 0) return trim(substr($h, 7));
    return null;
}
