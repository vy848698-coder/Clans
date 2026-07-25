<?php
/**
 * HTML email templates for the Partnership application flow.
 * Uses the shared brand shell in email-templates.php. Required by
 * submit-partnership.php; also included by preview scripts.
 */

require_once __DIR__ . '/email-templates.php';

/** Owner notification email. */
function partner_owner_email(string $name, string $mobile, string $email, string $state, string $profession, string $investment, string $waNumber): string {
    $rows = email_row('Name', $name)
          . email_row('Mobile No.', '+91 ' . $mobile)
          . email_row('Email', $email)
          . email_row('State', $state)
          . email_row('Profession', $profession)
          . email_row('Investment', $investment)
          . email_row('Received', date('d M Y, h:i A'));

    $mobileE = e($mobile);
    $emailE  = e($email);
    $waE     = e($waNumber);

    $inner = <<<HTML
<p style="margin:0 0 18px;">You've received a <b>new partner application</b>. Here are the details:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6efe9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
  {$rows}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;"><tr>
  <td style="padding:0 6px;"><a href="tel:+91{$mobileE}" style="display:inline-block;background:#0f6f47;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">📞 Call</a></td>
  <td style="padding:0 6px;"><a href="https://wa.me/{$waE}" style="display:inline-block;background:#25d366;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">💬 WhatsApp</a></td>
  <td style="padding:0 6px;"><a href="mailto:{$emailE}" style="display:inline-block;background:#14507a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">✉️ Email</a></td>
</tr></table>
<p style="margin:18px 0 4px;color:#8a978f;font-size:12px;">This application was also saved to your admin dashboard.</p>
HTML;

    return email_shell(
        'New partner application from ' . $name,
        'New Application',
        'New Partnership Application',
        $inner
    );
}

/** Applicant auto-reply email. */
function partner_autoreply_email(string $name, string $state, string $profession, string $investment): string {
    $rows = email_row('State', $state)
          . email_row('Profession', $profession)
          . email_row('Investment', $investment);

    $safeName = e($name);

    $inner = <<<HTML
<p style="margin:0 0 14px;">Dear <b>{$safeName}</b>,</p>
<p style="margin:0 0 16px;">Thank you for applying to become a partner with <b>Clans Machina Solar</b> — one of India's fastest-growing rooftop solar brands. We're excited about the possibility of working together! 🌞</p>
<p style="margin:0 0 10px;">Here's a summary of what you submitted:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6efe9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
  {$rows}
</table>

<div style="background:#f4faf7;border:1px solid #e0efe7;border-radius:12px;padding:20px 22px;margin-bottom:24px;">
  <div style="font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#0f6f47;margin-bottom:14px;">What happens next</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="vertical-align:top;width:34px;padding:0 0 12px;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">1</span></td>
        <td style="padding:0 0 12px;font-size:14px;color:#334b40;"><b>Review</b> — our partnership team reviews your application.</td></tr>
    <tr><td style="vertical-align:top;width:34px;padding:0 0 12px;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">2</span></td>
        <td style="padding:0 0 12px;font-size:14px;color:#334b40;"><b>Discovery call</b> — we'll reach out within <b>2 business hours</b> to understand your goals.</td></tr>
    <tr><td style="vertical-align:top;width:34px;padding:0;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">3</span></td>
        <td style="padding:0;font-size:14px;color:#334b40;"><b>Onboarding &amp; training</b> — get certified and start earning.</td></tr>
  </table>
</div>

<p style="margin:0 0 6px;">Have a question in the meantime? We're here to help:</p>
<p style="margin:0 0 4px;font-size:14px;">📞 Call / WhatsApp: <b>+91 91241 65341</b></p>
<p style="margin:0 0 4px;font-size:14px;">📞 Toll-Free: <b>1800 891 3731</b></p>
<p style="margin:0 0 18px;font-size:14px;">✉️ Email: <b>info@clansmachina.in</b></p>

<p style="margin:0 0 4px;">Warm regards,</p>
<p style="margin:0 0 18px;"><b>Team Clans Machina Solar</b></p>
<p style="margin:0;color:#8a978f;font-size:12px;">This is an automated confirmation of your partnership application. If you didn't submit this, please ignore this email.</p>
HTML;

    return email_shell(
        'Thanks ' . $name . ' — we received your partnership application.',
        'Application Received',
        'Application Received 🎉',
        $inner
    );
}
