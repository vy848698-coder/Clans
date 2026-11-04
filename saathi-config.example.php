<?php
/**
 * TEMPLATE — copy this file to `saathi-config.php` and fill in real values.
 * `saathi-config.php` is git-ignored so the secrets are never pushed.
 *
 * Shared secret between the Solar Saathi chatbot (hosted on Vercel) and
 * save_saathi_lead.php. Must be identical to the SAATHI_LEAD_KEY environment
 * variable in the chatbot's Vercel project. Make one with:
 *   php -r "echo bin2hex(random_bytes(32));"
 */
define('SAATHI_LEAD_KEY', getenv('SAATHI_LEAD_KEY') ?: 'xxxxxxxxxxxxxxxx');

/**
 * Aivoryx CRM inbound lead webhook (crm-webhook.php). The contact and
 * partnership forms post a copy of every lead here, best-effort. Both empty
 * = nothing is sent. Use the same values as the chatbot's Vercel variables.
 *   CRM_WEBHOOK_URL    = https://…/api/v1/integrations/webhooks/pabbly/<sourceKey>
 *   CRM_WEBHOOK_SECRET = the bearer secret (sent as "Authorization: Bearer …")
 */
define('CRM_WEBHOOK_URL', getenv('CRM_WEBHOOK_URL') ?: '');
define('CRM_WEBHOOK_SECRET', getenv('CRM_WEBHOOK_SECRET') ?: '');
