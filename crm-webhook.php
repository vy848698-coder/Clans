<?php
/**
 * crm-webhook.php — sends a copy of each website lead to the Aivoryx CRM's
 * inbound lead webhook. Best-effort: the lead is already saved and emailed by
 * the caller, so any failure here (not configured, timeout, CRM down, non-200)
 * is logged with error_log() and otherwise ignored.
 *
 * Settings: CRM_WEBHOOK_URL and CRM_WEBHOOK_SECRET, from environment variables
 * or saathi-config.php (git-ignored; template in saathi-config.example.php).
 * Left empty, nothing is sent.
 */

if (is_file(__DIR__ . '/saathi-config.php')) {
    require_once __DIR__ . '/saathi-config.php';
}
if (!defined('CRM_WEBHOOK_URL'))    define('CRM_WEBHOOK_URL', getenv('CRM_WEBHOOK_URL') ?: '');
if (!defined('CRM_WEBHOOK_SECRET')) define('CRM_WEBHOOK_SECRET', getenv('CRM_WEBHOOK_SECRET') ?: '');

/**
 * POSTs $lead as flat JSON with the bearer secret. Empty values are dropped.
 * Keys the CRM maps itself: full_name, phone_number, email_address, city,
 * state, postal_code, country. Any other key is kept as an extra field.
 */
function crm_webhook_send(array $lead): void {
    $url    = CRM_WEBHOOK_URL;
    $secret = CRM_WEBHOOK_SECRET;
    if ($url === '' || $secret === '' || $secret === 'xxxxxxxxxxxxxxxx' || !function_exists('curl_init')) {
        return; // not configured on this server
    }

    try {
        $lead = array_filter($lead, function ($v) { return $v !== null && $v !== ''; });
        $body = json_encode($lead, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($body === false) return;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Authorization: Bearer ' . $secret],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT        => 5,
        ]);
        $res  = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);

        $answer = is_string($res) ? json_decode($res, true) : null;
        if ($code !== 200 || empty($answer['accepted'])) {
            error_log('[crm] lead not accepted: HTTP ' . $code . ($err !== '' ? ' ' . $err : ''));
        }
    } catch (Throwable $e) {
        error_log('[crm] ' . $e->getMessage());
    }
}
