<?php
require __DIR__ . '/db.php';
$dynamic = $pdo->query('SELECT * FROM posts WHERE hidden = 0 ORDER BY created_at DESC')->fetchAll();
$categories = get_categories($pdo);
function v($s) { return htmlspecialchars($s ?? '', ENT_QUOTES); }

// The `category` column is meant to hold space-separated slugs, but some
// legacy/imported rows stored the category *name* instead — which breaks the
// sidebar filter (it matches slugs). Resolve either form to canonical slugs so
// the filter always works, regardless of how the row was saved.
$slugSet = [];        // slug => true
$slugByName = [];     // lower(name) => slug
foreach ($categories as $cat) {
    $slugSet[$cat['slug']] = true;
    $slugByName[mb_strtolower($cat['name'])] = $cat['slug'];
}
function post_category_slugs($value, array $slugSet, array $slugByName): array {
    $value = trim((string)$value);
    if ($value === '') return [];
    // Whole value equals a known category name (legacy rows stored the name).
    if (isset($slugByName[mb_strtolower($value)])) return [$slugByName[mb_strtolower($value)]];
    // Otherwise treat as space-separated tokens; keep the ones we recognise.
    $out = [];
    foreach (preg_split('/\s+/', $value) as $tok) {
        if (isset($slugSet[$tok])) $out[$tok] = true;
        elseif (isset($slugByName[mb_strtolower($tok)])) $out[$slugByName[mb_strtolower($tok)]] = true;
    }
    return array_keys($out);
}
function initials($name) {
    $ini = '';
    foreach (preg_split('/\s+/', trim((string)$name)) as $p) {
        if ($p !== '') $ini .= mb_strtoupper(mb_substr($p, 0, 1));
        if (mb_strlen($ini) >= 2) break;
    }
    return $ini ?: 'CM';
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="mint-fresh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Clans Machina Solar blog — practical guides on rooftop solar costs, PM Surya Ghar subsidy, savings, net metering and maintenance for Indian homes and businesses." />
  <title>Blog and Insights | Clans Machina</title>
  <link rel="canonical" href="https://www.clansmachina.in/blog.php" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Clans Machina Solar" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:title" content="Blog and Insights | Clans Machina" />
  <meta property="og:description" content="Practical guides on rooftop solar costs, PM Surya Ghar subsidy, savings, net metering and maintenance for Indian homes and businesses." />
  <meta property="og:url" content="https://www.clansmachina.in/blog.php" />
  <meta property="og:image" content="https://www.clansmachina.in/image/service-residential.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Blog and Insights | Clans Machina" />
  <meta name="twitter:description" content="Practical guides on rooftop solar costs, subsidy, savings, net metering and maintenance for Indian homes and businesses." />
  <meta name="twitter:image" content="https://www.clansmachina.in/image/service-residential.webp" />
  <link rel="stylesheet" href="css/fonts.css" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
<?php include __DIR__ . '/partials/nav.php'; ?>

  <section class="blog-page" id="blog" style="padding-top:108px;">
    <div class="container">
      <div class="blog-page-crumbs" data-animate><a href="index.html">Home</a><span>/</span><span>Blogs</span></div>

      <div class="blog-page-head" data-animate>
        <h2>All Blogs</h2>
      </div>

      <div class="blog-directory">
        <aside class="blog-sidebar" data-animate>
          <div class="blog-search glass-card">
            <input type="text" id="blogSearchInput" placeholder="Search an article" aria-label="Search articles" />
          </div>
          <div class="blog-categories glass-card">
            <h3>Browse by Category</h3>
            <ul>
              <li><a href="#" class="active" data-filter="all">All Blogs</a></li>
              <?php foreach ($categories as $cat): ?>
              <li><a href="#" data-filter="<?= v($cat['slug']) ?>"><?= v($cat['name']) ?></a></li>
              <?php endforeach; ?>
            </ul>
          </div>
        </aside>

        <div class="blog-cards-zone" data-animate>
          <?php
            // Rotating thumbnail gradient + icon for cards without an uploaded image.
            $thumbStyles = ['bp-thumb--sun','bp-thumb--tech','bp-thumb--save','bp-thumb--policy','bp-thumb--india'];
            $thumbIcons  = ['&#9728;&#65039;','&#128268;','&#128176;','&#127970;','&#9889;'];
          ?>
          <div class="blog-cards-grid">

            <?php /* ---- Owner-added blogs from the database (newest first) ---- */ ?>
            <?php foreach ($dynamic as $i => $p): ?>
            <article class="blog-page-card glass-card" data-category="<?= v(implode(' ', post_category_slugs($p['category'], $slugSet, $slugByName))) ?>">
              <div class="bp-thumb <?= $thumbStyles[$i % count($thumbStyles)] ?>">
                <span class="bp-ico"><?= $thumbIcons[$i % count($thumbIcons)] ?></span>
                <?php if (!empty($p['image'])): ?>
                  <img class="bp-photo" src="<?= v($p['image']) ?>" alt="<?= v($p['title']) ?>" loading="lazy" onerror="this.remove()">
                <?php endif; ?>
              </div>
              <div class="bp-body">
                <?php if (!empty($p['chip'])): ?><span class="bp-chip"><?= v($p['chip']) ?></span><?php endif; ?>
                <h3><a class="bp-title-link" href="post.php?id=<?= (int)$p['id'] ?>"><?= v($p['title']) ?></a></h3>
                <p class="bp-excerpt"><?= v($p['excerpt']) ?></p>
                <a href="post.php?id=<?= (int)$p['id'] ?>" class="bp-readmore">
                  Read More
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
                <div class="bp-foot">
                  <span class="bp-avatar"><?= v(initials($p['author'])) ?></span>
                  <span class="bp-byline"><strong><?= v($p['author'] ?: 'Clans Machina') ?></strong>
                    <span><?= v($p['read_time']) ?><?= $p['read_time'] ? ' &middot; ' : '' ?><?= v(date('j M Y', strtotime($p['created_at']))) ?></span>
                  </span>
                </div>
              </div>
            </article>
            <?php endforeach; ?>

            <?php if (empty($dynamic)): ?>
              <div class="blog-empty-state glass-card" style="grid-column:1/-1;">
                <h3>No articles published yet</h3>
                <p>Check back soon &mdash; new solar insights are on the way.</p>
              </div>
            <?php endif; ?>
          </div>

          <article class="blog-guide-banner glass-card" data-animate>
            <div>
              <span class="blog-guide-tag">Free Download</span>
              <h3>Turn your rooftop into a money-saving machine. Start with the Solar Guide.</h3>
              <p>System sizing, subsidy paperwork, net metering and payback &mdash; everything you need before installing solar at home.</p>
              <a href="index.html#contact" class="btn btn-neon">Download Now</a>
            </div>
            <div class="blog-guide-book"></div>
          </article>

          <div class="blog-empty-state glass-card" id="blogEmptyState" style="display:none;">
            <h3>No articles found</h3>
            <p>Try a different keyword or category.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

<?php include __DIR__ . '/partials/footer.php'; ?>
</body>
</html>
