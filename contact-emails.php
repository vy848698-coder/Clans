<?php
/**
 * HTML email templates for the Contact form and the Careers form (both post to
 * submit-contact.php). A career application is detected by the `service` value
 * starting with "Career Application". Uses the shared brand shell in
 * email-templates.php.
 */

require_once __DIR__ . '/email-templates.php';

/**
 * Owner notification email for a contact/careers submission.
 *
 * @param array $files list of ['name'=>..., 'link'=>...] attached resume files (careers only).
 */
function contact_owner_email(
    string $name, string $phone, string $email, string $city,
    string $service, string $bill, string $message, string $waNumber,
    bool $isCareer, array $files = []
): string {
    $rows = email_row('Name', $name)
          . email_row('Phone', '+91 ' . $phone)
          . email_row('Email', $email !== '' ? $email : '—')
          . email_row('City', $city !== '' ? $city : '—');

    if ($isCareer) {
        $role = trim(preg_replace('/^Career Application\s*[—-]\s*/u', '', $service));
        $exp  = trim(preg_replace('/^Experience:\s*/u', '', $bill));
        $rows .= email_row('Applying for', $role !== '' ? $role : '—');
        $rows .= email_row('Experience', $exp !== '' ? $exp : '—');
    } else {
        if ($service !== '') $rows .= email_row('Interested in', $service);
        if ($bill !== '')    $rows .= email_row('Monthly bill', $bill);
    }
    $rows .= email_row('Received', date('d M Y, h:i A'));

    $messageBlock = '';
    if ($message !== '') {
        $messageBlock =
            '<div style="margin:0 0 24px;"><div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#5b7a6b;font-weight:700;margin-bottom:6px;">Message</div>'
          . '<div style="background:#f4faf7;border:1px solid #e6efe9;border-radius:10px;padding:14px 16px;font-size:14px;color:#334b40;line-height:1.6;white-space:pre-wrap;">'
          . nl2br(e($message)) . '</div></div>';
    }

    $filesBlock = '';
    if ($files) {
        $items = '';
        foreach ($files as $f) {
            $items .= '<li style="margin:0 0 4px;">📎 ' . e($f['name']) . '</li>';
        }
        $filesBlock =
            '<div style="margin:0 0 22px;font-size:13px;color:#334b40;"><b>Attachments (' . count($files) . '):</b>'
          . '<ul style="margin:8px 0 0;padding-left:18px;">' . $items . '</ul>'
          . '<div style="color:#8a978f;font-size:12px;margin-top:6px;">Files are attached to this email and saved on the server.</div></div>';
    }

    $phoneE = e($phone);
    $emailE = e($email);
    $waE    = e($waNumber);

    // Popup leads carry no email address, so drop the mailto button for them
    // rather than rendering one that opens an empty compose window.
    $emailBtn = $email === '' ? '' :
        '<td style="padding:0 6px;"><a href="mailto:' . $emailE . '" style="display:inline-block;background:#14507a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">&#9993;&#65039; Email</a></td>';

    $badge   = $isCareer ? 'New Application' : 'New Inquiry';
    $heading = $isCareer ? 'New Career Application' : 'New Solar Inquiry';

    $inner = <<<HTML
<p style="margin:0 0 18px;">You've received a <b>{$badge}</b>. Here are the details:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6efe9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
  {$rows}
</table>
{$messageBlock}
{$filesBlock}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;"><tr>
  <td style="padding:0 6px;"><a href="tel:+91{$phoneE}" style="display:inline-block;background:#0f6f47;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">📞 Call</a></td>
  <td style="padding:0 6px;"><a href="https://wa.me/{$waE}" style="display:inline-block;background:#25d366;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">💬 WhatsApp</a></td>
  {$emailBtn}
</tr></table>
<p style="margin:18px 0 4px;color:#8a978f;font-size:12px;">This submission was also saved to your admin dashboard.</p>
HTML;

    return email_shell(
        ($isCareer ? 'New career application from ' : 'New solar inquiry from ') . $name,
        $badge,
        $heading,
        $inner
    );
}

