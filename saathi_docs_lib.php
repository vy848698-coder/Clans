<?php
/**
 * saathi_docs_lib.php — shared by the Solar Saathi application endpoints:
 * the document list, the tables, the private storage folder and the
 * owner-login check. Include after db.php ($pdo).
 *
 * Documents are stored OUTSIDE the web root (SAATHI_DOCS_DIR, default: the
 * folder next to public_html), under random file names, so no URL can reach
 * them. They are served only by saathi_document_file.php to a logged-in owner.
 */

if (is_file(__DIR__ . '/saathi-config.php')) require_once __DIR__ . '/saathi-config.php';
if (!defined('SAATHI_DOCS_DIR')) define('SAATHI_DOCS_DIR', getenv('SAATHI_DOCS_DIR') ?: dirname(__DIR__) . '/saathi_docs');

// Every application needs all of these (client's decision, Nov 2026).
// [label, minimum files, maximum files]
const SAATHI_DOCS = [
    'bill'    => ['Latest electricity bill', 1, 1],
    'aadhaar' => ['Aadhaar card (masked)', 1, 1],
    'pan'     => ['PAN card', 1, 1],
    'bank'    => ['Bank passbook / cancelled cheque', 1, 1],
    'ror'     => ['ROR / land ownership document', 1, 1],
    'roof'    => ['Rooftop photographs', 2, 4],
];
const SAATHI_DOC_TYPES = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];
const SAATHI_DOC_MAX_BYTES = 5 * 1024 * 1024;
// Application status, in order. "Applied" = filed on the PM Surya Ghar portal.
const SAATHI_APP_STATUSES = ['Draft', 'Submitted', 'Verified', 'Applied', 'Installed', 'Closed'];
const SAATHI_DOC_STATUSES = ['Received', 'Verified', 'Re-upload'];
// Documents of customers who don't go ahead are deleted after this long.
const SAATHI_RETENTION_MONTHS = 6;

function saathi_docs_tables(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    $pdo->exec("CREATE TABLE IF NOT EXISTS saathi_applications (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        journey_id      VARCHAR(32)  NOT NULL,
        status          VARCHAR(20)  NOT NULL DEFAULT 'Draft',
        discom          VARCHAR(80)  NOT NULL DEFAULT '',
        consumer_no     VARCHAR(30)  NOT NULL DEFAULT '',
        name_on_bill    VARCHAR(120) NOT NULL DEFAULT '',
        language        VARCHAR(20)  NOT NULL DEFAULT '',
        consent_version VARCHAR(30)  NOT NULL DEFAULT '',
        consent_text    TEXT         NULL,       -- exactly what the customer agreed to
        consent_at      DATETIME     NULL,
        consent_ip      VARCHAR(45)  NOT NULL DEFAULT '',
        consent_ua      VARCHAR(255) NOT NULL DEFAULT '',
        submitted_at    DATETIME     NULL,
        created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_app_journey (journey_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS saathi_documents (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        journey_id    VARCHAR(32)  NOT NULL,
        doc_type      VARCHAR(20)  NOT NULL,
        original_name VARCHAR(160) NOT NULL DEFAULT '',
        stored_name   VARCHAR(80)  NOT NULL,
        mime          VARCHAR(40)  NOT NULL,
        size_bytes    INT          NOT NULL,
        sha256        CHAR(64)     NOT NULL,
        status        VARCHAR(20)  NOT NULL DEFAULT 'Received',
        note          VARCHAR(255) NOT NULL DEFAULT '',
        uploaded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_doc_journey (journey_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    // Who opened which document, and when (security log).
    $pdo->exec("CREATE TABLE IF NOT EXISTS saathi_document_access (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT          NOT NULL,
        journey_id  VARCHAR(32)  NOT NULL,
        doc_type    VARCHAR(20)  NOT NULL,
        viewer      VARCHAR(150) NOT NULL,
        action      VARCHAR(20)  NOT NULL,
        ip          VARCHAR(45)  NOT NULL DEFAULT '',
        at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_access_doc (document_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $done = true;
}

// The private folder for one application (created on first upload).
function saathi_docs_dir(string $journey): string {
    $base = rtrim(SAATHI_DOCS_DIR, '/\\');
    if (!is_dir($base)) {
        @mkdir($base, 0750, true);
        // Belt and braces, in case the folder ever ends up inside the web root.
        @file_put_contents("$base/.htaccess", "Require all denied\nDeny from all\n");
        @file_put_contents("$base/index.html", '');
    }
    $dir = "$base/$journey";
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    return $dir;
}

function saathi_doc_path(string $journey, string $stored): string {
    return rtrim(SAATHI_DOCS_DIR, '/\\') . "/$journey/$stored";
}

// Deletes the files and rows of some documents (by row).
function saathi_delete_docs(PDO $pdo, array $docs): int {
    $n = 0;
    foreach ($docs as $d) {
        $path = saathi_doc_path($d['journey_id'], $d['stored_name']);
        if (is_file($path)) @unlink($path);
        $pdo->prepare('DELETE FROM saathi_documents WHERE id = ?')->execute([$d['id']]);
        $n++;
    }
    return $n;
}

// Documents are customer ID and bank papers: only a logged-in owner (real
// login token), never the shared X-Admin-Key that ships in the dashboard.
function require_owner_login(): array {
    require_once __DIR__ . '/auth_lib.php';
    $who = verify_token(bearer_token());
    if ($who === null) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Please sign in to the dashboard again.']);
        exit;
    }
    return $who;
}

// Each document as the dashboard and the chatbot see it.
function saathi_doc_json(array $d): array {
    return [
        'id'       => (int) $d['id'],
        'type'     => $d['doc_type'],
        'name'     => $d['original_name'],
        'mime'     => $d['mime'],
        'size'     => (int) $d['size_bytes'],
        'status'   => $d['status'],
        'note'     => $d['note'],
        'uploaded' => $d['uploaded_at'],
    ];
}

// Which required documents are still missing: ['roof' => 1, ...] (files short).
function saathi_missing_docs(PDO $pdo, string $journey): array {
    $st = $pdo->prepare("SELECT doc_type, COUNT(*) n FROM saathi_documents WHERE journey_id = ? AND status <> 'Re-upload' GROUP BY doc_type");
    $st->execute([$journey]);
    $have = $st->fetchAll(PDO::FETCH_KEY_PAIR);
    $missing = [];
    foreach (SAATHI_DOCS as $type => [, $min]) {
        $short = $min - (int) ($have[$type] ?? 0);
        if ($short > 0) $missing[$type] = $short;
    }
    return $missing;
}
