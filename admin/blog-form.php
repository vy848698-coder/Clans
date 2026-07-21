<?php
require __DIR__ . '/auth.php';

$id   = (int)($_GET['id'] ?? 0);
$post = ['title'=>'','chip'=>'','category'=>'','excerpt'=>'','body'=>'','author'=>'','read_time'=>'','image'=>''];

if ($id) {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $found = $stmt->fetch();
    if ($found) $post = $found;
    else { $id = 0; }
}

$err = $_SESSION['flash_error'] ?? '';
unset($_SESSION['flash_error']);
function v($s) { return htmlspecialchars($s ?? '', ENT_QUOTES); }

// Categories come from the DB (single source shared with the public sidebar).
$CATEGORIES = get_categories($pdo);
$selectedCats = preg_split('/\s+/', trim((string)$post['category']), -1, PREG_SPLIT_NO_EMPTY);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $id ? 'Edit' : 'Add' ?> Blog — Admin</title>
  <link href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; background:#1e293b; }
    h1 { font-size:1.2rem; margin:0; }
    a { color:#22d3ee; text-decoration:none; }
    .wrap { max-width:760px; margin:0 auto; padding:1.5rem; }
    label { display:block; margin:1rem 0 .3rem; font-size:.85rem; font-weight:600; }
    .hint { font-weight:400; color:#94a3b8; font-size:.78rem; }
    input, textarea { width:100%; padding:.6rem; border-radius:8px; border:1px solid #334155;
            background:#1e293b; color:#e2e8f0; box-sizing:border-box; font-family:inherit; font-size:.9rem; }
    textarea { resize:vertical; }
    button { margin-top:1.5rem; padding:.7rem 1.5rem; border:0; border-radius:8px; background:#22d3ee;
             color:#0f172a; font-weight:600; cursor:pointer; }
    .err { background:#7f1d1d; padding:.7rem; border-radius:8px; margin:1rem 0; font-size:.85rem; }
    .row { display:flex; gap:1rem; } .row > div { flex:1; }
    img.preview { max-width:160px; border-radius:8px; margin-top:.5rem; display:block; }
    .cat-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:.4rem .9rem; margin-top:.3rem; }
    .cat-grid label { display:flex; align-items:center; gap:.5rem; margin:0; font-weight:400; cursor:pointer; }
    .cat-grid input { width:auto; }
    .counter { float:right; font-weight:400; color:#94a3b8; font-size:.78rem; }
    .counter.over { color:#f87171; }
    .check-line { display:flex; align-items:center; gap:.5rem; margin-top:1.2rem; }
    /* Quill dark theme */
    #bodyEditor { background:#1e293b; border-radius:0 0 8px 8px; min-height:320px; color:#e2e8f0; }
    .ql-toolbar.ql-snow { background:#0f172a; border-color:#334155 !important; border-radius:8px 8px 0 0; }
    .ql-container.ql-snow { border-color:#334155 !important; font-size:.95rem; }
    .ql-editor { min-height:300px; line-height:1.7; }
    .ql-editor.ql-blank::before { color:#64748b; font-style:normal; }
    .ql-snow .ql-stroke { stroke:#cbd5e1; }
    .ql-snow .ql-fill { fill:#cbd5e1; }
    .ql-snow .ql-picker { color:#cbd5e1; }
    .ql-snow .ql-picker-options { background:#1e293b; }
    .ql-toolbar button:hover .ql-stroke, .ql-toolbar button.ql-active .ql-stroke { stroke:#22d3ee; }
    .ql-toolbar button:hover .ql-fill, .ql-toolbar button.ql-active .ql-fill { fill:#22d3ee; }
    .check-line input { width:auto; } .check-line label { margin:0; }
    .format-tips { background:#0f172a; border:1px solid #334155; border-left:3px solid #22d3ee;
      border-radius:8px; padding:.7rem .9rem; font-size:.8rem; line-height:1.6; color:#94a3b8; margin:.3rem 0 .6rem; }
    .format-tips strong { color:#22d3ee; }
    .format-tips .tag { display:inline-block; background:#1e293b; border:1px solid #334155; border-radius:5px;
      padding:.05rem .4rem; margin:.1rem .05rem; color:#e2e8f0; font-size:.75rem; }
  </style>
</head>
<body>
  <header>
    <h1><?= $id ? 'Edit Blog' : 'Add New Blog' ?></h1>
    <a href="blogs.php">&larr; Back to blogs</a>
  </header>
  <div class="wrap">
    <?php if ($err): ?><div class="err"><?= v($err) ?></div><?php endif; ?>
    <form method="post" action="blog-save.php" enctype="multipart/form-data" id="blogForm">
      <input type="hidden" name="id" value="<?= $id ?>">
      <input type="hidden" name="existing_image" value="<?= v($post['image']) ?>">

      <label>Title <span class="hint">— main headline on the card</span></label>
      <input type="text" name="title" value="<?= v($post['title']) ?>" required>

      <label>Chip / Tag <span class="hint">small label on the card, e.g. PM Surya Ghar</span></label>
      <input type="text" name="chip" value="<?= v($post['chip']) ?>">

      <label>Categories <span class="hint">tick all that apply — controls the sidebar filters &middot;
        <a href="categories.php">manage categories</a></span></label>
      <div class="cat-grid">
        <?php foreach ($CATEGORIES as $cat): ?>
          <label>
            <input type="checkbox" name="category[]" value="<?= v($cat['slug']) ?>"
              <?= in_array($cat['slug'], $selectedCats, true) ? 'checked' : '' ?>>
            <?= v($cat['name']) ?>
          </label>
        <?php endforeach; ?>
        <?php if (empty($CATEGORIES)): ?>
          <span class="hint">No categories yet — <a href="categories.php">add some first</a>.</span>
        <?php endif; ?>
      </div>

      <div class="row">
        <div>
          <label>Author</label>
          <input type="text" name="author" value="<?= v($post['author']) ?>">
        </div>
        <div>
          <label>Read time <span class="hint">e.g. 8 min read</span></label>
          <input type="text" name="read_time" value="<?= v($post['read_time']) ?>">
        </div>
      </div>

      <label>Excerpt <span class="hint">short summary shown on the card (1–2 lines)</span>
        <span class="counter" id="excerptCount"></span></label>
      <textarea name="excerpt" id="excerptField" rows="3" maxlength="300" data-max="300" required><?= v($post['excerpt']) ?></textarea>

      <label>Full Body <span class="hint">use the toolbar for headings, bold, lists, quotes &amp; links</span></label>
      <div class="format-tips">
        <strong>Auto-formatting:</strong> the article page styles itself automatically —
        <b>H2</b> headings become an in-page table of contents, and if a paragraph
        <em>starts</em> with one of these words + a colon, it turns into a highlighted card:
        <span class="tag">Note:</span> <span class="tag">Tip:</span> <span class="tag">Important:</span>
        <span class="tag">Key takeaway:</span> <span class="tag">Warning:</span>
        <span class="tag">Example:</span> <span class="tag">FAQ:</span>
        Just write normally — no need to design anything.
      </div>
      <div id="bodyEditor"></div>
      <textarea name="body" id="bodyField" style="display:none;"><?= v($post['body']) ?></textarea>

      <label>Thumbnail Image <span class="hint">JPG/PNG/WebP, under 4 MB<?= $id ? ' — leave empty to keep current' : '' ?></span></label>
      <input type="file" name="image" accept="image/*">
      <?php if (!empty($post['image'])):
        // Inline data URLs / absolute URLs are used as-is; a stored relative
        // path is served from the site root (one level up from /admin).
        $prev = (strpos($post['image'], 'data:') === 0 || preg_match('#^https?://#', $post['image']))
              ? $post['image'] : '../' . $post['image']; ?>
        <img class="preview" src="<?= v($prev) ?>" alt="current">
      <?php endif; ?>

      <div class="check-line">
        <input type="checkbox" name="hidden" id="hiddenField" value="1" <?= !empty($post['hidden']) ? 'checked' : '' ?>>
        <label for="hiddenField">Save as draft (hidden from public site)</label>
      </div>

      <button type="submit"><?= $id ? 'Save Changes' : 'Publish Blog' ?></button>
    </form>
  </div>

  <script>
    function wireCounter(fieldId, countId, recommended) {
      var f = document.getElementById(fieldId), c = document.getElementById(countId);
      if (!f || !c) return;
      function update() {
        var n = f.value.length;
        c.textContent = n + (recommended ? ' / ' + recommended : '') + ' chars';
        c.classList.toggle('over', recommended && n > recommended);
      }
      f.addEventListener('input', update); update();
    }
    wireCounter('excerptField', 'excerptCount', 300);
  </script>

  <script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
  <script>
    var quill = new Quill('#bodyEditor', {
      theme: 'snow',
      placeholder: 'Write the full article here…',
      modules: {
        toolbar: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean']
        ]
      }
    });

    // Load existing content (edit mode) from the hidden textarea.
    var bodyField = document.getElementById('bodyField');
    if (bodyField.value.trim()) {
      quill.clipboard.dangerouslyPasteHTML(bodyField.value);
    }

    // Sync editor HTML into the textarea before submit; block empty bodies.
    document.getElementById('blogForm').addEventListener('submit', function (e) {
      var html = quill.root.innerHTML;
      var text = quill.getText().trim();
      if (!text) {
        e.preventDefault();
        alert('Please write the article body before saving.');
        return;
      }
      bodyField.value = html;
    });
  </script>
</body>
</html>
