<?php
/**
 * get_inquiries.php — returns all inquiries as JSON for the admin dashboard.
 *
 * SETUP:
 *   1. Copy this file into your website folder in htdocs, next to submit.php
 *      e.g. C:/xampp/htdocs/clans-machina/get_inquiries.php
 *   2. Edit the 4 DB settings below to match your database.
 *   3. Edit the column names in the SELECT/mapping if your table differs.
 *   4. Test it in the browser: http://localhost/clans-machina/get_inquiries.php
 *      You should see a JSON array of your inquiries.
 */

// --- CORS: allow the Next.js dashboard (different port) to read this ---------
// Origin is configurable via DASHBOARD_ORIGIN env var; defaults to the dev server.
$ALLOWED_ORIGIN = getenv('DASHBOARD_ORIGIN') ?: 'http://localhost:3000';
header("Access-Control-Allow-Origin: $ALLOWED_ORIGIN");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Key, Authorization");
header("Content-Type: application/json; charset=utf-8");

// Preflight request (browsers send OPTIONS before the GET)
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// This returns customer PII (name, phone, email) — require the shared admin key.
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

// --- Query — matches the `leads` table ---------------------------------------
$sql = "SELECT id, name, phone, email, city, service, bill, message, status, created_at
        FROM leads
        ORDER BY created_at DESC";

$result = $conn->query($sql);
if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "Query failed: " . $conn->error]);
    exit;
}

// --- Shape the rows to match what the dashboard expects ---------------------
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id"          => (int) $r["id"],
        "fullName"    => $r["name"],
        "phone"       => $r["phone"],
        "email"       => $r["email"],
        "city"        => $r["city"],
        "serviceType" => $r["service"],
        "monthlyBill" => $r["bill"],
        "message"     => $r["message"],
        "status"      => $r["status"] ?: "New",
        "date"        => $r["created_at"],
    ];
}

echo json_encode($rows);
$conn->close();
