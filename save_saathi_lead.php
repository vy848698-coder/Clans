<?php
/**
 * save_saathi_lead.php — saves one Solar Saathi chatbot lead into `saathi_leads`.
 *
 * Called server-to-server by the chatbot (hosted on Vercel, which cannot reach
 * this MySQL directly). One row per chat: the "plan" send creates it, the
 * "booked" send fills in the consultation on the same row (unique journey_id).
 *
 * The chatbot POSTs JSON { "row": { column: value, ... } } with the shared
 * secret in the X-Saathi-Key header (see saathi-config.php).
 */

require __DIR__ . '/saathi-config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$provided = $_SERVER['HTTP_X_SAATHI_KEY'] ?? '';
$keySet = SAATHI_LEAD_KEY !== '' && SAATHI_LEAD_KEY !== 'xxxxxxxxxxxxxxxx';
if (!$keySet || !is_string($provided) || !hash_equals(SAATHI_LEAD_KEY, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$in = isset($input['row']) && is_array($input['row']) ? $input['row'] : [];

// Column => max length (text), 'int', 'dec' or 'date'. Anything else is dropped.
$columns = [
    'journey_id' => 32, 'stage' => 10, 'name' => 120, 'mobile' => 15,
    'mobile_verified' => 'int', 'email' => 150, 'email_verified' => 'int',
    'language' => 20, 'pin_code' => 6, 'area' => 120, 'district' => 80, 'state' => 80,
    'ownership' => 30, 'owner_permission' => 40, 'property_type' => 40, 'panels_on' => 40,
    'monthly_bill' => 'int', 'roof_space' => 30, 'main_goal' => 40, 'power_cuts' => 30,
    'install_when' => 30, 'payment' => 30, 'system_kw' => 'dec', 'panels' => 'int',
    'total_cost' => 'int', 'subsidy' => 'int', 'investment' => 'int', 'monthly_saving' => 'int',
    'savings_25y' => 'int', 'payback_years' => 'dec', 'consultation' => 30, 'consult_date' => 'date',
    'consult_time' => 30, 'booking_id' => 12, 'score' => 'int', 'temperature' => 10,
];
// NULL allowed (everything else falls back to '' or 0).
$nullable = ['journey_id', 'monthly_bill', 'system_kw', 'panels', 'total_cost', 'subsidy',
             'investment', 'monthly_saving', 'savings_25y', 'payback_years', 'consult_date'];

$row = [];
foreach ($columns as $col => $type) {
    $v = $in[$col] ?? null;
    if ($v === '' && in_array($col, $nullable, true)) $v = null;
    if ($v === null) {
        $row[$col] = in_array($col, $nullable, true) ? null : ($type === 'int' ? 0 : '');
    } elseif ($type === 'int') {
        $row[$col] = (int) $v;
    } elseif ($type === 'dec') {
        $row[$col] = is_numeric($v) ? (float) $v : null;
    } elseif ($type === 'date') {
        $row[$col] = is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
    } else {
        $row[$col] = mb_substr(trim((string) $v), 0, $type);
    }
}

if (!in_array($row['stage'], ['plan', 'booked'], true)
    || $row['name'] === ''
    || !preg_match('/^[6-9]\d{9}$/', $row['mobile'])
    || ($row['journey_id'] !== null && !preg_match('/^[a-z0-9]{12,32}$/', $row['journey_id']))) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid lead']);
    exit;
}

require __DIR__ . '/db.php';

// Kept on a later send so a re-sent plan never wipes a booking.
$booking = ['consultation', 'consult_date', 'consult_time', 'booking_id'];
// Never touched after the first save (status is the sales team's).
$fixed = ['journey_id'];

$cols = array_keys($row);
$updates = [];
foreach ($cols as $c) {
    if (in_array($c, $fixed, true)) continue;
    if ($c === 'stage') {
        $updates[] = "stage = IF(stage = 'booked', 'booked', VALUES(stage))";
    } elseif (in_array($c, $booking, true)) {
        $updates[] = "$c = IF(VALUES(booking_id) = '', $c, VALUES($c))";
    } else {
        $updates[] = "$c = VALUES($c)";
    }
}

// LAST_INSERT_ID(id) makes lastInsertId() the row's id on an update too.
$sql = 'INSERT INTO saathi_leads (' . implode(', ', $cols) . ')
        VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), ' . implode(', ', $updates);

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_values($row));
    echo json_encode(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Save failed: ' . $e->getMessage()]);
}
