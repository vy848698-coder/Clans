<?php
require __DIR__ . '/auth.php';

$id = (int)($_GET['id'] ?? 0);
if ($id) {
    // Remove the uploaded image file too (if any).
    $stmt = $pdo->prepare('SELECT image FROM posts WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $img = $stmt->fetchColumn();
    if ($img) {
        $path = __DIR__ . '/../' . $img;
        if (is_file($path)) @unlink($path);
    }
    $pdo->prepare('DELETE FROM posts WHERE id = :id')->execute([':id' => $id]);
    $_SESSION['flash_ok'] = 'Blog deleted.';
}
header('Location: blogs.php');
exit;
