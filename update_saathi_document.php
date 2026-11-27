<?php
/**
 * update_saathi_document.php — the dashboard's changes to an application:
 *
 *   POST {id, status: Received|Verified|Re-upload, note}       one document
 *   POST {journey, appStatus: Draft|Submitted|…|Closed}         the application
 *
 * Setting the application to "Applied" (filed on the PM Surya Ghar portal)
 * deletes the Aadhaar copy: UIDAI expects copies not to be kept once the
 * purpose is served. Owner login only.
 */
require __DIR__ . '/db.php';
send_cors_headers();
require __DIR__ . '/saathi_docs_lib.php';
require_owner_login();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
saathi_docs_tables($pdo);
$in = json_decode(file_get_contents('php://input'), true) ?: [];

if (isset($in['appStatus'])) {
    $journey = (string) ($in['journey'] ?? '');
    $status = (string) $in['appStatus'];
    if (!preg_match('/^[a-z0-9]{12,32}$/', $journey) || !in_array($status, SAATHI_APP_STATUSES, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid journey or status']);
        exit;
    }
    $pdo->prepare('UPDATE saathi_applications SET status = ? WHERE journey_id = ?')->execute([$status, $journey]);
    $deleted = 0;
    if (in_array($status, ['Applied', 'Installed', 'Closed'], true)) {
        $st = $pdo->prepare("SELECT * FROM saathi_documents WHERE journey_id = ? AND doc_type = 'aadhaar'");
        $st->execute([$journey]);
        $deleted = saathi_delete_docs($pdo, $st->fetchAll());
    }
    echo json_encode(['ok' => true, 'status' => $status, 'aadhaarDeleted' => $deleted]);
    exit;
}

$id = (int) ($in['id'] ?? 0);
$status = (string) ($in['status'] ?? '');
$note = mb_substr(trim((string) ($in['note'] ?? '')), 0, 255);
if ($id <= 0 || !in_array($status, SAATHI_DOC_STATUSES, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid id or status']);
    exit;
}
$exists = $pdo->prepare('SELECT COUNT(*) FROM saathi_documents WHERE id = ?');
$exists->execute([$id]);
if (!$exists->fetchColumn()) {
    http_response_code(404);
    echo json_encode(['error' => 'Document not found (it may have been deleted)']);
    exit;
}
$pdo->prepare('UPDATE saathi_documents SET status = ?, note = ? WHERE id = ?')->execute([$status, $note, $id]);
echo json_encode(['ok' => true, 'id' => $id, 'status' => $status, 'note' => $note]);
