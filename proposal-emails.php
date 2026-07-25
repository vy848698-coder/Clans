<?php
/**
 * Owner-notification email for a Solar Calculator proposal lead (send-proposal.php).
 * The customer still receives their own proposal email; this is the internal
 * copy for the owner, with the same PDF attached. Uses the shared brand shell.
 */

require_once __DIR__ . '/email-templates.php';

/** Owner notification for a calculator proposal lead. */
function proposal_owner_email(
    string $name, string $phone, string $email, string $district,
    string $state, string $systemSize, string $bill, string $proposalNo,
    string $waNumber, bool $pdfAttached
): string {
    $rows = email_row('Name', $name)
          . email_row('Phone', '+91 ' . $phone)
          . email_row('Email', $email)
          . email_row('District', $district !== '' ? $district : '—')
          . email_row('State', $state !== '' ? $state : '—')
          . email_row('System size', $systemSize !== '' ? $systemSize . ' kW' : '—')
          . email_row('Monthly bill', $bill !== '' ? $bill : '—')
          . email_row('Proposal no.', $proposalNo !== '' ? $proposalNo : '—')
          . email_row('Received', date('d M Y, h:i A'));

    $phoneE = e($phone);
    $emailE = e($email);
    $waE    = e($waNumber);

    $pdfNote = $pdfAttached
        ? '<p style="margin:0 0 20px;font-size:13px;color:#334b40;">📎 <b>The customer\'s PDF proposal is attached</b> to this email.</p>'
        : '<p style="margin:0 0 20px;font-size:13px;color:#8a978f;">The PDF proposal was not attached (generated on the customer\'s device).</p>';

    $inner = <<<HTML
<p style="margin:0 0 18px;">A visitor generated a proposal with the <b>Solar Savings Calculator</b>. Here are the lead details:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6efe9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
  {$rows}
</table>
{$pdfNote}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;"><tr>
  <td style="padding:0 6px;"><a href="tel:+91{$phoneE}" style="display:inline-block;background:#0f6f47;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">📞 Call</a></td>
  <td style="padding:0 6px;"><a href="https://wa.me/{$waE}" style="display:inline-block;background:#25d366;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">💬 WhatsApp</a></td>
  <td style="padding:0 6px;"><a href="mailto:{$emailE}" style="display:inline-block;background:#14507a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">✉️ Email</a></td>
</tr></table>
<p style="margin:18px 0 4px;color:#8a978f;font-size:12px;">This lead was also saved to your admin dashboard.</p>
HTML;

    return email_shell(
        'New calculator lead from ' . $name . ($proposalNo ? ' (' . $proposalNo . ')' : ''),
        'New Proposal Lead',
        'New Solar Calculator Lead',
        $inner
    );
}
