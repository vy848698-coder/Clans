<?php
/**
 * saathi_apply.php — the Solar Saathi "Apply now" step: the customer's
 * consent, their electricity connection details and their documents.
 *
 * Called only by the chatbot's server (Vercel), never by the browser, with
 * the shared key in X-Saathi-Key (same key as save_saathi_lead.php). The
 * chatbot has already checked the customer's verified mobile/email.
 *
 *   POST ?action=start   JSON {journey, language, consent:{version,text,ip,ua}, details:{discom,consumer_no,name_on_bill}}
 *   POST ?action=upload  multipart: journey, doc, file
 *   POST ?action=remove  JSON {journey, id}
 *   POST ?action=status  JSON {journey}
 *   POST ?action=submit  JSON {journey}
 *   POST ?action=limits  this server's PHP upload limits (for set-up checks)
 */

require __DIR__ . '/saathi-config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, ['ok' => false, 'error' => 'Method not allowed']);

$provided = $_SERVER['HTTP_X_SAATHI_KEY'] ?? '';
$keySet = SAATHI_LEAD_KEY !== '' && SAATHI_LEAD_KEY !== 'xxxxxxxxxxxxxxxx';
if (!$keySet || !is_string($provided) || !hash_equals(SAATHI_LEAD_KEY, $provided)) out(401, ['ok' => false, 'error' => 'Unauthorized']);

$action = $_GET['action'] ?? '';

if ($action === 'limits') {
    out(200, [
        'ok' => true,
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size'       => ini_get('post_max_size'),
        'file_uploads'        => ini_get('file_uploads'),
        'finfo'               => class_exists('finfo'),
    ]);
}

// A too-large multipart body arrives with $_POST and $_FILES empty.
if ($action === 'upload' && empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    out(413, ['ok' => false, 'error' => 'too_large', 'detail' => 'Above post_max_size (' . ini_get('post_max_size') . ')']);
}

$in = $action === 'upload' ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);
$journey = is_string($in['journey'] ?? null) ? $in['journey'] : '';
if (!preg_match('/^[a-z0-9]{12,32}$/', $journey)) out(400, ['ok' => false, 'error' => 'invalid']);

require __DIR__ . '/db.php';
require __DIR__ . '/saathi_docs_lib.php';
saathi_docs_tables($pdo);

$clip = static fn($v, int $max) => mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) ($v ?? ''))), 0, $max);

function app_row(PDO $pdo, string $journey): ?array {
    $st = $pdo->prepare('SELECT * FROM saathi_applications WHERE journey_id = ?');
    $st->execute([$journey]);
    return $st->fetch() ?: null;
}

function docs_state(PDO $pdo, string $journey): array {
    $st = $pdo->prepare('SELECT * FROM saathi_documents WHERE journey_id = ? ORDER BY id');
    $st->execute([$journey]);
    $app = app_row($pdo, $journey);
    return [
        'ok'      => true,
        'status'  => $app['status'] ?? null,
        'docs'    => array_map('saathi_doc_json', $st->fetchAll()),
        'missing' => saathi_missing_docs($pdo, $journey),
    ];
}

