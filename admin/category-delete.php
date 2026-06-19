<?php
require __DIR__ . '/auth.php';

$id = (int)($_GET['id'] ?? 0);
if ($id) {
    $pdo->prepare('DELETE FROM categories WHERE id = :id')->execute([':id' => $id]);
    $_SESSION['flash_ok'] = 'Category deleted.';
}
header('Location: categories.php');
exit;
