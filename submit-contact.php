<?php
/**
 * Receives the contact form (JSON or POST) and stores it in the `leads` table.
 * Responds with JSON.
 */
header('Content-Type: application/json');
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

// Accept either JSON body or normal form POST.
$raw   = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    $input = $_POST;
}

function clean($v) { return trim((string)($v ?? '')); }

$name    = clean($input['name']    ?? '');
$phone   = clean($input['phone']   ?? '');
$email   = clean($input['email']   ?? '');
$city    = clean($input['city']    ?? '');
$service = clean($input['service'] ?? '');
$bill    = clean($input['bill']    ?? '');
$message = clean($input['message'] ?? '');

// Server-side validation
$errors = [];
if ($name === '')                                      $errors[] = 'Name is required.';
if (!preg_match('/^[0-9]{10}$/', preg_replace('/\D/', '', $phone)))
                                                       $errors[] = 'Valid 10-digit phone is required.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))        $errors[] = 'Valid email is required.';
if ($city === '')                                      $errors[] = 'City is required.';
if ($bill === '')                                      $errors[] = 'Monthly bill is required.';

if ($errors) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// Handle optional resume / file uploads (e.g. from the careers form).
// Files are stored under uploads/resumes/ and their links appended to $message.
if (!empty($_FILES['resume']) && is_array($_FILES['resume']['name'])) {
    $allowedExt  = ['pdf', 'doc', 'docx', 'rtf', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
    $maxBytes    = 5 * 1024 * 1024; // 5 MB
    $uploadDir   = __DIR__ . '/uploads/resumes';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $savedLinks = [];
    $count = count($_FILES['resume']['name']);
    for ($i = 0; $i < $count && $i < 5; $i++) {
        if (($_FILES['resume']['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }
        if (($_FILES['resume']['size'][$i] ?? 0) > $maxBytes) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => 'Each file must be 5 MB or smaller.']);
            exit;
        }
        $origName = $_FILES['resume']['name'][$i];
        $ext      = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true)) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => 'Unsupported file type. Allowed: ' . implode(', ', $allowedExt) . '.']);
            exit;
        }
        // Safe, unique filename; keep a readable slug of the original name.
        $slug     = preg_replace('/[^a-zA-Z0-9_-]+/', '-', pathinfo($origName, PATHINFO_FILENAME));
        $slug     = trim(substr($slug, 0, 60), '-') ?: 'file';
        $newName  = $slug . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $dest     = $uploadDir . '/' . $newName;
        if (move_uploaded_file($_FILES['resume']['tmp_name'][$i], $dest)) {
            $savedLinks[] = 'uploads/resumes/' . $newName;
        }
    }

    if ($savedLinks) {
        $message = trim($message . "\n\nAttachments:\n" . implode("\n", $savedLinks));
    }
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO leads (name, phone, email, city, service, bill, message, created_at)
         VALUES (:name, :phone, :email, :city, :service, :bill, :message, NOW())'
    );
    $stmt->execute([
        ':name'    => $name,
        ':phone'   => $phone,
        ':email'   => $email,
        ':city'    => $city,
        ':service' => $service,
        ':bill'    => $bill,
        ':message' => $message,
    ]);

    echo json_encode(['ok' => true, 'message' => 'We will contact you within 2 hours!']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Could not save your request. Please try again.']);
}
