<?php
/**
 * Receives the Partnership application form (JSON or POST), stores it in the
 * SAME `leads` table the contact form uses (so partner applications show up in
 * the admin dashboard alongside every other inquiry), then emails:
 *   1. a NOTIFICATION to the owner (GMAIL_USER), and
 *   2. an AUTO-REPLY to the applicant,
 * both via Gmail SMTP (smtp-mailer.php). Email is best-effort — a lead is never
 * lost if mail fails.
 *
 * Field mapping into `leads` (so get_inquiries.php surfaces them unchanged):
 *   Name        -> name
 *   Mobile No   -> phone
 *   Email       -> email
 *   State       -> city        (shown as "city" in the dashboard)
 *   Profession  -> service     (shown as "serviceType")
 *   Investment  -> bill        (shown as "monthlyBill")
 *
 * Responds with JSON: { ok, emailed, message }.
 */
header('Content-Type: application/json');
require __DIR__ . '/db.php';
require __DIR__ . '/mail-config.php';
require __DIR__ . '/smtp-mailer.php';
require __DIR__ . '/partner-emails.php';

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

$name       = clean($input['name']       ?? '');
$mobile     = clean($input['mobile']     ?? '');
$email      = clean($input['email']      ?? '');
$state      = clean($input['state']      ?? '');
$profession = clean($input['profession'] ?? '');
$investment = clean($input['investment'] ?? '');

$mobileDigits = preg_replace('/\D/', '', $mobile);

// Server-side validation
$errors = [];
if ($name === '')                                  $errors[] = 'Name is required.';
if (!preg_match('/^[0-9]{10}$/', $mobileDigits))    $errors[] = 'Valid 10-digit mobile number is required.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))     $errors[] = 'Valid email is required.';
if ($state === '')                                  $errors[] = 'State is required.';
if ($profession === '')                             $errors[] = 'Profession is required.';
if ($investment === '')                             $errors[] = 'Investment capacity is required.';

if ($errors) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// Tag the message so partner applications are recognisable in the dashboard.
$message = "PARTNERSHIP APPLICATION\n"
         . "State: {$state}\n"
         . "Profession: {$profession}\n"
         . "Investment capacity: {$investment}";

// --- Store the lead (this is the critical step; email is best-effort) --------
try {
    $stmt = $pdo->prepare(
        'INSERT INTO leads (name, phone, email, city, service, bill, message, created_at)
         VALUES (:name, :phone, :email, :city, :service, :bill, :message, NOW())'
    );
    $stmt->execute([
        ':name'    => $name,
        ':phone'   => $mobileDigits,
        ':email'   => $email,
        ':city'    => $state,        // State
        ':service' => $profession,   // Profession
        ':bill'    => $investment,   // Investment capacity
        ':message' => $message,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Could not save your application. Please try again.']);
    exit;
}

// --- Email (best-effort) -----------------------------------------------------
$emailed = false;
$emailMsg = '';
$waNumber = '91' . $mobileDigits;

if (mail_is_configured()) {
    try {
        // 1) Notify the owner.
        smtp_send_mail(
            'smtp.gmail.com', 587, GMAIL_USER, GMAIL_APP_PASSWORD,
            GMAIL_USER, MAIL_FROM_NAME, GMAIL_USER,
            'New Partnership Application — ' . $name,
            partner_owner_email($name, $mobileDigits, $email, $state, $profession, $investment, $waNumber),
            [], MAIL_SALES_BCC
        );

        // 2) Auto-reply to the applicant.
        smtp_send_mail(
            'smtp.gmail.com', 587, GMAIL_USER, GMAIL_APP_PASSWORD,
            GMAIL_USER, MAIL_FROM_NAME, $email,
            'We received your partnership application — Clans Machina Solar',
            partner_autoreply_email($name, $state, $profession, $investment)
        );

        $emailed  = true;
        $emailMsg = 'Confirmation emailed to ' . $email;
    } catch (Exception $ex) {
        $emailMsg = 'Saved, but email could not be sent: ' . $ex->getMessage();
    }
} else {
    $emailMsg = 'Saved. Email not configured (add your Gmail App Password in mail-config.php).';
}

echo json_encode([
    'ok'      => true,
    'emailed' => $emailed,
    'message' => 'Application received! We will contact you within 2 hours.',
]);
