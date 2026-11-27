<?php
/**
 * get_saathi_leads.php — returns every Solar Saathi chatbot lead (the
 * `saathi_leads` table) as JSON for the admin dashboard.
 */

require __DIR__ . '/db.php';
send_cors_headers();

// This returns customer PII (name, mobile, email, address) — require admin auth/key.
require __DIR__ . '/api_guard.php';
require_api_key();

header('Cache-Control: no-store');

// With the "Apply now" application, if any: its status and document count.
require __DIR__ . '/saathi_docs_lib.php';
saathi_docs_tables($pdo);
$rows = $pdo->query(
    'SELECT l.*, a.status AS app_status, a.submitted_at AS app_submitted_at,
            (SELECT COUNT(*) FROM saathi_documents d WHERE d.journey_id = l.journey_id) AS doc_count
     FROM saathi_leads l
     LEFT JOIN saathi_applications a ON a.journey_id = l.journey_id
     ORDER BY l.created_at DESC, l.id DESC'
)->fetchAll();

// DATETIME columns carry no timezone. Tag them with the DB server's UTC offset
// ("2026-10-09T05:01:08+00:00") so every browser parses and converts them correctly.
$offset = $pdo->query(
    "SELECT TIME_FORMAT(TIMEDIFF(NOW(), UTC_TIMESTAMP()), '%H:%i')"
)->fetchColumn() ?: '00:00';
$tzSuffix = ($offset[0] === '-' ? '' : '+') . $offset;

$intOrNull   = static fn($v) => $v === null || $v === '' ? null : (int) $v;
$floatOrNull = static fn($v) => $v === null || $v === '' ? null : (float) $v;
$iso         = static fn($v) => $v ? str_replace(' ', 'T', $v) . $tzSuffix : null;

$out = array_map(static function ($r) use ($intOrNull, $floatOrNull, $iso) {
    return [
        'id'              => (int) $r['id'],
        'journeyId'       => $r['journey_id'],
        'stage'           => $r['stage'],
        'name'            => $r['name'],
        'mobile'          => $r['mobile'],
        'mobileVerified'  => (bool) $r['mobile_verified'],
        'email'           => $r['email'],
        'emailVerified'   => (bool) $r['email_verified'],
        'language'        => $r['language'],
        'pinCode'         => $r['pin_code'],
        'area'            => $r['area'],
        'district'        => $r['district'],
        'state'           => $r['state'],
        'ownership'       => $r['ownership'],
        'ownerPermission' => $r['owner_permission'],
        'propertyType'    => $r['property_type'],
        'panelsOn'        => $r['panels_on'],
        'monthlyBill'     => $intOrNull($r['monthly_bill']),
        'roofSpace'       => $r['roof_space'],
        'mainGoal'        => $r['main_goal'],
        'powerCuts'       => $r['power_cuts'],
        'installWhen'     => $r['install_when'],
        'payment'         => $r['payment'],
        'systemKw'        => $floatOrNull($r['system_kw']),
        'panels'          => $intOrNull($r['panels']),
        'totalCost'       => $intOrNull($r['total_cost']),
        'subsidy'         => $intOrNull($r['subsidy']),
        'investment'      => $intOrNull($r['investment']),
        'monthlySaving'   => $intOrNull($r['monthly_saving']),
        'savings25y'      => $intOrNull($r['savings_25y']),
        'paybackYears'    => $floatOrNull($r['payback_years']),
        'consultation'    => $r['consultation'],
        'consultDate'     => $r['consult_date'],
        'consultTime'     => $r['consult_time'],
        'bookingId'       => $r['booking_id'],
        'score'           => (int) $r['score'],
        'temperature'     => $r['temperature'],
        'status'          => $r['status'] ?: 'New',
        'appStatus'       => $r['app_status'],          // null = never started "Apply now"
        'appSubmittedAt'  => $iso($r['app_submitted_at']),
        'docCount'        => (int) $r['doc_count'],
        'createdAt'       => $iso($r['created_at']),
        'updatedAt'       => $iso($r['updated_at']),
    ];
}, $rows);

echo json_encode($out);
