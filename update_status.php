<?php
/**
 * update_status.php — updates a lead's status (New / Read / Replied).
 */

require __DIR__ . '/db.php';
send_cors_headers();

// Require admin auth/key on every real request.
require __DIR__ . '/api_guard.php';
require_api_key();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = isset($input['id']) ? (int)$input['id'] : 0;
$status = isset($input['status']) ? trim((string)$input['status']) : '';

$allowed = ['New', 'Read', 'Replied'];
if ($id <= 0 || !in_array($status, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid id or status']);
    exit;
}

$stmt = $pdo->prepare('UPDATE leads SET status = :status WHERE id = :id');
$stmt->execute([':status' => $status, ':id' => $id]);

echo json_encode(['ok' => true, 'id' => $id, 'status' => $status]);
