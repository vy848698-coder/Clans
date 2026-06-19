<?php
/**
 * update_status.php — updates a lead's status (New / Read / Replied).
 *
 * SETUP:
 *   1. First run this SQL once in phpMyAdmin (adds the status column):
 *        ALTER TABLE leads ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'New';
 *   2. Copy this file into your site folder next to get_inquiries.php.
 *   3. Make sure $DB_NAME below matches.
 *
 * The dashboard POSTs JSON: { "id": 12, "status": "Replied" }
 */

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// --- DB connection ----------------------------------------------------------
$DB_HOST = "localhost";
$DB_USER = "root";
$DB_PASS = "";
$DB_NAME = "clansmachina";

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]);
    exit;
}
$conn->set_charset("utf8mb4");

// --- Read + validate input --------------------------------------------------
$input = json_decode(file_get_contents("php://input"), true);
$id = isset($input["id"]) ? (int) $input["id"] : 0;
$status = isset($input["status"]) ? trim($input["status"]) : "";

$allowed = ["New", "Read", "Replied"];
if ($id <= 0 || !in_array($status, $allowed, true)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid id or status"]);
    exit;
}

// --- Update (prepared statement) --------------------------------------------
$stmt = $conn->prepare("UPDATE leads SET status = ? WHERE id = ?");
$stmt->bind_param("si", $status, $id);

if ($stmt->execute()) {
    echo json_encode(["ok" => true, "id" => $id, "status" => $status]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Update failed: " . $stmt->error]);
}

$stmt->close();
$conn->close();
