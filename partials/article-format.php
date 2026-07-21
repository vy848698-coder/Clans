<?php
/**
 * Automatic blog article formatter.
 *
 * Takes the sanitized body HTML saved from the editor and, at render time,
 * upgrades it into a well-structured, magazine-style article WITHOUT the author
 * having to hand-craft any layout. It:
 *   - adds anchor ids to headings and builds a Table of Contents,
 *   - turns paragraphs that begin with a label ("Note:", "Tip:", "Important:",
 *     "Warning:", "Key Takeaway:", "Example:", "FAQ:") into styled callout cards,
 *     so an author just types naturally and gets highlighted boxes,
 *   - marks the first paragraph as a lead intro,
 *   - wraps tables in a horizontal-scroll container so they never break mobile.
 *
 * Everything here runs on already-sanitized HTML and outputs final markup, so it
 * is safe to add classes/structure. Legacy plain-text posts are paragraph-wrapped
 * by the caller before this runs.
 */

if (!function_exists('af_slugify')) {
    function af_slugify(string $text, array &$seen): string {
        $slug = strtolower(trim($text));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = trim($slug, '-');
        if ($slug === '') $slug = 'section';
        $base = $slug; $n = 2;
        while (isset($seen[$slug])) { $slug = $base . '-' . $n; $n++; }
        $seen[$slug] = true;
        return $slug;
    }
}

if (!function_exists('af_callout_type')) {
    /**
     * Map a leading "Label:" to a callout style. Returns [type, cleanLabel] or null.
     */
    function af_callout_type(string $label): ?array {
        $key = strtolower(trim($label));
        $map = [
            'note'          => ['info',    'Note'],
            'info'          => ['info',    'Good to know'],
            'good to know'  => ['info',    'Good to know'],
            'tip'           => ['tip',     'Tip'],
            'pro tip'       => ['tip',     'Pro tip'],
            'quick tip'     => ['tip',     'Quick tip'],
            'important'     => ['key',     'Important'],
            'key'           => ['key',     'Key point'],
            'key point'     => ['key',     'Key point'],
            'key takeaway'  => ['key',     'Key takeaway'],
            'takeaway'      => ['key',     'Key takeaway'],
            'remember'      => ['key',     'Remember'],
            'warning'       => ['warn',    'Warning'],
            'caution'       => ['warn',    'Caution'],
            'watch out'     => ['warn',    'Watch out'],
            'example'       => ['example', 'Example'],
            'for example'   => ['example', 'For example'],
            'faq'           => ['faq',     'FAQ'],
            'q'             => ['faq',     'Question'],
            'question'      => ['faq',     'Question'],
        ];
        return $map[$key] ?? null;
    }
}

if (!function_exists('af_icon')) {
    function af_icon(string $type): string {
        $icons = [
            'info'    => '&#8505;&#65039;',   // ℹ️
            'tip'     => '&#128161;',         // 💡
            'key'     => '&#127919;',         // 🎯
            'warn'    => '&#9888;&#65039;',   // ⚠️
            'example' => '&#128204;',         // 📌
            'faq'     => '&#10067;',          // ❓
        ];
        return $icons[$type] ?? $icons['info'];
    }
}

if (!function_exists('af_is_junk_line')) {
    /** PDF export artifacts (running headers / page numbers) we drop entirely. */
    function af_is_junk_line(string $line): bool {
        return (bool)preg_match('/^(residential solar guide\b|page\s+\d+\s*$)/i', $line)
            || preg_match('/^page\s+\d+$/i', $line);
    }
}

if (!function_exists('af_render_paragraph')) {
    /**
     * Turn a reflowed paragraph string into a <p>. Known callout labels
     * ("Note:", "Tip:"…) are left intact so enhance_article_html can upgrade
     * them into cards; other short "Label:" lead-ins get bolded for emphasis.
     */
    function af_render_paragraph(string $text): string {
        $text = trim($text);
        if ($text === '') return '';
        if (preg_match('/^([A-Za-z][A-Za-z0-9 &\/\-]{0,39}?):\s+(.+)$/su', $text, $m)) {
            $label = trim($m[1]);
            $rest  = $m[2];
            $words = preg_split('/\s+/', $label);
            // Leave recognised callout labels raw for the card upgrade step.
            if (af_callout_type($label)) {
                return '<p>' . htmlspecialchars($text, ENT_QUOTES) . '</p>';
            }
            // Bold a genuine short lead-in label (≤6 words), not a mid-sentence colon.
            if (count($words) <= 6 && mb_strlen($label) <= 40) {
                return '<p><strong>' . htmlspecialchars($label, ENT_QUOTES) . ':</strong> '
                     . htmlspecialchars($rest, ENT_QUOTES) . '</p>';
            }
        }
        return '<p>' . htmlspecialchars($text, ENT_QUOTES) . '</p>';
    }
}

