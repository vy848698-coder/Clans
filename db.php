<?php
/**
 * Database connection (shared).
 * XAMPP default: host=localhost, user=root, password='' (empty).
 * Change these if you set a MySQL password.
 */
$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'clansmachina';

// Admin dashboard login.
// Password is stored as a bcrypt hash, never plain text.
// To change the password, run on the command line:
//   C:\xampp\php\php.exe -r "echo password_hash('YOUR_NEW_PASSWORD', PASSWORD_DEFAULT);"
// then paste the output below into ADMIN_PASS_HASH.
define('ADMIN_USER', 'Vivek');
define('ADMIN_PASS_HASH', '$2y$10$duVYYUwumwQj1DIT1ra4GO5xuB3p3U1uQuaX/oZ7PW90gceImYonO');

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die('Database connection failed: ' . $e->getMessage());
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
