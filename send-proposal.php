<?php
/**
 * Receives a generated solar proposal (lead details + base64 PDF), stores the
 * lead, and emails the PDF to the customer via Gmail SMTP.
 * Responds with JSON: { ok, emailed, message }.
 */
header('Content-Type: application/json');
require __DIR__ . '/db.php';
require __DIR__ . '/mail-config.php';
require __DIR__ . '/smtp-mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Bad request']);
    exit;
}

function c($v) { return trim((string)($v ?? '')); }

$name       = c($in['name'] ?? '');
$phone      = preg_replace('/\D/', '', c($in['phone'] ?? ''));
$email      = c($in['email'] ?? '');
$district   = c($in['district'] ?? '');
$state      = c($in['state'] ?? '');
$proposalNo = c($in['proposalNo'] ?? '');
$systemSize = c($in['systemSize'] ?? '');
$bill       = c($in['bill'] ?? '');
$pdf        = (string)($in['pdf'] ?? '');

// Validation
$errors = [];
if ($name === '')                                $errors[] = 'Name is required.';
if (strlen($phone) !== 10)                        $errors[] = 'Valid 10-digit phone is required.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))   $errors[] = 'Valid email is required.';
if ($errors) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// Store the lead (best-effort; mirrors the submit-contact.php `leads` table).
try {
    $stmt = $pdo->prepare(
        'INSERT INTO leads (name, phone, email, city, service, bill, message, created_at)
         VALUES (:name, :phone, :email, :city, :service, :bill, :message, NOW())'
    );
    $stmt->execute([
        ':name'    => $name,
        ':phone'   => $phone,
        ':email'   => $email,
        ':city'    => $district,
        ':service' => 'Solar Calculator Proposal',
        ':bill'    => $bill,
        ':message' => 'Proposal ' . $proposalNo . ' · ' . $systemSize . ' kW'
                    . ' · District: ' . $district . ($state ? ' · State: ' . $state : ''),
    ]);
} catch (PDOException $e) {
    // Non-fatal: still try to email the proposal.
}

// Decode the PDF data URL → raw bytes.
$pdfBin = '';
if (preg_match('#^data:application/pdf;base64,#', $pdf)) {
    $pdfBin = base64_decode(substr($pdf, strpos($pdf, ',') + 1)) ?: '';
} elseif ($pdf !== '') {
    $pdfBin = base64_decode($pdf) ?: '';
}

$emailed = false;
$message = '';

if (!mail_is_configured()) {
    $message = 'Email is not configured yet (add your Gmail App Password in mail-config.php).';
} else {
    try {
        $subject  = 'Your Clans Machina Solar Proposal' . ($proposalNo ? " ($proposalNo)" : '');
        $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        $body =
            '<div style="font-family:Segoe UI,Arial,sans-serif;color:#12241c;font-size:14px;line-height:1.6;max-width:560px">'
          . '<div style="background:linear-gradient(135deg,#0b3b28,#0f6f47);color:#fff;padding:22px 24px;border-radius:12px">'
          . '<div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#a8e6cd">Clans Machina Solar</div>'
          . '<div style="font-size:22px;font-weight:800;margin-top:4px">Your Solar Proposal is ready</div>'
          . '</div>'
          . '<p style="margin:18px 0 6px">Dear ' . $safeName . ',</p>'
          . '<p style="margin:0 0 14px">Thank you for using the Clans Machina Solar Savings Calculator. '
          . 'Your personalised proposal' . ($proposalNo ? ' <b>' . htmlspecialchars($proposalNo, ENT_QUOTES, 'UTF-8') . '</b>' : '')
          . ' is attached as a PDF' . ($pdfBin === '' ? ' (or available from the download button on our site)' : '') . '.</p>'
          . '<p style="margin:0 0 14px">Recommended system: <b>' . htmlspecialchars($systemSize, ENT_QUOTES, 'UTF-8') . ' kW</b>'
          . ($district ? ' &middot; ' . htmlspecialchars($district, ENT_QUOTES, 'UTF-8') : '')
          . ($state ? ', ' . htmlspecialchars($state, ENT_QUOTES, 'UTF-8') : '') . '.</p>'
          . '<p style="margin:0 0 14px">Ready for the next step? Book a <b>free site survey</b> and talk to a solar expert:</p>'
          . '<p style="margin:0 0 4px">📞 Call / WhatsApp: <b>+91 91241 65341</b></p>'
          . '<p style="margin:0 0 4px">✉️ Email: <b>info@clansmachina.in</b></p>'
          . '<p style="margin:0 0 18px">🌐 Website: <b>www.clansmachina.in</b></p>'
          . '<p style="margin:0;color:#8a978f;font-size:12px">This proposal is an indicative savings estimate, not a contract or guarantee. '
          . 'Final figures depend on your roof, shading, DISCOM tariff and a site survey.</p>'
          . '</div>';

        $attachments = [];
        if ($pdfBin !== '') {
            $attachments[] = [
                'name' => 'Clans-Machina-Proposal-' . ($proposalNo !== '' ? $proposalNo : 'estimate') . '.pdf',
                'type' => 'application/pdf',
                'data' => $pdfBin,
            ];
        }

        smtp_send_mail(
            'smtp.gmail.com', 587, GMAIL_USER, GMAIL_APP_PASSWORD,
            GMAIL_USER, MAIL_FROM_NAME, $email, $subject, $body,
            $attachments, MAIL_SALES_BCC
        );
        $emailed = true;
        $message = 'Proposal emailed to ' . $email;
    } catch (Exception $e) {
        $message = 'Could not send email: ' . $e->getMessage();
    }
}

echo json_encode(['ok' => true, 'emailed' => $emailed, 'message' => $message]);
