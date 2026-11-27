<?php
/**
 * saathi_document_file.php?id=…[&download=1] — sends one Solar Saathi
 * document to a logged-in owner, and records who opened it.
 * The files live outside the web root; this is the only way to read them.
 */
require __DIR__ . '/db.php';
send_cors_headers();
require __DIR__ . '/saathi_docs_lib.php';
$who = require_owner_login();

saathi_docs_tables($pdo);
$st = $pdo->prepare('SELECT * FROM saathi_documents WHERE id = ?');
$st->execute([(int) ($_GET['id'] ?? 0)]);
$doc = $st->fetch();
$path = $doc ? saathi_doc_path($doc['journey_id'], $doc['stored_name']) : '';
if (!$doc || !is_file($path)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Document not found (it may have been deleted)']);
    exit;
}

$download = !empty($_GET['download']);
$pdo->prepare('INSERT INTO saathi_document_access (document_id, journey_id, doc_type, viewer, action, ip) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([$doc['id'], $doc['journey_id'], $doc['doc_type'], (string) ($who['email'] ?? $who['name'] ?? 'owner'), $download ? 'download' : 'view', $_SERVER['REMOTE_ADDR'] ?? '']);

$ext = pathinfo($doc['stored_name'], PATHINFO_EXTENSION);
$name = preg_replace('/[^A-Za-z0-9._-]+/', '_', $doc['doc_type'] . '_' . $doc['journey_id'] . '_' . $doc['id']) . ".$ext";
header('Content-Type: ' . $doc['mime']);
header('Content-Length: ' . filesize($path));
header('Content-Disposition: ' . ($download ? 'attachment' : 'inline') . '; filename="' . $name . '"');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
readfile($path);
