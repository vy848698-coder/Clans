<?php
/**
 * get_saathi_documents.php?journey=… — one Solar Saathi application for the
 * dashboard: status, connection details, consent record and the document
 * list (no file contents; those come from saathi_document_file.php).
 * Owner login only (see require_owner_login in saathi_docs_lib.php).
 */
require __DIR__ . '/db.php';
send_cors_headers();
require __DIR__ . '/saathi_docs_lib.php';
require_owner_login();
header('Cache-Control: no-store');

$journey = $_GET['journey'] ?? '';
if (!is_string($journey) || !preg_match('/^[a-z0-9]{12,32}$/', $journey)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid journey']);
    exit;
}

saathi_docs_tables($pdo);
$st = $pdo->prepare('SELECT * FROM saathi_applications WHERE journey_id = ?');
$st->execute([$journey]);
$app = $st->fetch();
if (!$app) {
    echo json_encode(['application' => null, 'documents' => [], 'missing' => []]);
    exit;
}
$docs = $pdo->prepare('SELECT * FROM saathi_documents WHERE journey_id = ? ORDER BY doc_type, id');
$docs->execute([$journey]);

echo json_encode([
    'application' => [
        'status'         => $app['status'],
        'discom'         => $app['discom'],
        'consumerNo'     => $app['consumer_no'],
        'nameOnBill'     => $app['name_on_bill'],
        'language'       => $app['language'],
        'consentVersion' => $app['consent_version'],
        'consentText'    => $app['consent_text'],
        'consentAt'      => $app['consent_at'],
        'consentIp'      => $app['consent_ip'],
        'submittedAt'    => $app['submitted_at'],
        'updatedAt'      => $app['updated_at'],
    ],
    'documents' => array_map('saathi_doc_json', $docs->fetchAll()),
    'missing'   => saathi_missing_docs($pdo, $journey),
    'labels'    => array_map(static fn($d) => $d[0], SAATHI_DOCS),
    'statuses'  => SAATHI_APP_STATUSES,
    'retentionMonths' => SAATHI_RETENTION_MONTHS,
]);
