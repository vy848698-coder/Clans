<?php
/**
 * TEMPLATE — copy this file to `mail-config.php` and fill in real values.
 * `mail-config.php` is git-ignored so real credentials are never pushed.
 *
 * Company mailbox SMTP settings for emailing solar proposals and lead
 * notifications (e.g. cPanel email: mail.clansmachina.com, SSL port 465).
 *
 * SECURITY — use the mailbox's real login password (cPanel email accounts
 * don't support app passwords the way Gmail does), and never commit it.
 *
 * In production prefer environment variables over editing this file:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM_NAME, MAIL_SALES_BCC.
 */

// Outgoing mail server and port. 465 = implicit SSL/TLS (recommended); 587 = STARTTLS.
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'mail.clansmachina.com');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 465));

// The mailbox address emails are sent FROM (also the SMTP username, and where
// owner notifications land — e.g. info@clansmachina.com).
define('SMTP_USER', getenv('SMTP_USER') ?: 'youraddress@clansmachina.com');

// The mailbox's real password (or set the SMTP_PASSWORD env var on the host).
define('SMTP_PASSWORD', getenv('SMTP_PASSWORD') ?: 'xxxxxxxxxxxxxxxx');

// Friendly "from" name shown in the recipient's inbox.
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Clans Machina Solar');

// Optional: BCC a copy of every proposal to the sales team. '' disables it.
define('MAIL_SALES_BCC', getenv('MAIL_SALES_BCC') ?: '');

/** True once real credentials have been filled in (i.e. no longer the placeholders). */
function mail_is_configured(): bool {
    return SMTP_USER !== 'youraddress@clansmachina.com'
        && SMTP_PASSWORD !== 'xxxxxxxxxxxxxxxx'
        && SMTP_PASSWORD !== '';
}
