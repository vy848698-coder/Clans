// Rewrite image references in HTML/JS from .jpg/.jpeg/.png to .webp,
// but ONLY when the corresponding .webp file actually exists on disk.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const targets = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '_originals' || e.name === '.git' || e.name === 'scripts') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js)$/i.test(e.name)) targets.push(p);
  }
})(ROOT);

// matches paths like ../image/foo/bar.jpg or image/baz.png inside quotes/url()
// greedy base so the LAST extension is matched (handles foo.png.png)
const re = /([^"'()\s]*image\/[^"'()\s]+)\.(jpe?g|png)/gi;
let fileCount = 0, refCount = 0, skipped = 0;

for (const file of targets) {
  const dir = path.dirname(file);
  let changed = false;
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(re, (m, base, ext) => {
    const webpRel = base + '.webp';
    // decode %20 etc. so the on-disk check matches real filenames
    let abs;
    try { abs = path.resolve(dir, decodeURIComponent(webpRel)); }
    catch { abs = path.resolve(dir, webpRel); }
    if (fs.existsSync(abs)) { refCount++; changed = true; return webpRel; }
    skipped++; return m;
  });
  if (changed) { fs.writeFileSync(file, out); fileCount++; }
}
console.log(`Rewrote ${refCount} refs across ${fileCount} files. Skipped ${skipped} (no .webp on disk).`);