try {
    switch ($action) {
        case 'start': {
            // The lead row (saved when the plan was shown) must exist.
            $st = $pdo->prepare('SELECT id FROM saathi_leads WHERE journey_id = ?');
            $st->execute([$journey]);
            if (!$st->fetchColumn()) out(404, ['ok' => false, 'error' => 'no_lead']);

            $c = is_array($in['consent'] ?? null) ? $in['consent'] : [];
            $d = is_array($in['details'] ?? null) ? $in['details'] : [];
            // Kept line by line, exactly as shown to the customer.
            $consentText = mb_substr(trim(preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', ' ', (string) ($c['text'] ?? ''))), 0, 8000);
            if ($consentText === '' || $clip($c['version'] ?? '', 30) === '') out(400, ['ok' => false, 'error' => 'no_consent']);
            $consumerNo = $clip($d['consumer_no'] ?? '', 30);
            if (!preg_match('/^[A-Za-z0-9\/-]{4,30}$/', $consumerNo)) out(400, ['ok' => false, 'error' => 'consumer_no']);

            $pdo->prepare("INSERT INTO saathi_applications
                    (journey_id, discom, consumer_no, name_on_bill, language, consent_version, consent_text, consent_at, consent_ip, consent_ua)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
                ON DUPLICATE KEY UPDATE discom = VALUES(discom), consumer_no = VALUES(consumer_no),
                    name_on_bill = VALUES(name_on_bill), language = VALUES(language),
                    consent_version = VALUES(consent_version), consent_text = VALUES(consent_text),
                    consent_at = NOW(), consent_ip = VALUES(consent_ip), consent_ua = VALUES(consent_ua)")
                ->execute([
                    $journey,
                    $clip($d['discom'] ?? '', 80),
                    $consumerNo,
                    $clip($d['name_on_bill'] ?? '', 120),
                    $clip($in['language'] ?? '', 20),
                    $clip($c['version'], 30),
                    $consentText,
                    $clip($c['ip'] ?? '', 45),
                    $clip($c['ua'] ?? '', 255),
                ]);
            out(200, docs_state($pdo, $journey));
        }

        case 'upload': {
            $app = app_row($pdo, $journey);
            if (!$app || !$app['consent_at']) out(409, ['ok' => false, 'error' => 'no_consent']);
            $type = $in['doc'] ?? '';
            if (!isset(SAATHI_DOCS[$type])) out(400, ['ok' => false, 'error' => 'invalid']);
            [, , $max] = SAATHI_DOCS[$type];

            $f = $_FILES['file'] ?? null;
            if (!$f || is_array($f['error'])) out(400, ['ok' => false, 'error' => 'invalid']);
            if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
                out(413, ['ok' => false, 'error' => 'too_large', 'detail' => 'Above upload_max_filesize (' . ini_get('upload_max_filesize') . ')']);
            }
            if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) out(400, ['ok' => false, 'error' => 'upload_failed']);
            if ($f['size'] <= 0 || $f['size'] > SAATHI_DOC_MAX_BYTES) out(413, ['ok' => false, 'error' => 'too_large']);

            // The real file type from its content, not the name the phone gave it.
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
            if (!isset(SAATHI_DOC_TYPES[$mime])) out(415, ['ok' => false, 'error' => 'file_type']);
            if ($mime !== 'application/pdf' && @getimagesize($f['tmp_name']) === false) out(415, ['ok' => false, 'error' => 'file_type']);

            $existing = $pdo->prepare('SELECT * FROM saathi_documents WHERE journey_id = ? AND doc_type = ? ORDER BY id');
            $existing->execute([$journey, $type]);
            $old = $existing->fetchAll();
            // One-file documents: a new upload replaces the old one. Roof photos add up to the maximum.
            if ($max > 1 && count($old) >= $max) out(409, ['ok' => false, 'error' => 'too_many']);

            $stored = bin2hex(random_bytes(16)) . '.' . SAATHI_DOC_TYPES[$mime];
            $dest = saathi_docs_dir($journey) . "/$stored";
            if (!move_uploaded_file($f['tmp_name'], $dest)) out(500, ['ok' => false, 'error' => 'store_failed']);
            @chmod($dest, 0640);

            $pdo->prepare('INSERT INTO saathi_documents (journey_id, doc_type, original_name, stored_name, mime, size_bytes, sha256)
                           VALUES (?, ?, ?, ?, ?, ?, ?)')
                ->execute([$journey, $type, $clip(basename((string) $f['name']), 160), $stored, $mime, (int) $f['size'], hash_file('sha256', $dest)]);
            if ($max === 1 && $old) saathi_delete_docs($pdo, $old);
            out(200, docs_state($pdo, $journey));
        }

        case 'remove': {
            $st = $pdo->prepare('SELECT * FROM saathi_documents WHERE id = ? AND journey_id = ?');
            $st->execute([(int) ($in['id'] ?? 0), $journey]);
            $doc = $st->fetch();
            // A checked document stays; the team asks for a new one if needed.
            if ($doc && $doc['status'] !== 'Verified') saathi_delete_docs($pdo, [$doc]);
            out(200, docs_state($pdo, $journey));
        }

        case 'status':
            out(200, docs_state($pdo, $journey));

        case 'submit': {
            $app = app_row($pdo, $journey);
            if (!$app || !$app['consent_at']) out(409, ['ok' => false, 'error' => 'no_consent']);
            $missing = saathi_missing_docs($pdo, $journey);
            if ($missing) out(409, ['ok' => false, 'error' => 'missing', 'missing' => $missing]);
            $pdo->prepare("UPDATE saathi_applications
                           SET status = IF(status = 'Draft', 'Submitted', status), submitted_at = NOW()
                           WHERE journey_id = ?")->execute([$journey]);
            out(200, docs_state($pdo, $journey));
        }
    }
    out(400, ['ok' => false, 'error' => 'invalid']);
} catch (Throwable $e) {
    error_log('[saathi_apply] ' . $e->getMessage());
    out(500, ['ok' => false, 'error' => 'server']);
}
