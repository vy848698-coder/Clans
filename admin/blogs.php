<?php
require __DIR__ . '/auth.php';

$posts = $pdo->query('SELECT * FROM posts ORDER BY created_at DESC')->fetchAll();
$ok  = $_SESSION['flash_ok'] ?? '';   unset($_SESSION['flash_ok']);
function v($s) { return htmlspecialchars($s ?? '', ENT_QUOTES); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manage Blogs — Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; background:#1e293b; }
    h1 { font-size:1.2rem; margin:0; }
    a { color:#22d3ee; text-decoration:none; }
    .nav a { margin-left:1rem; }
    .wrap { padding:1.5rem; }
    .btn { display:inline-block; padding:.55rem 1rem; border-radius:8px; background:#22d3ee;
           color:#0f172a; font-weight:600; }
    .ok { background:#14532d; padding:.7rem; border-radius:8px; margin-bottom:1rem; font-size:.85rem; }
    table { width:100%; border-collapse:collapse; margin-top:1rem; }
    th, td { padding:.6rem .75rem; text-align:left; border-bottom:1px solid #334155; font-size:.85rem; vertical-align:top; }
    th { background:#1e293b; }
    .thumb { width:64px; height:42px; object-fit:cover; border-radius:6px; background:#1e293b; }
    .act a { margin-right:.75rem; }
    .del { color:#f87171; }
    .empty { padding:3rem; text-align:center; color:#64748b; }
  </style>
</head>
<body>
  <header>
    <h1>Manage Blogs</h1>
    <div class="nav">
      <a href="index.php">Leads</a>
      <a href="categories.php">Categories</a>
      <a href="blog-form.php" class="btn">+ Add Blog</a>
      <a href="logout.php" style="color:#f87171;">Log out</a>
    </div>
  </header>
  <div class="wrap">
    <?php if ($ok): ?><div class="ok"><?= v($ok) ?></div><?php endif; ?>
    <?php if (!$posts): ?>
      <div class="empty">No blogs yet. Click <strong>+ Add Blog</strong> to publish your first one.</div>
    <?php else: ?>
      <table>
        <thead><tr><th>Image</th><th>Title</th><th>Chip</th><th>Author</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
        <?php foreach ($posts as $p): ?>
          <tr>
            <td><?php if ($p['image']): ?><img class="thumb" src="../<?= v($p['image']) ?>" alt=""><?php else: ?>—<?php endif; ?></td>
            <td><?= v($p['title']) ?></td>
            <td><?= v($p['chip']) ?></td>
            <td><?= v($p['author']) ?></td>
            <td><?php if (!empty($p['hidden'])): ?>
                  <span style="color:#fbbf24;">Draft</span>
                <?php else: ?>
                  <span style="color:#4ade80;">Published</span>
                <?php endif; ?></td>
            <td><?= v(date('d M Y', strtotime($p['created_at']))) ?></td>
            <td class="act">
              <a href="../post.php?id=<?= (int)$p['id'] ?>" target="_blank">View</a>
              <a href="blog-form.php?id=<?= (int)$p['id'] ?>">Edit</a>
              <a class="del" href="blog-delete.php?id=<?= (int)$p['id'] ?>"
                 onclick="return confirm('Delete this blog permanently?')">Delete</a>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
</body>
</html>
