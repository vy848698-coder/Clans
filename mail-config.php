<?php
/**
 * Gmail SMTP settings for emailing solar proposals.
 *
 * SECURITY — use a Gmail **App Password**, never your normal password:
 *   1. Turn on 2-Step Verification for the Google account.
 *      https://myaccount.google.com/security
 *   2. Google Account → Security → App passwords → create one (app: "Mail").
 *   3. Paste the 16-character password into GMAIL_APP_PASSWORD below,
 *      or set the GMAIL_APP_PASSWORD environment variable on the host.
 *
 * Do NOT commit real credentials to git. In production set these as env vars
 * (GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_FROM_NAME, MAIL_SALES_BCC) instead.
 */

// The Gmail address the proposals are sent FROM (also the SMTP username).
define('GMAIL_USER', getenv('GMAIL_USER') ?: 'youraddress@gmail.com');

// 16-char Gmail App Password (spaces optional — they are stripped).
define('GMAIL_APP_PASSWORD', str_replace(' ', '', getenv('GMAIL_APP_PASSWORD') ?: 'xxxxxxxxxxxxxxxx'));

// Friendly "from" name shown in the recipient's inbox.
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Clans Machina Solar');

// Optional: BCC a copy of every proposal to the sales team. '' disables it.
define('MAIL_SALES_BCC', getenv('MAIL_SALES_BCC') ?: '');

/** True once real credentials have been filled in. */
function mail_is_configured(): bool {
    return GMAIL_USER !== 'youraddress@gmail.com'
        && GMAIL_APP_PASSWORD !== 'xxxxxxxxxxxxxxxx'
        && GMAIL_APP_PASSWORD !== '';
}
