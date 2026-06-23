<?php
/**
 * Database connection (shared).
 *
 * In production (e.g. Railway MySQL), set these environment variables on the host:
 *   MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
 * Locally (XAMPP) none are set, so it falls back to the defaults below
 * (host=localhost, user=root, empty password, db=clansmachina).
 */
$DB_HOST = getenv('MYSQLHOST')     ?: 'localhost';
$DB_PORT = getenv('MYSQLPORT')     ?: '3306';
$DB_USER = getenv('MYSQLUSER')     ?: 'root';
$DB_PASS = getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : '';
$DB_NAME = getenv('MYSQLDATABASE') ?: 'clansmachina';

// Admin dashboard login.
// Password is stored as a bcrypt hash, never plain text.
// To change the password, run on the command line:
//   C:\xampp\php\php.exe -r "echo password_hash('YOUR_NEW_PASSWORD', PASSWORD_DEFAULT);"
// then paste the output below into ADMIN_PASS_HASH.
define('ADMIN_USER', 'Vivek');
define('ADMIN_PASS_HASH', '$2y$10$duVYYUwumwQj1DIT1ra4GO5xuB3p3U1uQuaX/oZ7PW90gceImYonO');

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    // Return JSON so AJAX callers (e.g. the contact form) can show a real
    // message instead of failing to parse plain text as a "network error".
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'message' => 'Database connection failed. Please try again later.']);
    exit;
}

/**
 * Send CORS headers allowing the admin dashboard to call our JSON endpoints.
 *
 * The allowed origin comes from the DASHBOARD_ORIGIN env var in production
 * (e.g. "https://your-app.vercel.app"); locally it defaults to the Next.js dev
 * server. Call this at the top of every *_api.php / get_*.php / update_*.php.
 */
function send_cors_headers(): void {
    $origin = getenv('DASHBOARD_ORIGIN') ?: 'http://localhost:3000';
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Content-Type: application/json; charset=utf-8");
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * All blog categories, ordered. Single source of truth for the upload form
 * checkboxes and the public "Browse by Category" sidebar.
 * Returns rows: ['slug' => ..., 'name' => ...].
 */
function get_categories(PDO $pdo): array {
    return $pdo->query('SELECT slug, name FROM categories ORDER BY sort_order, name')->fetchAll();
}

/**
 * Sanitize rich-text HTML from the blog editor: keep only a safe whitelist of
 * tags and attributes, strip scripts/styles/event handlers and javascript: URLs.
 */
function sanitize_html(string $html): string {
    $html = trim($html);
    if ($html === '') return '';

    $allowedTags = ['p','br','strong','b','em','i','u','h2','h3','blockquote','ul','ol','li','a','span'];
    $allowedAttrs = ['href', 'target', 'rel'];

    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    // Force UTF-8 via a meta tag; DOMDocument wraps the rest in <html><body>.
    $doc->loadHTML(
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><div id="__root">' . $html . '</div>'
    );
    libxml_clear_errors();

    $xpath = new DOMXPath($doc);
    foreach (iterator_to_array($xpath->query('//div[@id="__root"]//*')) as $node) {
        $tag = strtolower($node->nodeName);
        if (!in_array($tag, $allowedTags, true) && $tag !== 'div') {
            // Unwrap unknown tags: replace the node with its text content.
            $node->parentNode->replaceChild($doc->createTextNode($node->textContent), $node);
            continue;
        }
        // Strip disallowed attributes.
        if ($node->attributes) {
            foreach (iterator_to_array($node->attributes) as $attr) {
                $name = strtolower($attr->nodeName);
                if (!in_array($name, $allowedAttrs, true)) {
                    $node->removeAttribute($attr->nodeName);
                } elseif ($name === 'href') {
                    $val = trim($attr->nodeValue);
                    if (preg_match('/^\s*javascript:/i', $val)) {
                        $node->removeAttribute('href');
                    }
                }
            }
            // Force safe external links.
            if ($tag === 'a' && $node->getAttribute('href')) {
                $node->setAttribute('target', '_blank');
                $node->setAttribute('rel', 'noopener noreferrer');
            }
        }
    }

    $rootNodes = $xpath->query('//div[@id="__root"]');
    $out = '';
    if ($rootNodes->length) {
        foreach ($rootNodes->item(0)->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }
    }
    return trim($out);
}
