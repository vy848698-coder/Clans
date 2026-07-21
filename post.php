<?php
require __DIR__ . '/db.php';
function v($s) { return htmlspecialchars($s ?? '', ENT_QUOTES); }

$id = (int)($_GET['id'] ?? 0);
$post = null;
if ($id) {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE id = :id AND hidden = 0');
    $stmt->execute([':id' => $id]);
    $post = $stmt->fetch();
}

if (!$post) {
    http_response_code(404);
}

function initials_of($name) {
    $ini = '';
    foreach (preg_split('/\s+/', trim((string)$name)) as $w) {
        if ($w !== '') $ini .= mb_strtoupper(mb_substr($w, 0, 1));
        if (mb_strlen($ini) >= 2) break;
    }
    return $ini ?: 'CM';
}

// Related posts: prefer ones sharing a category, then fill with recent.
$related = [];
if ($post) {
    $firstCat = trim(strtok((string)$post['category'], ' '));
    if ($firstCat !== '') {
        $stmt = $pdo->prepare(
            "SELECT id, title, chip, excerpt, image, author, read_time, created_at
             FROM posts WHERE hidden = 0 AND id <> :id AND CONCAT(' ', category, ' ') LIKE :cat
             ORDER BY created_at DESC LIMIT 3"
        );
        $stmt->execute([':id' => $post['id'], ':cat' => '% ' . $firstCat . ' %']);
        $related = $stmt->fetchAll();
    }
    if (count($related) < 3) {
        $have = array_column($related, 'id');
        $have[] = $post['id'];
        $in = implode(',', array_fill(0, count($have), '?'));
        $stmt = $pdo->prepare(
            "SELECT id, title, chip, excerpt, image, author, read_time, created_at
             FROM posts WHERE hidden = 0 AND id NOT IN ($in)
             ORDER BY created_at DESC LIMIT " . (3 - count($related))
        );
        $stmt->execute($have);
        $related = array_merge($related, $stmt->fetchAll());
    }
}

