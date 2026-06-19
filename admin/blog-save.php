<?php
require __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: blogs.php');
    exit;
}

$id        = (int)($_POST['id'] ?? 0);
$title     = trim($_POST['title']     ?? '');
$chip      = trim($_POST['chip']      ?? '');
$excerpt   = trim($_POST['excerpt']   ?? '');
$body      = sanitize_html($_POST['body'] ?? '');
$author    = trim($_POST['author']    ?? '');
$read_time = trim($_POST['read_time'] ?? '');
$existing  = trim($_POST['existing_image'] ?? '');
$hidden    = !empty($_POST['hidden']) ? 1 : 0;

// Categories arrive as an array of checkbox values; validate against the DB and store space-separated.
$allowedCats = array_column(get_categories($pdo), 'slug');
$cats = array_values(array_intersect($allowedCats, (array)($_POST['category'] ?? [])));
$category = implode(' ', $cats);

$errors = [];
if ($title === '')   $errors[] = 'Title is required.';
if ($excerpt === '') $errors[] = 'Excerpt is required.';
if (trim(strip_tags($body)) === '') $errors[] = 'Body is required.';

// ---- Handle image upload ----
$imagePath = $existing; // keep old image on edit if no new file
if (!empty($_FILES['image']['name']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $allowed = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $mime = mime_content_type($_FILES['image']['tmp_name']);

    if (!isset($allowed[$ext]) || !in_array($mime, $allowed, true)) {
        $errors[] = 'Image must be a JPG, PNG or WebP file.';
    } elseif ($_FILES['image']['size'] > 4 * 1024 * 1024) {
        $errors[] = 'Image must be under 4 MB.';
    } else {
        $dir = __DIR__ . '/../image/blog';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $fname = 'post-' . time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (move_uploaded_file($_FILES['image']['tmp_name'], "$dir/$fname")) {
            $imagePath = 'image/blog/' . $fname;
        } else {
            $errors[] = 'Could not save the uploaded image.';
        }
    }
}

if ($errors) {
    $_SESSION['flash_error'] = implode(' ', $errors);
    header('Location: ' . ($id ? "blog-form.php?id=$id" : 'blog-form.php'));
    exit;
}

if ($id) {
    $stmt = $pdo->prepare(
        'UPDATE posts SET title=:title, chip=:chip, category=:category, excerpt=:excerpt,
            body=:body, author=:author, read_time=:read_time, image=:image, hidden=:hidden WHERE id=:id'
    );
    $stmt->execute([
        ':title' => $title, ':chip' => $chip, ':category' => $category, ':excerpt' => $excerpt,
        ':body' => $body, ':author' => $author, ':read_time' => $read_time,
        ':image' => $imagePath, ':hidden' => $hidden, ':id' => $id,
    ]);
    $_SESSION['flash_ok'] = 'Blog updated.';
} else {
    $stmt = $pdo->prepare(
        'INSERT INTO posts (title, chip, category, excerpt, body, author, read_time, image, hidden, created_at)
         VALUES (:title, :chip, :category, :excerpt, :body, :author, :read_time, :image, :hidden, NOW())'
    );
    $stmt->execute([
        ':title' => $title, ':chip' => $chip, ':category' => $category, ':excerpt' => $excerpt,
        ':body' => $body, ':author' => $author, ':read_time' => $read_time, ':image' => $imagePath,
        ':hidden' => $hidden,
    ]);
    $_SESSION['flash_ok'] = 'Blog published.';
}

header('Location: blogs.php');
exit;
