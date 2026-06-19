# Performance Report

## Release Readiness

- Status: GO
- Updated At: 2026-06-01 00:18 local
- Basis:
  - No HTML/CSS/JS errors in checked files
  - Accessibility/mobile QA checks passing
  - Performance optimizations from Stage 2 applied and verified

Date: 2026-06-01

## Scope

This report tracks practical front-end performance improvements made to the static multi-page site and records an approximate local transfer baseline.

## Changes Applied

1. Script loading optimization
- Added `defer` to `js/shared-footer.js`, `js/script.js`, and `js/subpage.js` on all pages.

2. Font loading optimization
- Added preconnect hint for `https://fonts.gstatic.com` (with `crossorigin`) on all pages.

3. Image loading and rendering optimization
- Added lazy/async decode on footer logo images.
- Added explicit intrinsic dimensions to logos to reduce layout shifts:
  - Navbar logo: `width="113" height="38"`
  - Footer logo: `width="95" height="32"`
- Added `fetchpriority="low"` for footer logos.
- Updated `js/shared-footer.js` template so injected footer markup includes the same optimized logo attributes.

4. Accessibility + mobile QA improvements (performance-adjacent UX stability)
- Synced `aria-expanded` state on hamburger and dropdown buttons.
- Added keyboard support for dropdowns (`Enter`, `Space`, `ArrowDown`, `Escape`).
- Added Escape and outside-click close behavior for mobile menu.
- Added visible focus styles for keyboard users in nav and dropdown controls.

## Approximate Local Transfer Baseline

Method:
- Summed local HTML + CSS + JS + logo image bytes.
- This excludes network compression, browser cache nuances, and third-party timing.

| Page | HTML (KB) | First Load (KB) | Repeat Visit (KB) |
| --- | ---: | ---: | ---: |
| index.html | 52.3 | 286.6 | 146.7 |
| blog.html | 13.0 | 240.4 | 100.6 |
| footer.html | 7.1 | 234.6 | 94.7 |
| residential.html | 6.9 | 234.3 | 94.5 |
| commercial.html | 6.8 | 234.3 | 94.4 |
| society.html | 6.8 | 234.3 | 94.5 |
| calculator.html | 8.6 | 236.1 | 96.2 |
| faq.html | 7.6 | 235.1 | 95.2 |

Largest image asset currently in repo:
- `image/clans_logo.png` = 143,230 bytes

## Tooling Constraint

Local image conversion binaries are not currently available in this environment:
- `magick` not found
- `cwebp` not found

## Recommended Next Step

When a converter is available, generate modern image variants and wire fallback markup:
- Add `image/clans_logo.webp` and `image/clans_logo.avif`
- Use `<picture>` with AVIF/WebP source order and PNG fallback
- Re-measure with Lighthouse or WebPageTest for real network/compression impact

## Manual QA Checklist (2026-06-01)

Status legend:
- PASS: Verified working in static and/or runtime checks.
- NEEDS FIX: Issue found and pending.

### Static QA

- PASS: No lint/compile errors in HTML/CSS/JS files.
- PASS: `defer` present for site scripts across all pages.
- PASS: `fonts.gstatic.com` preconnect present across all pages.
- PASS: Navbar and footer logo performance attributes present across checked pages.

### Runtime QA

- PASS: Mobile hamburger updates `aria-expanded` and opens/closes nav correctly.
- PASS: Services dropdown updates `aria-expanded` and opens/closes correctly.
- PASS: Escape closes open nav/dropdown on mobile and desktop.
- PASS: ArrowDown from Services button opens dropdown and focuses first visible link on desktop.
- PASS: Outside click closes mobile nav.

### Issue Found and Resolved During QA

- RESOLVED: Document-level click handlers assumed `e.target.closest` always exists.
  - Cause: Non-Element event targets can occur in certain synthetic/bubbled paths.
  - Fix: Added safe `Element` target guards before calling `closest` in both scripts.
  - Files: `js/script.js`, `js/subpage.js`.
