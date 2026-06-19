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
