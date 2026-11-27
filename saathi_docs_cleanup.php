<?php
/**
 * saathi_docs_cleanup.php — deletes Solar Saathi documents that are kept
 * longer than promised in the customer consent:
 *
 *   • customers who didn't go ahead (application not Applied/Installed):
 *     every document, SAATHI_RETENTION_MONTHS (6) after the last activity;
 *   • Aadhaar copies of applications already filed (Applied/Installed/Closed).
 *
 * The application row and its consent record stay (proof of consent).
 * Run daily from cPanel → Cron Jobs (command line only):
 *   /usr/local/bin/php /home/<cpanel-user>/public_html/saathi_docs_cleanup.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/db.php';
require __DIR__ . '/saathi_docs_lib.php';
saathi_docs_tables($pdo);

$months = (int) SAATHI_RETENTION_MONTHS;
$stale = $pdo->query("SELECT d.* FROM saathi_documents d
    JOIN saathi_applications a ON a.journey_id = d.journey_id
    WHERE a.status NOT IN ('Applied', 'Installed')
      AND GREATEST(a.updated_at, COALESCE((SELECT MAX(x.uploaded_at) FROM saathi_documents x WHERE x.journey_id = d.journey_id), a.updated_at))
          < (NOW() - INTERVAL $months MONTH)")->fetchAll();
$aadhaar = $pdo->query("SELECT d.* FROM saathi_documents d
    JOIN saathi_applications a ON a.journey_id = d.journey_id
    WHERE d.doc_type = 'aadhaar' AND a.status IN ('Applied', 'Installed', 'Closed')")->fetchAll();
// Files whose application row is gone.
$orphans = $pdo->query('SELECT d.* FROM saathi_documents d
    LEFT JOIN saathi_applications a ON a.journey_id = d.journey_id WHERE a.id IS NULL')->fetchAll();

$n = saathi_delete_docs($pdo, array_merge($stale, $aadhaar, $orphans));
// Remove the empty per-application folders.
foreach (glob(rtrim(SAATHI_DOCS_DIR, '/\\') . '/*', GLOB_ONLYDIR) ?: [] as $dir) {
    if (count(glob("$dir/*") ?: []) === 0) @rmdir($dir);
}
echo date('Y-m-d H:i') . " saathi_docs_cleanup: deleted $n document(s)\n";