// Estimated reading time — use the stored value, or derive ~200 words/min.
$readTime = trim((string)($post['read_time'] ?? ''));
if ($post && $readTime === '') {
    $words = str_word_count(strip_tags((string)$post['body']));
    $readTime = max(1, (int)round($words / 200)) . ' min read';
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="mint-fresh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="<?= $post ? v(mb_substr($post['excerpt'], 0, 150)) : 'Article not found' ?>" />
  <title><?= $post ? v($post['title']) : 'Article not found' ?> | Clans Machina</title>
  <link rel="canonical" href="https://www.clansmachina.in/post.php?id=<?= (int)$id ?>" />
  <meta name="robots" content="<?= $post ? 'index, follow' : 'noindex, follow' ?>" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Clans Machina Solar" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:title" content="<?= $post ? v($post['title']) : 'Article not found' ?> | Clans Machina" />
  <meta property="og:description" content="<?= $post ? v(mb_substr($post['excerpt'], 0, 150)) : 'Article not found' ?>" />
  <meta property="og:url" content="https://www.clansmachina.in/post.php?id=<?= (int)$id ?>" />
<?php
// og:image must be a public URL — inline data-URL covers can't be used by social
// platforms, so fall back to the default share image for those.
$ogImg = ($post && !empty($post['image']) && strpos($post['image'], 'data:') !== 0)
    ? (preg_match('#^https?://#', $post['image']) ? $post['image'] : 'https://www.clansmachina.in/' . ltrim($post['image'], '/'))
    : 'https://www.clansmachina.in/image/service-residential.webp';
?>
  <meta property="og:image" content="<?= v($ogImg) ?>" />
<?php if ($post): ?>
  <meta property="article:published_time" content="<?= v($post['created_at']) ?>" />
  <meta property="article:author" content="<?= v($post['author']) ?>" />
<?php endif; ?>
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?= $post ? v($post['title']) : 'Article not found' ?> | Clans Machina" />
  <meta name="twitter:description" content="<?= $post ? v(mb_substr($post['excerpt'], 0, 150)) : 'Article not found' ?>" />
  <meta name="twitter:image" content="<?= v($ogImg) ?>" />
  <link rel="stylesheet" href="css/fonts.css" />
  <link rel="stylesheet" href="css/styles.css" />
  <style>
    html { scroll-behavior:smooth; }
    .article-wrap { max-width:760px; margin:0 auto; padding:128px 1.25rem 4rem; }
    .article-wrap .crumbs { margin-bottom:1.75rem; font-size:.85rem; color:var(--text-muted); }
    .article-wrap .crumbs a { color:var(--green); text-decoration:none; }
    .article-wrap .crumbs a:hover { text-decoration:underline; }
    .article-chip {
      display:inline-block; padding:.35rem .85rem; border-radius:999px; font-size:.72rem; font-weight:600;
      background:var(--green-dim); border:1px solid var(--border-bright); color:var(--green);
      letter-spacing:.02em; text-transform:uppercase; margin-bottom:1rem;
    }
    .article-wrap h1 {
      font-family:var(--font-display); font-size:2.4rem; line-height:1.18;
      margin:.5rem 0 1.5rem; letter-spacing:-0.01em;
    }
    .article-meta { display:flex; gap:.85rem; align-items:center; margin-bottom:2.25rem;
      padding-bottom:1.75rem; border-bottom:1px solid var(--border); }
    .article-meta .bp-avatar {
      width:44px; height:44px; border-radius:50%; flex-shrink:0; display:inline-flex;
      align-items:center; justify-content:center; font-weight:700; font-family:var(--font-display);
      color:var(--btn-neon-text); background:linear-gradient(135deg, var(--green), var(--blue));
    }
    .article-meta .meta-text strong { display:block; font-size:.95rem; color:var(--text-primary); }
    .article-meta .meta-text span { font-size:.82rem; color:var(--text-muted); }
    .article-hero {
      width:100%; max-height:440px; object-fit:cover; border-radius:18px; margin:0 0 2.5rem;
      box-shadow:0 20px 50px rgba(0,0,0,0.35);
    }
    .article-body { font-size:1.12rem; line-height:1.9; color:var(--text-secondary); }
    .article-body p { margin:0 0 1.4rem; }
    /* Drop cap on the first paragraph */
    .article-body > p:first-of-type::first-letter {
      float:left; font-family:var(--font-display); font-size:3.4rem; line-height:.82;
      font-weight:700; padding:.2rem .6rem .1rem 0; color:var(--green);
    }
    .article-body h2 {
      font-family:var(--font-display); font-size:1.7rem; line-height:1.25; color:var(--text-primary);
      margin:2.5rem 0 1rem; padding-bottom:.5rem; border-bottom:1px solid var(--border); scroll-margin-top:100px;
    }
    .article-body h3 {
      font-family:var(--font-display); font-size:1.3rem; color:var(--text-primary); margin:2rem 0 .8rem; scroll-margin-top:100px;
    }
    .article-body strong { color:var(--text-primary); }
    .article-body a { color:var(--green); text-decoration:underline; text-underline-offset:3px; }
    .article-body ul, .article-body ol { margin:0 0 1.4rem; padding-left:1.4rem; }
    .article-body li { margin-bottom:.6rem; }
    .article-body ul li::marker { color:var(--green); }
    /* Pros / cons check-list (auto-built from ✔ / ✖ lines) */
    .article-body ul.check-list { list-style:none; padding-left:0; }
    .article-body ul.check-list li { position:relative; padding-left:2rem; margin-bottom:.7rem; }
    .article-body ul.check-list li::marker { content:none; }
    .article-body ul.check-list li::before {
      position:absolute; left:0; top:0; width:1.4rem; height:1.4rem; border-radius:50%;
      display:inline-flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:800;
    }
    .article-body ul.check-list li.ok::before { content:"\2713"; color:var(--green); background:var(--green-dim); }
    .article-body ul.check-list li.no::before { content:"\2715"; color:#f87171; background:rgba(248,113,113,0.14); }
    .article-body blockquote {
      margin:2rem 0; padding:1rem 1.5rem; border-left:4px solid var(--green);
      background:var(--green-dim); border-radius:0 10px 10px 0;
      font-size:1.15rem; font-style:italic; color:var(--text-primary);
    }
    .article-body img { max-width:100%; border-radius:12px; margin:1.5rem 0; }
    .article-body h4 {
      font-family:var(--font-display); font-size:1.1rem; color:var(--text-primary); margin:1.6rem 0 .6rem;
    }
    .article-body hr {
      border:0; height:1px; background:var(--border); margin:2.5rem 0;
    }
    .article-body code {
      font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:.9em;
      background:var(--green-dim); border:1px solid var(--border-bright); color:var(--green);
      padding:.12em .4em; border-radius:6px;
    }
    .article-body pre {
      background:rgba(0,0,0,0.35); border:1px solid var(--border); border-radius:12px;
      padding:1rem 1.2rem; overflow-x:auto; margin:1.5rem 0; font-size:.95rem; line-height:1.6;
    }
    .article-body pre code { background:none; border:0; padding:0; color:var(--text-secondary); }
    .article-body mark {
      background:linear-gradient(120deg, var(--green-dim), var(--blue-dim));
      color:var(--text-primary); padding:.05em .25em; border-radius:4px;
    }
    /* Lead / intro paragraph */
    .article-body p.lead {
      font-size:1.25rem; line-height:1.75; color:var(--text-primary); font-weight:500;
    }
    .article-body p.lead::first-letter { padding:0; float:none; font-size:inherit; color:inherit; }
    /* Auto Table of Contents card */
    .article-toc {
      background:var(--bg-card, rgba(255,255,255,0.05)); border:1px solid var(--border);
      border-left:4px solid var(--green); border-radius:14px; padding:1.25rem 1.5rem; margin:0 0 2.5rem;
    }
    .article-toc .toc-head {
      font-family:var(--font-display); font-size:.8rem; text-transform:uppercase; letter-spacing:.08em;
      color:var(--green); font-weight:700; margin-bottom:.75rem;
    }
    .article-toc ol { margin:0; padding-left:1.2rem; counter-reset:toc; list-style:none; }
    .article-toc li { margin:.35rem 0; counter-increment:toc; position:relative; }
    .article-toc li::before {
      content:counter(toc); position:absolute; left:-1.2rem; color:var(--green); font-weight:700; font-size:.85rem;
    }
    .article-toc a { color:var(--text-secondary); text-decoration:none; font-size:.98rem; transition:color .15s ease; }
    .article-toc a:hover { color:var(--green); }
    .article-toc li.active::before { color:var(--green); }
    .article-toc li.active a { color:var(--text-primary); font-weight:600; }
    /* Key takeaways card */
    .key-takeaways {
      background:linear-gradient(135deg, var(--green-dim), var(--blue-dim));
      border:1px solid var(--border-bright); border-radius:16px; padding:1.5rem 1.75rem; margin:0 0 2rem;
    }
    .key-takeaways .kt-head {
      display:flex; align-items:center; gap:.55rem; font-family:var(--font-display); font-weight:700;
      color:var(--text-primary); margin-bottom:1rem; font-size:1.1rem;
    }
    .key-takeaways .kt-head svg { color:var(--green); }
    .key-takeaways ul { margin:0; padding:0; list-style:none; display:grid; gap:.75rem; }
    .key-takeaways li { position:relative; padding-left:2rem; color:var(--text-secondary); line-height:1.6; font-size:1rem; }
    .key-takeaways li::before {
      content:"\2713"; position:absolute; left:0; top:.05rem; width:1.4rem; height:1.4rem; border-radius:50%;
      background:var(--green); color:var(--btn-neon-text, #05261a); font-weight:800; font-size:.78rem;
      display:inline-flex; align-items:center; justify-content:center;
    }
    /* Intro (content before the first heading) */
    .art-intro { margin-bottom:.5rem; }
    /* Section cards — group each H2 and its content */
    .art-section {
      background:linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
      border:1px solid var(--border); border-radius:16px; padding:1.5rem 2rem 1.75rem; margin:0 0 1.5rem;
      transition:border-color .25s ease;
    }
    .art-section:hover { border-color:var(--border-bright); }
    .art-section > h2:first-child { margin-top:.25rem; }
    @media (max-width:640px){ .art-section { padding:1.25rem 1.15rem 1.4rem; } }
    /* End-of-article CTA card */
    .article-endcta {
      display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap; justify-content:space-between;
      background:linear-gradient(135deg, rgba(62,207,142,0.16), rgba(78,168,222,0.16));
      border:1px solid var(--border-bright); border-radius:18px; padding:1.75rem 2rem; margin:2.5rem 0 1rem;
      position:relative; overflow:hidden;
    }
    .article-endcta::after {
      content:""; position:absolute; right:-40px; top:-40px; width:180px; height:180px; border-radius:50%;
      background:radial-gradient(circle, var(--green-glow), transparent 70%); pointer-events:none;
    }
    .article-endcta .endcta-text { flex:1; min-width:240px; position:relative; z-index:1; }
    .article-endcta .endcta-eyebrow { font-size:.75rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--green); }
    .article-endcta h3 { font-family:var(--font-display); font-size:1.4rem; margin:.35rem 0 .5rem; color:var(--text-primary); }
    .article-endcta p { margin:0; font-size:.98rem; color:var(--text-secondary); line-height:1.6; }
    .article-endcta .endcta-btn { display:inline-flex; align-items:center; gap:.5rem; white-space:nowrap; position:relative; z-index:1; }
    /* Author card */
    .author-card {
      display:flex; gap:1rem; align-items:flex-start; margin-top:2.5rem; padding:1.5rem;
      background:var(--bg-card, rgba(255,255,255,0.05)); border:1px solid var(--border); border-radius:16px;
    }
    .author-card .bp-avatar {
      width:52px; height:52px; border-radius:50%; flex-shrink:0; display:inline-flex; align-items:center;
      justify-content:center; font-weight:700; font-family:var(--font-display); font-size:1.1rem;
      color:var(--btn-neon-text); background:linear-gradient(135deg, var(--green), var(--blue));
    }
    .author-card .author-text strong { display:block; color:var(--text-primary); font-size:1rem; margin-bottom:.3rem; }
    .author-card .author-text p { margin:0; font-size:.92rem; color:var(--text-muted); line-height:1.6; }
    /* Back-to-top button */
    .back-to-top {
      position:fixed; right:1.5rem; bottom:1.5rem; width:46px; height:46px; border-radius:50%;
      border:1px solid var(--border-bright); background:var(--green); color:var(--btn-neon-text, #05261a);
      display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:60;
      opacity:0; transform:translateY(12px); pointer-events:none; transition:opacity .25s ease, transform .25s ease;
      box-shadow:0 10px 24px rgba(0,0,0,0.3);
    }
    .back-to-top.show { opacity:1; transform:translateY(0); pointer-events:auto; }
    .back-to-top:hover { transform:translateY(-3px); }
    @media (max-width:640px){ .back-to-top { right:1rem; bottom:5.5rem; } }
    /* Callout cards (auto-generated from "Label:" paragraphs) */
    .callout {
      display:flex; gap:.9rem; align-items:flex-start; margin:1.75rem 0;
      padding:1.1rem 1.25rem; border-radius:14px; border:1px solid var(--border);
      background:var(--bg-card, rgba(255,255,255,0.05)); border-left:4px solid var(--green);
    }
    .callout-ico { font-size:1.35rem; line-height:1.5; flex-shrink:0; }
    .callout-content { flex:1; min-width:0; }
    .callout-label {
      display:block; font-family:var(--font-display); font-weight:700; font-size:.95rem;
      color:var(--text-primary); margin-bottom:.15rem;
    }
    .callout-content p { margin:0; font-size:1.02rem; line-height:1.7; }
    .callout-info    { border-left-color:var(--blue);   background:var(--blue-dim); }
    .callout-info .callout-label { color:var(--blue); }
    .callout-tip     { border-left-color:var(--green);  background:var(--green-dim); }
    .callout-tip .callout-label { color:var(--green); }
    .callout-key     { border-left-color:#f5c451; background:rgba(245,196,81,0.12); }
    .callout-key .callout-label { color:#f5c451; }
    .callout-warn    { border-left-color:#f87171; background:rgba(248,113,113,0.12); }
    .callout-warn .callout-label { color:#f87171; }
    .callout-example { border-left-color:var(--text-muted); }
    .callout-faq     { border-left-color:var(--blue); background:var(--blue-dim); }
    .callout-faq .callout-label { color:var(--blue); }
    /* Tables (scroll-wrapped by the formatter) */
    .table-scroll { overflow-x:auto; margin:1.75rem 0; border-radius:12px; border:1px solid var(--border); }
    .article-body table { width:100%; border-collapse:collapse; font-size:.98rem; min-width:460px; }
    .article-body th {
      background:linear-gradient(135deg, var(--green), var(--blue)); color:var(--btn-neon-text, #05261a);
      text-align:left; padding:.85rem 1rem; font-family:var(--font-display); font-weight:700; font-size:.9rem;
    }
    .article-body tbody td { padding:.8rem 1rem; border-top:1px solid var(--border); color:var(--text-secondary); vertical-align:top; }
    .article-body tbody tr:nth-child(even) td { background:rgba(255,255,255,0.02); }
    .article-body th, .article-body td { border:0; }
    /* Reading progress bar */
    .reading-progress {
      position:fixed; top:0; left:0; height:3px; width:0%; z-index:1000;
      background:linear-gradient(90deg, var(--green), var(--blue)); transition:width .1s linear;
    }
    /* Sticky share rail (desktop) — sits just left of the 760px article column.
       Half the column is 380px; pull the rail ~70px further left of that edge. */
    .share-rail {
      position:fixed; left:calc(50% - 450px); top:40%; display:flex; flex-direction:column;
      gap:.6rem; z-index:50; transition:opacity .3s ease;
    }
    .share-rail button, .share-rail a {
      width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      border:1px solid var(--border-bright); background:var(--bg-card, #1a1a22); color:var(--green);
      cursor:pointer; text-decoration:none; transition:all .2s ease;
    }
    .share-rail button:hover, .share-rail a:hover { background:var(--green); color:var(--btn-neon-text); transform:translateY(-2px); }
    /* Hide unless the viewport is wide enough to fit the rail beside the article without overlap. */
    @media (max-width:1080px){ .share-rail { display:none; } }
    /* Related articles */
    .related-wrap { max-width:1100px; margin:0 auto; padding:0 1.25rem 4rem; }
    .related-wrap h2 { font-family:var(--font-display); font-size:1.5rem; margin-bottom:1.25rem; }
    .related-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:1.25rem; }
    .article-cta {
      display:flex; flex-wrap:wrap; align-items:center; gap:.75rem; margin-top:3rem;
      padding-top:2rem; border-top:1px solid var(--border);
    }
    .article-cta .cta-label { font-size:.85rem; color:var(--text-muted); margin-right:.25rem; }
    .share-btn {
      display:inline-flex; align-items:center; gap:7px; padding:.55rem 1.1rem; border-radius:999px;
      border:1px solid var(--border-bright); background:var(--green-dim); color:var(--green);
      font-weight:600; font-size:.85rem; cursor:pointer; text-decoration:none; transition:all .2s ease;
    }
    .share-btn:hover { background:var(--green); color:var(--btn-neon-text); }
    .share-toast {
      font-size:.82rem; color:var(--green); opacity:0; transition:opacity .25s ease;
    }
    .share-toast.show { opacity:1; }
    .article-back {
      display:inline-flex; align-items:center; gap:6px; margin-top:1.75rem;
      color:var(--green); text-decoration:none; font-weight:600;
    }
    .article-back:hover { gap:10px; }
    @media (max-width:640px){ .article-wrap h1 { font-size:1.8rem; } }
  </style>
</head>
<body>
<?php include __DIR__ . '/partials/nav.php'; ?>
<?php if ($post): ?>
  <div class="reading-progress" id="readingProgress"></div>
  <div class="share-rail" aria-label="Share this article">
    <button type="button" id="railShare" title="Share">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <a href="https://wa.me/?text=<?= rawurlencode($post['title']) ?>" target="_blank" rel="noopener" title="WhatsApp">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1.1-.2.1-.3.2-.6 0-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5 0-.2 0-.3 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.5-.3zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z"/></svg>
    </a>
    <a href="index.html#contact" title="Contact us">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>
<?php endif; ?>

  <main class="article-wrap">
    <?php if (!$post): ?>
      <div class="crumbs"><a href="blog.php">&larr; Back to all blogs</a></div>
      <h1>Article not found</h1>
      <p>This article may have been removed. <a href="blog.php" style="color:var(--accent,#22d3ee);">Browse all blogs</a>.</p>
    <?php else: ?>
      <div class="crumbs"><a href="index.html">Home</a> / <a href="blog.php">Blogs</a> / <span><?= v($post['title']) ?></span></div>

      <?php if (!empty($post['chip'])): ?><span class="article-chip"><?= v($post['chip']) ?></span><?php endif; ?>
      <h1><?= v($post['title']) ?></h1>

      <div class="article-meta">
        <span class="bp-avatar"><?php
          $ini=''; foreach (preg_split('/\s+/', trim((string)$post['author'])) as $w){ if($w!=='')$ini.=mb_strtoupper(mb_substr($w,0,1)); if(mb_strlen($ini)>=2)break; }
          echo v($ini ?: 'CM');
        ?></span>
        <span class="meta-text">
          <strong><?= v($post['author'] ?: 'Clans Machina') ?></strong>
          <span><?= v($readTime) ?><?= $readTime ? ' &middot; ' : '' ?><?= v(date('j F Y', strtotime($post['created_at']))) ?></span>
        </span>
      </div>

      <?php if (!empty($post['image'])): ?>
        <img class="article-hero" src="<?= v($post['image']) ?>" alt="<?= v($post['title']) ?>" onerror="this.remove()">
      <?php endif; ?>

      <?php
        // Body is sanitized HTML (see sanitize_html in db.php).
        require_once __DIR__ . '/partials/article-format.php';
        $body = (string)$post['body'];
        // Plain-text / PDF-pasted posts are reflowed into real paragraphs,
        // headings and lists so they never render as a broken-line wall.
        if (strip_tags($body) === $body) {
            $body = reflow_plain_text($body);
        }
        // Auto-format: build a Table of Contents, turn "Note:/Tip:/..." paragraphs
        // into callout cards, add heading anchors, and make tables scrollable.
        $enhanced = enhance_article_html($body);
      ?>
      <?php if (!empty($enhanced['takeaways'])): ?>
      <aside class="key-takeaways">
        <div class="kt-head">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Key takeaways
        </div>
        <ul>
          <?php foreach ($enhanced['takeaways'] as $kt): ?><li><?= v($kt) ?></li><?php endforeach; ?>
        </ul>
      </aside>
      <?php endif; ?>

      <?php if ($enhanced['toc']): ?><?= $enhanced['toc'] ?><?php endif; ?>
      <div class="article-body">
        <?= $enhanced['body'] ?>
      </div>

      <aside class="article-endcta">
        <div class="endcta-text">
          <span class="endcta-eyebrow">Ready to save on power bills?</span>
          <h3>Get a free rooftop solar assessment</h3>
          <p>We'll size the right system for your home, handle the PM Surya Ghar subsidy paperwork, and give you a clear savings estimate — no obligation.</p>
        </div>
        <a href="index.html#contact" class="btn btn-neon endcta-btn">Get a Free Quote
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </aside>

      <div class="article-cta">
        <span class="cta-label">Found this helpful?</span>
        <button type="button" class="share-btn" id="shareBtn"
          data-title="<?= v($post['title']) ?>">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Share
        </button>
        <a class="share-btn" href="index.html#contact">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Contact Us
        </a>
        <span class="share-toast" id="shareToast">Link copied!</span>
      </div>

      <div class="author-card">
        <span class="bp-avatar"><?= v(initials_of($post['author'] ?: 'Clans Machina')) ?></span>
        <div class="author-text">
          <strong>Written by <?= v($post['author'] ?: 'Clans Machina') ?></strong>
          <p>Clans Machina helps homes and businesses across Odisha switch to solar — from system design and subsidy paperwork to installation and after-sales support.</p>
        </div>
      </div>

      <a class="article-back" href="blog.php">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back to all blogs
      </a>
    <?php endif; ?>
  </main>

  <?php if ($post): ?>
  <button class="back-to-top" id="backToTop" aria-label="Back to top" title="Back to top">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <?php endif; ?>

  <?php if ($post && $related): ?>
  <section class="related-wrap">
    <h2>Continue reading</h2>
    <div class="related-grid">
      <?php foreach ($related as $r): ?>
      <article class="blog-page-card glass-card">
        <div class="bp-thumb bp-thumb--sun">
          <span class="bp-ico">&#9728;&#65039;</span>
          <?php if (!empty($r['image'])): ?>
            <img class="bp-photo" src="<?= v($r['image']) ?>" alt="<?= v($r['title']) ?>" loading="lazy" onerror="this.remove()">
          <?php endif; ?>
        </div>
        <div class="bp-body">
          <?php if (!empty($r['chip'])): ?><span class="bp-chip"><?= v($r['chip']) ?></span><?php endif; ?>
          <h3><a class="bp-title-link" href="post.php?id=<?= (int)$r['id'] ?>"><?= v($r['title']) ?></a></h3>
          <p class="bp-excerpt"><?= v($r['excerpt']) ?></p>
          <a href="post.php?id=<?= (int)$r['id'] ?>" class="bp-readmore">Read More
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <div class="bp-foot">
            <span class="bp-avatar"><?= v(initials_of($r['author'])) ?></span>
            <span class="bp-byline"><strong><?= v($r['author'] ?: 'Clans Machina') ?></strong>
              <span><?= v($r['read_time']) ?><?= $r['read_time'] ? ' &middot; ' : '' ?><?= v(date('j M Y', strtotime($r['created_at']))) ?></span>
            </span>
          </div>
        </div>
      </article>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endif; ?>

  <script>
    // Share (bottom button + side rail) with native share / clipboard fallback.
    (function () {
      var toast = document.getElementById('shareToast');
      function flash() {
        if (!toast) return;
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 2000);
      }
      function doShare() {
        var title = document.title;
        if (navigator.share) {
          navigator.share({ title: title, text: title, url: location.href }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(location.href).then(flash).catch(function () {});
        } else {
          prompt('Copy this link:', location.href);
        }
      }
      ['shareBtn', 'railShare'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', doShare);
      });
    })();

    // Reading progress bar + show the share rail only while reading the article.
    (function () {
      var bar = document.getElementById('readingProgress');
      var rail = document.querySelector('.share-rail');
      var article = document.querySelector('.article-body');
      if (!article) return;
      function update() {
        var start = article.offsetTop;
        var end = start + article.offsetHeight - window.innerHeight;
        if (bar) {
          var pct = (window.scrollY - start) / (end - start) * 100;
          bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
        }
        if (rail) {
          // Visible once you've entered the article, hidden after you pass its end
          // (so it never overlaps the related cards / footer).
          var inReadingZone = window.scrollY > start - 200 &&
                              window.scrollY < end + window.innerHeight * 0.4;
          rail.style.opacity = inReadingZone ? '1' : '0';
          rail.style.pointerEvents = inReadingZone ? 'auto' : 'none';
        }
      }
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    })();

    // Scroll-spy: highlight the current section in the Table of Contents.
    (function () {
      var toc = document.querySelector('.article-toc');
      if (!toc || !('IntersectionObserver' in window)) return;
      var links = {};
      toc.querySelectorAll('a[href^="#"]').forEach(function (a) {
        links[decodeURIComponent(a.getAttribute('href').slice(1))] = a.parentElement;
      });
      var heads = document.querySelectorAll('.article-body h2[id]');
      if (!heads.length) return;
      var current = null;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) current = e.target.id;
        });
        Object.keys(links).forEach(function (id) {
          links[id].classList.toggle('active', id === current);
        });
      }, { rootMargin: '-90px 0px -70% 0px', threshold: 0 });
      heads.forEach(function (h) { obs.observe(h); });
    })();

    // Back-to-top button: appears after scrolling down.
    (function () {
      var btn = document.getElementById('backToTop');
      if (!btn) return;
      function toggle() { btn.classList.toggle('show', window.scrollY > 700); }
      btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      window.addEventListener('scroll', toggle, { passive: true });
      toggle();
    })();
  </script>

<?php include __DIR__ . '/partials/footer.php'; ?>
</body>
</html>
