<?php
require __DIR__ . '/auth.php';

function slugify($s) {
    $s = strtolower(trim($s));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-');
}

// ---- Handle add ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'add') {
    $name = trim($_POST['name'] ?? '');
    $slug = slugify($_POST['slug'] ?? $name);
    if ($name === '' || $slug === '') {
        $_SESSION['flash_error'] = 'Both a name and a valid slug are required.';
    } else {
        try {
            $max = (int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM categories')->fetchColumn();
            $stmt = $pdo->prepare('INSERT INTO categories (slug, name, sort_order) VALUES (:slug, :name, :so)');
            $stmt->execute([':slug' => $slug, ':name' => $name, ':so' => $max + 1]);
            $_SESSION['flash_ok'] = 'Category added.';
        } catch (PDOException $e) {
            $_SESSION['flash_error'] = ($e->getCode() === '23000')
                ? "A category with slug \"$slug\" already exists."
                : 'Could not add category.';
        }
    }
    header('Location: categories.php');
    exit;
}

$err = $_SESSION['flash_error'] ?? ''; unset($_SESSION['flash_error']);
$ok  = $_SESSION['flash_ok']    ?? ''; unset($_SESSION['flash_ok']);
$cats = $pdo->query('SELECT * FROM categories ORDER BY sort_order, name')->fetchAll();

// How many posts use each category (so the owner sees usage before deleting).
$usage = [];
foreach ($pdo->query('SELECT category FROM posts')->fetchAll() as $row) {
    foreach (preg_split('/\s+/', trim((string)$row['category']), -1, PREG_SPLIT_NO_EMPTY) as $slug) {
        $usage[$slug] = ($usage[$slug] ?? 0) + 1;
    }
}
function v($s) { return htmlspecialchars($s ?? '', ENT_QUOTES); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manage Categories — Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; background:#1e293b; }
    h1 { font-size:1.2rem; margin:0; }
    a { color:#22d3ee; text-decoration:none; }
    .nav a { margin-left:1rem; }
    .wrap { max-width:720px; margin:0 auto; padding:1.5rem; }
    .ok  { background:#14532d; padding:.7rem; border-radius:8px; margin-bottom:1rem; font-size:.85rem; }
    .err { background:#7f1d1d; padding:.7rem; border-radius:8px; margin-bottom:1rem; font-size:.85rem; }
    form.add { display:flex; gap:.6rem; flex-wrap:wrap; align-items:flex-end; background:#1e293b;
               padding:1rem; border-radius:10px; margin-bottom:1.5rem; }
    form.add label { display:block; font-size:.78rem; color:#94a3b8; margin-bottom:.25rem; }
    form.add input { padding:.55rem; border-radius:8px; border:1px solid #334155; background:#0f172a;
                     color:#e2e8f0; }
    form.add button { padding:.6rem 1.2rem; border:0; border-radius:8px; background:#22d3ee; color:#0f172a;
                      font-weight:600; cursor:pointer; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:.6rem .75rem; text-align:left; border-bottom:1px solid #334155; font-size:.85rem; }
    th { background:#1e293b; }
    code { background:#0f172a; padding:.1rem .4rem; border-radius:5px; color:#7dd3fc; font-size:.8rem; }
    .del { color:#f87171; }
    .muted { color:#64748b; }
  </style>
</head>
<body>
  <header>
    <h1>Manage Categories</h1>
    <div class="nav">
      <a href="index.php">Leads</a>
      <a href="blogs.php">Blogs</a>
      <a href="logout.php" style="color:#f87171;">Log out</a>
    </div>
  </header>
  <div class="wrap">
    <?php if ($ok):  ?><div class="ok"><?= v($ok) ?></div><?php endif; ?>
    <?php if ($err): ?><div class="err"><?= v($err) ?></div><?php endif; ?>

    <form class="add" method="post" action="categories.php">
      <input type="hidden" name="action" value="add">
      <div>
        <label>Display name</label>
        <input type="text" name="name" placeholder="e.g. Battery Storage" required>
      </div>
      <div>
        <label>Slug (optional — auto from name)</label>
        <input type="text" name="slug" placeholder="e.g. battery">
      </div>
      <button type="submit">+ Add Category</button>
    </form>

    <table>
      <thead><tr><th>Name</th><th>Slug (filter key)</th><th>Used by</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($cats as $c): ?>
        <tr>
          <td><?= v($c['name']) ?></td>
          <td><code><?= v($c['slug']) ?></code></td>
          <td><?= isset($usage[$c['slug']]) ? (int)$usage[$c['slug']] . ' post(s)' : '<span class="muted">—</span>' ?></td>
          <td>
            <a class="del" href="category-delete.php?id=<?= (int)$c['id'] ?>"
               onclick="return confirm('Delete this category? Existing posts keep their tag but it disappears from the sidebar.')">Delete</a>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$cats): ?>
        <tr><td colspan="4" class="muted" style="text-align:center;padding:2rem;">No categories yet. Add your first above.</td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>
</body>
</html>
