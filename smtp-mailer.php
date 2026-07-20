<?php
/**
 * Minimal, dependency-free SMTP client.
 *
 * Enough to send ONE MIME email (HTML body + optional attachments) through an
 * authenticated STARTTLS SMTP server such as Gmail (smtp.gmail.com:587).
 * No Composer / PHPMailer required — uses PHP's openssl + stream sockets.
 *
 * Throws Exception on any protocol/connection failure so the caller can decide
 * how to report it.
 *
 * @param array $attachments each: ['name'=>string, 'type'=>string, 'data'=>raw bytes]
 */
function smtp_send_mail(
    string $host, int $port, string $user, string $pass,
    string $from, string $fromName, string $to, string $subject,
    string $htmlBody, array $attachments = [], string $bcc = ''
): bool {
    $fp = @stream_socket_client("tcp://$host:$port", $errno, $errstr, 30);
    if (!$fp) {
        throw new Exception("SMTP connect failed: $errstr ($errno)");
    }
    stream_set_timeout($fp, 30);

    // Read a (possibly multi-line) SMTP reply; the final line has a space at [3].
    $read = function () use ($fp): string {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return $data;
    };
    $send = function (string $c) use ($fp): void { fwrite($fp, $c . "\r\n"); };
    $expect = function (string $resp, $codes): void {
        $code = substr($resp, 0, 3);
        if (!in_array($code, (array)$codes, true)) {
            throw new Exception('SMTP error: ' . trim($resp));
        }
    };

    $expect($read(), '220');
    $send("EHLO clansmachina.in");     $expect($read(), '250');
    $send("STARTTLS");                 $expect($read(), '220');
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        throw new Exception('TLS negotiation failed');
    }
    $send("EHLO clansmachina.in");     $expect($read(), '250');
    $send("AUTH LOGIN");               $expect($read(), '334');
    $send(base64_encode($user));       $expect($read(), '334');
    $send(base64_encode($pass));       $expect($read(), '235');
    $send("MAIL FROM:<$from>");        $expect($read(), '250');
    $send("RCPT TO:<$to>");            $expect($read(), ['250', '251']);
    if ($bcc !== '') { $send("RCPT TO:<$bcc>"); $expect($read(), ['250', '251']); }
    $send("DATA");                     $expect($read(), '354');

    $boundary = '=_cm_' . bin2hex(random_bytes(8));
    $headers = [
        'From: ' . mb_encode_mimeheader($fromName) . " <$from>",
        "To: <$to>",
        'Subject: ' . mb_encode_mimeheader($subject),
        'MIME-Version: 1.0',
        'Date: ' . date('r'),
        "Content-Type: multipart/mixed; boundary=\"$boundary\"",
    ];
    $msg = implode("\r\n", $headers) . "\r\n\r\n";

    // HTML body part.
    $msg .= "--$boundary\r\n";
    $msg .= "Content-Type: text/html; charset=UTF-8\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $msg .= chunk_split(base64_encode($htmlBody)) . "\r\n";

    // Attachment parts.
    foreach ($attachments as $att) {
        $name = preg_replace('/[\r\n"]/', '', (string)($att['name'] ?? 'attachment'));
        $type = preg_replace('/[\r\n]/', '', (string)($att['type'] ?? 'application/octet-stream'));
        $msg .= "--$boundary\r\n";
        $msg .= "Content-Type: $type; name=\"$name\"\r\n";
        $msg .= "Content-Transfer-Encoding: base64\r\n";
        $msg .= "Content-Disposition: attachment; filename=\"$name\"\r\n\r\n";
        $msg .= chunk_split(base64_encode($att['data'])) . "\r\n";
    }
    $msg .= "--$boundary--\r\n";

    // Dot-stuffing: any line starting with '.' must be doubled.
    $msg = preg_replace('/^\./m', '..', $msg);

    $send($msg . "\r\n.");             $expect($read(), '250');
    $send("QUIT");
    fclose($fp);
    return true;
}