if (!function_exists('reflow_plain_text')) {
    /**
     * Convert messy plain text (typically pasted from a PDF/Word, hard-wrapped
     * with no blank lines) into clean, structured HTML: real paragraphs,
     * headings, bullet & check lists, and bold lead-in labels. This is what
     * makes a raw paste render like a designed article with zero manual work.
     */
    function reflow_plain_text(string $text): string {
        $text  = str_replace(["\r\n", "\r"], "\n", $text);
        $lines = explode("\n", $text);

        $blocks   = [];   // ['p'|'h2'|'h3'|'ul'|'check', payload]
        $para     = '';
        $list     = [];
        $listKind = '';   // 'bullet' | 'check'

        $flushPara = function () use (&$para, &$blocks) {
            $t = trim($para);
            if ($t !== '') $blocks[] = ['p', $t];
            $para = '';
        };
        $flushList = function () use (&$list, &$listKind, &$blocks) {
            if ($list) { $blocks[] = [$listKind === 'check' ? 'check' : 'ul', $list]; }
            $list = []; $listKind = '';
        };

        foreach ($lines as $raw) {
            $line = trim($raw);

            if ($line === '' || af_is_junk_line($line)) { $flushPara(); $flushList(); continue; }
            // Bare bullet / marker glyphs left over from PDF extraction.
            if (preg_match('/^[•·▪◦‣✔✓✅✖✗❌×]\s*$/u', $line)) continue;

            // Check-list items (✔ pros / ✖ cons).
            if (preg_match('/^[✔✓]\s*(.+)/u', $line, $m)) {
                $flushPara(); if ($listKind !== 'check') { $flushList(); $listKind = 'check'; }
                $list[] = ['ok', trim($m[1])]; continue;
            }
            if (preg_match('/^[✖✗❌×]\s*(.+)/u', $line, $m)) {
                $flushPara(); if ($listKind !== 'check') { $flushList(); $listKind = 'check'; }
                $list[] = ['no', trim($m[1])]; continue;
            }
            // Ordinary bullets.
            if (preg_match('/^[•·▪◦‣\-\*]\s+(.+)/u', $line, $m)) {
                $flushPara(); if ($listKind !== 'bullet') { $flushList(); $listKind = 'bullet'; }
                $list[] = ['', trim($m[1])]; continue;
            }

            $flushList();

            // --- Heading detection ---
            $words = preg_split('/\s+/', $line);
            $isNumberedTitle = preg_match('/^\d+\.\s+\S/', $line)
                && (substr($line, -1) === '?' || count($words) <= 12) && substr($line, -1) !== '.';
            $isQuestionTitle = substr($line, -1) === '?' && mb_strlen($line) <= 90
                && preg_match('/^(what|which|how|why|when|is|are|should|can|does|do|will|who)\b/i', $line);
            $isNamedSection  = preg_match('/^(quick summary|verdict|conclusion|summary|overview|introduction|the verdict)\b/i', $line)
                && mb_strlen($line) <= 90;
            if ($isNumberedTitle || $isQuestionTitle || $isNamedSection) {
                $flushPara(); $blocks[] = ['h2', $line]; continue;
            }
            // Standalone label line ("How It Works:", "Limitation:") -> subheading.
            if (substr($line, -1) === ':' && count($words) <= 8 && mb_strlen($line) <= 60) {
                $flushPara(); $blocks[] = ['h3', rtrim($line, ': ')]; continue;
            }

            // --- Paragraph accumulation with line-unwrapping ---
            if ($para === '') {
                $para = $line;
            } elseif (preg_match('/[.!?”"’\'):]$/u', rtrim($para)) && preg_match('/^[A-Z0-9“"\'(]/u', $line)) {
                // Previous line ended a sentence and this one starts fresh -> new paragraph.
                $flushPara(); $para = $line;
            } else {
                $para .= ' ' . $line;   // wrapped continuation of the same paragraph
            }
        }
        $flushPara(); $flushList();

        // --- Emit HTML ---
        $out = '';
        foreach ($blocks as [$type, $payload]) {
            if ($type === 'p') {
                $out .= af_render_paragraph($payload);
            } elseif ($type === 'h2') {
                $out .= '<h2>' . htmlspecialchars($payload, ENT_QUOTES) . '</h2>';
            } elseif ($type === 'h3') {
                $out .= '<h3>' . htmlspecialchars($payload, ENT_QUOTES) . '</h3>';
            } elseif ($type === 'ul') {
                $out .= '<ul>';
                foreach ($payload as [$k, $t]) $out .= '<li>' . htmlspecialchars($t, ENT_QUOTES) . '</li>';
                $out .= '</ul>';
            } elseif ($type === 'check') {
                $out .= '<ul class="check-list">';
                foreach ($payload as [$k, $t]) {
                    $cls = $k === 'no' ? 'no' : 'ok';
                    $out .= '<li class="' . $cls . '">' . htmlspecialchars($t, ENT_QUOTES) . '</li>';
                }
                $out .= '</ul>';
            }
        }
        return $out;
    }
}

