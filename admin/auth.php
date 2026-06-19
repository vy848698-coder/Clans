<?php
// Shared admin gatekeeper + secure session. Include at the top of every admin page.
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    // 'secure' => true,  // enable once on HTTPS
]);
session_start();
require __DIR__ . '/../db.php';

if (empty($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

// Build "AM" style initials from an author name.
function initials($name) {
    $parts = preg_split('/\s+/', trim($name));
    $ini = '';
    foreach ($parts as $p) {
        if ($p !== '') $ini .= mb_strtoupper(mb_substr($p, 0, 1));
        if (mb_strlen($ini) >= 2) break;
    }
    return $ini ?: 'CM';
}
