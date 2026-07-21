<?php
require __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: blogs.php');
    exit;
}

// A POST that exceeds post_max_size arrives with $_POST/$_FILES emptied by PHP.
// Detect that up front so a too-large image reports an error instead of looking
// like a silently failed / blank save.
if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    $_SESSION['flash_error'] = 'The upload was too large for the server. Please choose a smaller image and try again.';
    header('Location: blog-form.php');
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
// The cover image is stored INLINE in the database as a base64 data URL (not as
// a file on disk), so it survives host redeploys and DB import/export. It is
// downscaled + recompressed first (see make_cover_data_url) so the row stays
// small and never trips MySQL's max_allowed_packet. On edit with no new file the
// existing value is kept; every failure is reported, never silently ignored.
$imagePath = $existing;
$file = $_FILES['image'] ?? null;
if ($file && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = upload_error_message((int)$file['error']);
    } else {
        $allowed = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $mime = @mime_content_type($file['tmp_name']) ?: '';

        if (!isset($allowed[$ext]) || !in_array($mime, $allowed, true)) {
            $errors[] = 'Image must be a JPG, PNG or WebP file.';
        } elseif ($file['size'] > 8 * 1024 * 1024) {
            $errors[] = 'Image must be under 8 MB.';
        } else {
            $imgErr = null;
            $dataUrl = make_cover_data_url($file['tmp_name'], $mime, $imgErr);
            if ($dataUrl === null) {
                $errors[] = $imgErr ?: 'Could not process the uploaded image.';
            } else {
                $imagePath = $dataUrl;
            }
        }
    }
}

if ($errors) {
    $_SESSION['flash_error'] = implode(' ', $errors);
    header('Location: ' . ($id ? "blog-form.php?id=$id" : 'blog-form.php'));
    exit;
}

try {
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
} catch (PDOException $e) {
    // Surface the real failure (e.g. a huge image exceeding max_allowed_packet)
    // as a flash message instead of a blank 500 that looks like "nothing saved".
    $tooBig = stripos($e->getMessage(), 'max_allowed_packet') !== false
           || stripos($e->getMessage(), 'packet') !== false;
    $_SESSION['flash_error'] = $tooBig
        ? 'The image was too large for the database to store. Please try a smaller image.'
        : 'Could not save the blog (database error). Please try again.';
    header('Location: ' . ($id ? "blog-form.php?id=$id" : 'blog-form.php'));
    exit;
}

header('Location: blogs.php');
exit;
