<?php
/**
 * get_inquiries.php — returns all inquiries as JSON for the admin dashboard.
 */

require __DIR__ . '/db.php';
send_cors_headers();

// This returns customer PII (name, phone, email) — require admin auth/key.
require __DIR__ . '/api_guard.php';
require_api_key();

$rows = $pdo->query(
    'SELECT id, name, phone, email, city, service, bill, message, status, created_at
     FROM leads
     ORDER BY created_at DESC'
)->fetchAll();

$out = array_map(static function ($r) {
    return [
        'id'          => (int) $r['id'],
        'fullName'    => $r['name'],
        'phone'       => $r['phone'],
        'email'       => $r['email'],
        'city'        => $r['city'],
        'serviceType' => $r['service'],
        'monthlyBill' => $r['bill'],
        'message'     => $r['message'],
        'status'      => $r['status'] ?: 'New',
        'date'        => $r['created_at'],
    ];
}, $rows);

echo json_encode($out);
