<?php
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    // 'secure' => true,  // enable once on HTTPS
]);
session_start();
require __DIR__ . '/../db.php';

// Gatekeeper
if (empty($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

$leads = $pdo->query('SELECT * FROM leads ORDER BY created_at DESC')->fetchAll();
$total = count($leads);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Leads — Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center;
             padding:1rem 1.5rem; background:#1e293b; }
    h1 { font-size:1.2rem; margin:0; }
    .count { color:#22d3ee; font-weight:600; }
    a.logout { color:#f87171; text-decoration:none; font-size:.9rem; }
    .wrap { padding:1.5rem; overflow-x:auto; }
    table { width:100%; border-collapse:collapse; min-width:900px; }
    th, td { padding:.6rem .75rem; text-align:left; border-bottom:1px solid #334155;
             font-size:.85rem; vertical-align:top; }
    th { background:#1e293b; position:sticky; top:0; }
    tr:hover td { background:#1e293b55; }
    .empty { padding:3rem; text-align:center; color:#64748b; }
    a.tel, a.mail { color:#22d3ee; text-decoration:none; }
  </style>
</head>
<body>
  <header>
    <h1>Contact Leads <span class="count">(<?= $total ?>)</span></h1>
    <div>
      <a href="blogs.php" style="color:#22d3ee; text-decoration:none; margin-right:1rem;">Manage Blogs</a>
      <a href="categories.php" style="color:#22d3ee; text-decoration:none; margin-right:1rem;">Categories</a>
      <a class="logout" href="logout.php">Log out</a>
    </div>
  </header>
  <div class="wrap">
    <?php if ($total === 0): ?>
      <div class="empty">No submissions yet.</div>
    <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Date</th><th>Name</th><th>Phone</th><th>Email</th>
            <th>City</th><th>Service</th><th>Bill</th><th>Message</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($leads as $i => $l): ?>
            <tr>
              <td><?= $total - $i ?></td>
              <td><?= htmlspecialchars(date('d M Y, H:i', strtotime($l['created_at']))) ?></td>
              <td><?= htmlspecialchars($l['name']) ?></td>
              <td><a class="tel" href="tel:<?= htmlspecialchars($l['phone']) ?>"><?= htmlspecialchars($l['phone']) ?></a></td>
              <td><a class="mail" href="mailto:<?= htmlspecialchars($l['email']) ?>"><?= htmlspecialchars($l['email']) ?></a></td>
              <td><?= htmlspecialchars($l['city']) ?></td>
              <td><?= htmlspecialchars($l['service']) ?></td>
              <td><?= htmlspecialchars($l['bill']) ?></td>
              <td><?= nl2br(htmlspecialchars($l['message'])) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
</body>
</html>