if (!function_exists('enhance_article_html')) {
    /**
     * @return array{toc:string, body:string} enhanced markup
     */
    function enhance_article_html(string $html): array {
        $html = trim($html);
        if ($html === '') return ['toc' => '', 'body' => ''];

        $doc = new DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML(
            '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><div id="__af">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();

        $xpath = new DOMXPath($doc);
        $root  = $xpath->query('//div[@id="__af"]')->item(0);
        if (!$root) return ['toc' => '', 'body' => $html];

        $seen = [];
        $headings = [];
        $firstPara = true;

        // Snapshot child nodes before mutating.
        foreach (iterator_to_array($root->childNodes) as $node) {
            if ($node->nodeType !== XML_ELEMENT_NODE) continue;
            $tag = strtolower($node->nodeName);

            // 1. Headings -> anchor ids + collect for TOC.
            if ($tag === 'h2' || $tag === 'h3') {
                $text = trim($node->textContent);
                if ($text !== '') {
                    $slug = af_slugify($text, $seen);
                    $node->setAttribute('id', $slug);
                    $headings[] = ['level' => $tag, 'text' => $text, 'slug' => $slug];
                }
                continue;
            }

            // 2. Paragraph callouts: "Label: rest of text".
            if ($tag === 'p') {
                $full = trim($node->textContent);
                if ($full !== '' && preg_match('/^([A-Za-z][A-Za-z \-]{0,14}?):\s+(.*)$/s', $full, $m)) {
                    $callout = af_callout_type($m[1]);
                    if ($callout) {
                        [$type, $niceLabel] = $callout;
                        af_transform_to_callout($doc, $node, $type, $niceLabel, $m[1]);
                        $firstPara = false;
                        continue;
                    }
                }
                if ($firstPara && $full !== '') {
                    $node->setAttribute('class', 'lead');
                    $firstPara = false;
                }
                continue;
            }

            // 3. Tables -> wrap in a scroll container.
            if ($tag === 'table') {
                $wrap = $doc->createElement('div');
                $wrap->setAttribute('class', 'table-scroll');
                $node->parentNode->replaceChild($wrap, $node);
                $wrap->appendChild($node);
                continue;
            }
        }

        // Group content into section cards: everything before the first <h2> is
        // the intro; each <h2> starts a card holding its content up to the next
        // <h2>. We also grab each section's first paragraph for "Key takeaways".
        $intro = '';
        $sections = [];
        $si = -1;
        foreach ($root->childNodes as $child) {
            $isEl = $child->nodeType === XML_ELEMENT_NODE;
            $name = $isEl ? strtolower($child->nodeName) : '';
            $html = $doc->saveHTML($child);
            if ($name === 'h2') {
                $sections[] = [
                    'head' => $html,
                    'slug' => $isEl ? $child->getAttribute('id') : '',
                    'content' => '',
                    'first' => '',
                ];
                $si = count($sections) - 1;
            } elseif ($si >= 0) {
                $sections[$si]['content'] .= $html;
                if ($sections[$si]['first'] === '' && $name === 'p'
                    && stripos($child->getAttribute('class'), 'callout') === false) {
                    $t = trim($child->textContent);
                    if ($t !== '') $sections[$si]['first'] = $t;
                }
            } else {
                $intro .= $html;
            }
        }

        $body = '';
        if (trim($intro) !== '') $body .= '<div class="art-intro">' . $intro . '</div>';
        foreach ($sections as $s) {
            $label = $s['slug'] !== '' ? ' aria-labelledby="' . htmlspecialchars($s['slug'], ENT_QUOTES) . '"' : '';
            $body .= '<section class="art-section"' . $label . '>' . $s['head'] . $s['content'] . '</section>';
        }
        if ($body === '') $body = trim(implode('', array_map(fn($c) => $doc->saveHTML($c), iterator_to_array($root->childNodes))));

        // Build a TOC + Key takeaways only when the article is long enough.
        $toc = '';
        $takeaways = [];
        $h2count = count(array_filter($headings, fn($h) => $h['level'] === 'h2'));
        if ($h2count >= 3) {
            $toc = '<nav class="article-toc" aria-label="Table of contents">'
                 . '<div class="toc-head">In this article</div><ol>';
            foreach ($headings as $h) {
                if ($h['level'] !== 'h2') continue;
                $toc .= '<li><a href="#' . htmlspecialchars($h['slug'], ENT_QUOTES)
                      . '">' . htmlspecialchars($h['text'], ENT_QUOTES) . '</a></li>';
            }
            $toc .= '</ol></nav>';

            foreach ($sections as $s) {
                if ($s['first'] === '') continue;
                $takeaways[] = af_first_sentence($s['first']);
                if (count($takeaways) >= 5) break;
            }
        }

        return ['toc' => $toc, 'body' => trim($body), 'takeaways' => $takeaways];
    }
}

if (!function_exists('af_first_sentence')) {
    /** First sentence of a paragraph, trimmed for a takeaways bullet. */
    function af_first_sentence(string $text, int $max = 160): string {
        $text = trim(preg_replace('/\s+/', ' ', $text));
        if (preg_match('/^(.{20,}?[.!?])(\s|$)/u', $text, $m)) {
            $text = $m[1];
        }
        if (mb_strlen($text) > $max) $text = rtrim(mb_substr($text, 0, $max - 1)) . '…';
        return $text;
    }
}

if (!function_exists('af_transform_to_callout')) {
    /**
     * Rebuild a <p> "Label: text" node as a callout card, preserving inline
     * markup (bold/links) that followed the label.
     */
    function af_transform_to_callout(DOMDocument $doc, DOMElement $p, string $type, string $niceLabel, string $rawLabel): void {
        $box = $doc->createElement('div');
        $box->setAttribute('class', 'callout callout-' . $type);

        $icon = $doc->createElement('span');
        $icon->setAttribute('class', 'callout-ico');
        // Icon glyph is an HTML entity; inject as a fragment.
        $frag = $doc->createDocumentFragment();
        $frag->appendXML(af_icon($type));
        if ($frag->hasChildNodes()) $icon->appendChild($frag);

        $content = $doc->createElement('div');
        $content->setAttribute('class', 'callout-content');

        $labelEl = $doc->createElement('span', htmlspecialchars($niceLabel, ENT_QUOTES));
        $labelEl->setAttribute('class', 'callout-label');
        $content->appendChild($labelEl);

        // Copy the paragraph's inline children, dropping the leading "Label:".
        $bodyP = $doc->createElement('p');
        $skipped = false;
        foreach (iterator_to_array($p->childNodes) as $child) {
            if (!$skipped && $child->nodeType === XML_TEXT_NODE) {
                // Remove the "Label:" prefix from the first text node.
                $child->nodeValue = preg_replace(
                    '/^\s*' . preg_quote($rawLabel, '/') . ':\s*/',
                    '',
                    $child->nodeValue,
                    1
                );
                $skipped = true;
            }
            $bodyP->appendChild($child->cloneNode(true));
        }
        $content->appendChild($bodyP);

        $box->appendChild($icon);
        $box->appendChild($content);
        $p->parentNode->replaceChild($box, $p);
    }
}
