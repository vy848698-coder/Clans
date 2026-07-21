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
    header("Access-Control-Allow-Headers: Content-Type, X-Admin-Key, Authorization");
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

    $allowedTags = ['p','br','strong','b','em','i','u','h2','h3','h4','hr','blockquote','ul','ol','li','a','span',
                    'table','thead','tbody','tr','th','td','code','pre','mark'];
    $allowedAttrs = ['href', 'target', 'rel', 'colspan', 'rowspan'];

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

/**
 * Human-readable message for a PHP $_FILES upload error code, so an over-limit
 * or interrupted upload is reported instead of silently ignored.
 */
function upload_error_message(int $code): string {
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'The image is too large to upload. Please choose a smaller file.';
        case UPLOAD_ERR_PARTIAL:
            return 'The image upload was interrupted. Please try again.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Server is missing its temporary upload folder. Contact the site admin.';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Server could not save the uploaded file to disk.';
        case UPLOAD_ERR_EXTENSION:
            return 'A server extension blocked the upload.';
        default:
            return 'Image upload failed (error code ' . $code . ').';
    }
}

/**
 * Build a compact base64 data URL for a blog cover image.
 *
 * The image is downscaled to a sane max width and recompressed so the stored
 * string stays small — this keeps pages fast AND keeps the row comfortably
 * under MySQL's max_allowed_packet (a large raw base64 image is exactly what
 * makes the UPDATE/INSERT fail, so covers silently "don't update"). Storage is
 * inline (data URL) by design so images survive host redeploys / DB imports.
 *
 * Uses GD when available; falls back to the raw bytes (with a hard size guard)
 * when it isn't. Returns the data URL, or null with $err populated.
 */
function make_cover_data_url(string $tmpPath, string $mime, ?string &$err = null): ?string {
    $MAX_W        = 1600;          // downscale anything wider than this
    $TARGET_BYTES = 800 * 1024;    // aim for <=800 KB encoded (~1.05 MB base64)

    if (function_exists('imagecreatetruecolor') && function_exists('imagecreatefromstring')) {
        $raw = @file_get_contents($tmpPath);
        $src = $raw !== false ? @imagecreatefromstring($raw) : false;
        if ($src !== false) {
            $w = imagesx($src);
            $h = imagesy($src);
            $scale = $w > $MAX_W ? $MAX_W / $w : 1.0;
            $nw = max(1, (int)round($w * $scale));
            $nh = max(1, (int)round($h * $scale));

            // Flatten onto a white canvas so transparent PNGs don't turn black.
            $dst = imagecreatetruecolor($nw, $nh);
            $white = imagecolorallocate($dst, 255, 255, 255);
            imagefilledrectangle($dst, 0, 0, $nw, $nh, $white);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($src);

            // Recompress, stepping quality down until under the size target.
            $quality = 82;
            $bytes = '';
            do {
                ob_start();
                imagejpeg($dst, null, $quality);
                $bytes = ob_get_clean();
                $quality -= 12;
            } while (strlen($bytes) > $TARGET_BYTES && $quality >= 40);
            imagedestroy($dst);

            if ($bytes !== '' && $bytes !== false) {
                return 'data:image/jpeg;base64,' . base64_encode($bytes);
            }
        }
        // If decoding/encoding failed, fall through to the raw path.
    }

    // No GD (or GD failed): store the original bytes, but refuse anything that
    // would blow past the packet limit so we fail loudly, not silently.
    $bytes = @file_get_contents($tmpPath);
    if ($bytes === false) {
        $err = 'Could not read the uploaded image.';
        return null;
    }
    if (strlen($bytes) > $TARGET_BYTES) {
        $err = 'This image is too large to store on the current server setup. '
             . 'Please upload one under ~700 KB (image compression is not enabled here).';
        return null;
    }
    return 'data:' . $mime . ';base64,' . base64_encode($bytes);
}
