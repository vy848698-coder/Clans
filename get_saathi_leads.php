<?php
/**
 * get_saathi_leads.php — returns every Solar Saathi chatbot lead (the
 * `saathi_leads` table) as JSON for the admin dashboard.
 *
 * The chatbot writes one row per conversation (unique `journey_id`) and keeps
 * updating it as the visitor moves through the stages, so `updated_at` changes
 * as well as `created_at`. The dashboard polls this endpoint every few seconds.
 *
 * SETUP:
 *   1. Copy this file into the site folder next to api_guard.php
 *      e.g. C:/xampp/htdocs/Clans/get_saathi_leads.php
 *   2. Test: http://localhost/Clans/get_saathi_leads.php should return
 *      {"error":"Unauthorized"} without the X-Admin-Key header (that's correct).
 */

// --- CORS --------------------------------------------------------------------
$ALLOWED_ORIGIN = getenv('DASHBOARD_ORIGIN') ?: 'http://localhost:3000';
header("Access-Control-Allow-Origin: $ALLOWED_ORIGIN");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Key, Authorization");
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// Customer PII (name, mobile, email, address) — require the admin key.
require __DIR__ . '/api_guard.php';
require_api_key();

// --- Database connection ----------------------------------------------------
// Reads Railway's env vars in production; falls back to local XAMPP defaults.
$DB_HOST = getenv('MYSQLHOST')     ?: "localhost";
$DB_PORT = (int)(getenv('MYSQLPORT') ?: 3306);
$DB_USER = getenv('MYSQLUSER')     ?: "root";
$DB_PASS = getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : "";
$DB_NAME = getenv('MYSQLDATABASE') ?: "clansmachina";

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

// --- Query -------------------------------------------------------------------
$result = $conn->query("SELECT * FROM saathi_leads ORDER BY created_at DESC, id DESC");
if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "Query failed: " . $conn->error]);
    exit;
}

// DATETIME columns carry no timezone. Tag them with the DB server's UTC offset
// so the browser converts correctly (Railway MySQL runs in UTC, the viewer
// doesn't) — otherwise brand-new leads show up as "5h ago".
$tz = $conn->query("SELECT TIME_FORMAT(TIMEDIFF(NOW(), UTC_TIMESTAMP()), '%H:%i') AS o");
$offset = $tz ? $tz->fetch_assoc()["o"] : "00:00";
$TZ_SUFFIX = ($offset[0] === "-" ? "" : "+") . $offset;

// --- Shape the rows for the dashboard (camelCase, typed numbers) -------------
function int_or_null($v) { return $v === null || $v === "" ? null : (int) $v; }
function float_or_null($v) { return $v === null || $v === "" ? null : (float) $v; }
// "2026-10-09 05:01:08" → "2026-10-09T05:01:08+00:00" so every browser parses it.
function iso($v) { global $TZ_SUFFIX; return $v ? str_replace(" ", "T", $v) . $TZ_SUFFIX : null; }

$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id"              => (int) $r["id"],
        "journeyId"       => $r["journey_id"],
        "stage"           => $r["stage"],
        "name"            => $r["name"],
        "mobile"          => $r["mobile"],
        "mobileVerified"  => (bool) $r["mobile_verified"],
        "email"           => $r["email"],
        "emailVerified"   => (bool) $r["email_verified"],
        "language"        => $r["language"],
        "pinCode"         => $r["pin_code"],
        "area"            => $r["area"],
        "district"        => $r["district"],
        "state"           => $r["state"],
        "ownership"       => $r["ownership"],
        "ownerPermission" => $r["owner_permission"],
        "propertyType"    => $r["property_type"],
        "panelsOn"        => $r["panels_on"],
        "monthlyBill"     => int_or_null($r["monthly_bill"]),
        "roofSpace"       => $r["roof_space"],
        "mainGoal"        => $r["main_goal"],
        "powerCuts"       => $r["power_cuts"],
        "installWhen"     => $r["install_when"],
        "payment"         => $r["payment"],
        "systemKw"        => float_or_null($r["system_kw"]),
        "panels"          => int_or_null($r["panels"]),
        "totalCost"       => int_or_null($r["total_cost"]),
        "subsidy"         => int_or_null($r["subsidy"]),
        "investment"      => int_or_null($r["investment"]),
        "monthlySaving"   => int_or_null($r["monthly_saving"]),
        "savings25y"      => int_or_null($r["savings_25y"]),
        "paybackYears"    => float_or_null($r["payback_years"]),
        "consultation"    => $r["consultation"],
        "consultDate"     => $r["consult_date"],
        "consultTime"     => $r["consult_time"],
        "bookingId"       => $r["booking_id"],
        "score"           => (int) $r["score"],
        "temperature"     => $r["temperature"],
        "status"          => $r["status"] ?: "New",
        "createdAt"       => iso($r["created_at"]),
        "updatedAt"       => iso($r["updated_at"]),
    ];
}

echo json_encode($rows);
$conn->close();
