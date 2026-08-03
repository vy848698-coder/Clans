// Builds the compressed artwork used by the site-wide lead popup
// (js/popup-modal.js) from the full-size source image/popup.png.
//
// Two crops are produced so each viewport downloads only what it shows:
//   popup.webp        portrait panel for the desktop card (left column)
//   popup-wide.webp   short banner strip for the mobile card (top)
//
// Run:  node scripts/build-popup-image.js
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'image');
const SRC = path.join(ROOT, 'popup.png');

// The family sits left of centre in the 1536x1024 source, so both crops are
// taken as explicit regions rather than a plain centre/attention cover — an
// automatic crop clips the mother out of the portrait cut entirely.
const OUTPUTS = [
  {
    file: 'popup.webp',
    extract: { left: 260, top: 0, width: 900, height: 1024 },
    width: 820, height: 933, quality: 74,
  },
  // The mobile banner must fit ALL FOUR faces plus the roof panels. That needs
  // most of the source's height (the boy's face sits low, around y=820), which
  // caps the banner at roughly 1.9:1 — anything wider crops him out.
  {
    file: 'popup-wide.webp',
    extract: { left: 0, top: 60, width: 1536, height: 800 },
    width: 1000, height: 521, quality: 74,
  },
];

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error('Missing source: ' + SRC);
    process.exit(1);
  }
  const srcKb = (fs.statSync(SRC).size / 1024).toFixed(0);
  console.log(`source popup.png  ${srcKb} KB`);

  for (const out of OUTPUTS) {
    const dest = path.join(ROOT, out.file);
    await sharp(SRC)
      .extract(out.extract)
      .resize(out.width, out.height, { fit: 'cover' })
      .webp({ quality: out.quality, effort: 6 })
      .toFile(dest);
    const kb = (fs.statSync(dest).size / 1024).toFixed(0);
    console.log(`  -> ${out.file}  ${out.width}x${out.height}  ${kb} KB`);
  }
})();