/** Auto-reply email to the person who submitted the contact/careers form. */
function contact_autoreply_email(string $name, bool $isCareer): string {
    $safeName = e($name);

    if ($isCareer) {
        $badge   = 'Application Received';
        $heading = 'Application Received 🎉';
        $lead    = 'Thank you for applying to join <b>Clans Machina Solar</b>. We\'re glad you want to help power India\'s clean-energy switch! 🌞';
        $steps   = <<<HTML
    <tr><td style="vertical-align:top;width:34px;padding:0 0 12px;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">1</span></td>
        <td style="padding:0 0 12px;font-size:14px;color:#334b40;"><b>Review</b> — our HR team reviews your application and resume.</td></tr>
    <tr><td style="vertical-align:top;width:34px;padding:0 0 12px;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">2</span></td>
        <td style="padding:0 0 12px;font-size:14px;color:#334b40;"><b>Shortlisting</b> — if there's a fit, we'll reach out to schedule a conversation.</td></tr>
    <tr><td style="vertical-align:top;width:34px;padding:0;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">3</span></td>
        <td style="padding:0;font-size:14px;color:#334b40;"><b>Interview</b> — meet the team and find your role.</td></tr>
HTML;
        $closing = 'This is an automated confirmation of your job application. If you didn\'t apply, please ignore this email.';
    } else {
        $badge   = 'We received your request';
        $heading = 'Thanks — We\'ll Be In Touch 🌞';
        $lead    = 'Thank you for reaching out to <b>Clans Machina Solar</b>. Your request has been received and our solar team is already on it!';
        $steps   = <<<HTML
    <tr><td style="vertical-align:top;width:34px;padding:0 0 12px;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">1</span></td>
        <td style="padding:0 0 12px;font-size:14px;color:#334b40;"><b>Callback within 2 hours</b> — a solar expert will call to understand your needs.</td></tr>
    <tr><td style="vertical-align:top;width:34px;padding:0 0 12px;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">2</span></td>
        <td style="padding:0 0 12px;font-size:14px;color:#334b40;"><b>Free site survey</b> — we assess your roof, shading and DISCOM tariff.</td></tr>
    <tr><td style="vertical-align:top;width:34px;padding:0;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0f6f47;color:#fff;font-weight:800;font-size:13px;">3</span></td>
        <td style="padding:0;font-size:14px;color:#334b40;"><b>Tailored proposal</b> — savings estimate, subsidy band and timeline.</td></tr>
HTML;
        $closing = 'This is an automated confirmation of your enquiry. If you didn\'t contact us, please ignore this email.';
    }

    $inner = <<<HTML
<p style="margin:0 0 14px;">Dear <b>{$safeName}</b>,</p>
<p style="margin:0 0 22px;">{$lead}</p>

<div style="background:#f4faf7;border:1px solid #e0efe7;border-radius:12px;padding:20px 22px;margin-bottom:24px;">
  <div style="font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#0f6f47;margin-bottom:14px;">What happens next</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    {$steps}
  </table>
</div>

<p style="margin:0 0 6px;">Need us sooner? We're here to help:</p>
<p style="margin:0 0 4px;font-size:14px;">📞 Call / WhatsApp: <b>+91 91241 65341</b></p>
<p style="margin:0 0 4px;font-size:14px;">📞 Toll-Free: <b>1800 891 3731</b></p>
<p style="margin:0 0 18px;font-size:14px;">✉️ Email: <b>info@clansmachina.in</b></p>

<p style="margin:0 0 4px;">Warm regards,</p>
<p style="margin:0 0 18px;"><b>Team Clans Machina Solar</b></p>
<p style="margin:0;color:#8a978f;font-size:12px;">{$closing}</p>
HTML;

    return email_shell(
        'Thanks ' . $name . ' — we received your request.',
        $badge,
        $heading,
        $inner
    );
}
