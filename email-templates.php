<?php
/**
 * Shared HTML email building blocks used by every lead-capture email
 * (partnership, contact, careers). Table-based layout + inline CSS for maximum
 * email-client compatibility (Gmail, Outlook, Apple Mail, mobile). No external
 * assets. Required by partner-emails.php and contact-emails.php.
 */

if (!function_exists('e')) {
    function e($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
}

/** Shared brand shell: header + card + footer around $innerHtml. */
function email_shell(string $preheader, string $badge, string $heading, string $innerHtml): string {
    $preheader = e($preheader);
    $badge     = e($badge);
    $heading   = e($heading);
    return <<<HTML
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef3f0;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">{$preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f0;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 18px 48px -24px rgba(11,59,40,.45);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0b3b28 0%,#0f6f47 55%,#12885a 100%);padding:34px 36px 30px;">
        <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#a8e6cd;font-weight:700;">Clans Machina Solar</div>
        <div style="display:inline-block;margin-top:14px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);color:#eafff5;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">{$badge}</div>
        <div style="font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;margin-top:14px;">{$heading}</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:30px 36px 8px;color:#12241c;font-size:15px;line-height:1.65;">
        {$innerHtml}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:22px 36px 30px;border-top:1px solid #eef1ee;">
        <div style="font-size:13px;color:#5b6b62;line-height:1.6;">
          <b style="color:#0f6f47;">Clans Machina Solar</b><br>
          DCB-221, DLF Cyber City, Chandaka Industrial Estate, Patia, Bhubaneswar, Odisha - 751024<br>
          📞 +91 91241 65341 &nbsp;·&nbsp; Toll-Free 1800 891 3731 &nbsp;·&nbsp; 🌐 www.clansmachina.in
        </div>
      </td></tr>
    </table>
    <div style="font-size:11px;color:#9aa8a1;margin-top:16px;font-family:'Segoe UI',Arial,sans-serif;">© Clans Machina Solar · Powering India with clean energy</div>
  </td></tr>
</table>
</body></html>
HTML;
}

/** One label/value row for a details table. */
function email_row(string $label, string $value): string {
    $label = e($label);
    $value = e($value);
    return "<tr>
      <td style=\"padding:11px 16px;background:#f4faf7;border-bottom:1px solid #e6efe9;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#5b7a6b;font-weight:700;width:150px;\">{$label}</td>
      <td style=\"padding:11px 16px;border-bottom:1px solid #e6efe9;font-size:15px;color:#12241c;font-weight:600;\">{$value}</td>
    </tr>";
}
