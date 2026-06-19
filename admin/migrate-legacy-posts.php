<?php
/**
 * One-time migration: convert OLD plain-text post bodies into paragraph HTML so
 * they render consistently with new rich-text posts. Posts that already contain
 * HTML tags are left untouched. Safe to run more than once.
 *
 * Run it by opening:  http://localhost/ClansMachina/admin/migrate-legacy-posts.php
 * (must be logged into the admin panel first).
 */
require __DIR__ . '/auth.php';

$rows = $pdo->query('SELECT id, body FROM posts')->fetchAll();
$converted = [];

foreach ($rows as $r) {
    $body = (string) $r['body'];
    // Skip if it already contains HTML tags (already rich or already migrated).
    if (strip_tags($body) !== $body) continue;
    if (trim($body) === '') continue;

    // Plain text -> paragraphs: blank line splits paragraphs, single newline -> <br>.
    $html = '';
    foreach (preg_split('/\n\s*\n/', $body) as $para) {
        $para = trim($para);
        if ($para === '') continue;
        $html .= '<p>' . nl2br(htmlspecialchars($para, ENT_QUOTES)) . '</p>';
    }
    if ($html === '') continue;

    $stmt = $pdo->prepare('UPDATE posts SET body = :body WHERE id = :id');
    $stmt->execute([':body' => $html, ':id' => $r['id']]);
    $converted[] = $r['id'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Migrate Legacy Posts</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem;line-height:1.6;}
a{color:#22d3ee;} code{background:#1e293b;padding:.1rem .4rem;border-radius:5px;}</style></head>
<body>
  <h1>Legacy post migration</h1>
  <?php if ($converted): ?>
    <p>✅ Converted <strong><?= count($converted) ?></strong> plain-text post(s) to paragraph HTML:
       IDs <code><?= htmlspecialchars(implode(', ', $converted)) ?></code>.</p>
  <?php else: ?>
    <p>Nothing to convert — all posts already use HTML formatting.</p>
  <?php endif; ?>
  <p><a href="blogs.php">&larr; Back to Manage Blogs</a></p>
  <p style="color:#64748b;font-size:.85rem;">You can safely delete this file after running it.</p>
</body>
</html>
