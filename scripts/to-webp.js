// Batch-convert served raster images to WebP using sharp.
// Skips the _originals/ backup. Writes <name>.webp next to each source.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'image');
const exts = new Set(['.jpg', '.jpeg', '.png']);
const files = [];

(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_originals') continue;
      walk(p);
    } else if (exts.has(path.extname(e.name).toLowerCase())) {
      files.push(p);
    }
  }
})(ROOT);

(async () => {
  let before = 0, after = 0, done = 0;
  for (const src of files) {
    const out = src.replace(/\.(jpe?g|png)$/i, '.webp');
    try {
      const inSize = fs.statSync(src).size;
      await sharp(src).webp({ quality: 80, effort: 6 }).toFile(out);
      const outSize = fs.statSync(out).size;
      before += inSize; after += outSize; done++;
    } catch (err) {
      console.error('FAIL', src, err.message);
    }
  }
  const mb = n => (n / 1048576).toFixed(2);
  console.log(`Converted ${done}/${files.length} files`);
  console.log(`Before: ${mb(before)} MB  ->  After (webp): ${mb(after)} MB  (saved ${(100 - after / before * 100).toFixed(1)}%)`);
})();
