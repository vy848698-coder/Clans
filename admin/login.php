<?php
// Harden session cookie before starting the session.
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    // 'secure' => true,  // enable this once you serve the site over HTTPS
]);
session_start();
require __DIR__ . '/../db.php';

// ---- Brute-force rate limiting (per session) ----
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 300; // 5 minutes

$_SESSION['attempts']  = $_SESSION['attempts']  ?? 0;
$_SESSION['lock_until'] = $_SESSION['lock_until'] ?? 0;

$now     = time();
$locked  = $now < $_SESSION['lock_until'];
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($locked) {
        $error = 'Too many attempts. Try again in ' . ceil(($_SESSION['lock_until'] - $now) / 60) . ' min.';
    } else {
        $u = $_POST['username'] ?? '';
        $p = $_POST['password'] ?? '';

        $userOk = hash_equals(ADMIN_USER, $u);
        $passOk = password_verify($p, ADMIN_PASS_HASH);

        if ($userOk && $passOk) {
            // Success: reset counters, regenerate session ID to prevent fixation.
            $_SESSION['attempts']   = 0;
            $_SESSION['lock_until'] = 0;
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            header('Location: index.php');
            exit;
        }

        // Failure
        $_SESSION['attempts']++;
        if ($_SESSION['attempts'] >= MAX_ATTEMPTS) {
            $_SESSION['lock_until'] = $now + LOCK_SECONDS;
            $_SESSION['attempts']   = 0;
            $error = 'Too many failed attempts. Locked for 5 minutes.';
        } else {
            $remaining = MAX_ATTEMPTS - $_SESSION['attempts'];
            $error = "Invalid username or password. $remaining attempt(s) left.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0;
           display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
    form { background:#1e293b; padding:2rem; border-radius:12px; width:320px; }
    h1 { margin:0 0 1.5rem; font-size:1.4rem; }
    label { display:block; margin:.75rem 0 .25rem; font-size:.85rem; }
    input { width:100%; padding:.6rem; border-radius:8px; border:1px solid #334155;
            background:#0f172a; color:#e2e8f0; box-sizing:border-box; }
    button { width:100%; margin-top:1.25rem; padding:.7rem; border:0; border-radius:8px;
             background:#22d3ee; color:#0f172a; font-weight:600; cursor:pointer; }
    button:disabled { opacity:.5; cursor:not-allowed; }
    .err { background:#7f1d1d; padding:.6rem; border-radius:8px; margin-bottom:1rem; font-size:.85rem; }
  </style>
</head>
<body>
  <form method="post">
    <h1>Admin Login</h1>
    <?php if ($error): ?><div class="err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <label>Username</label>
    <input type="text" name="username" required autofocus <?= $locked ? 'disabled' : '' ?>>
    <label>Password</label>
    <input type="password" name="password" required <?= $locked ? 'disabled' : '' ?>>
    <button type="submit" <?= $locked ? 'disabled' : '' ?>>Log In</button>
  </form>
</body>
</html>
