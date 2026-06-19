# Clans Machina — Design System (libraries & tokens)

The "best library" picks for the redesign, all **self-hosted** (no CDN dependency).

## Fonts  ✅ self-hosted
The two best free fonts for this kind of product site are already in use:

| Role | Font | Why |
|------|------|-----|
| Display / headings | **Space Grotesk** | Geometric, techy, premium feel |
| UI / body | **Inter** | The de-facto modern UI font, superb legibility |

- Files: `fonts/inter-variable.woff2`, `fonts/space-grotesk-variable.woff2` (variable woff2, latin subset, ~70 KB total).
- Declared in `css/fonts.css` (one `@font-face` per family, weight range `300 900` / `400 700`).
- Used via the existing vars in `css/styles.css`: `--font-main` (Inter), `--font-display` (Space Grotesk).
- To use on a page: add `<link rel="stylesheet" href="css/fonts.css">` **before** `styles.css`. No Google Fonts `<link>` needed anymore.

## Icons  ✅ two options
1. **Inline SVG** (used on the new landing) — zero load, crisp, fully theme-colored via `currentColor`. Best for hero/marketing pages.
2. **Lucide** (best open icon library) — self-hosted at `js/lib/lucide.min.js`.
   - Use: `<i data-lucide="sun"></i>` … then load `<script src="js/lib/lucide.min.js"></script>` and call `lucide.createIcons();`.
   - Browse icons: https://lucide.dev/icons
   - Other pages (about/faq/etc.) already use this pattern — just swap their `unpkg` CDN line for the local file.

## Colors  ✅ already best-in-class (no library needed)
Colors are a **CSS-variable token system** in `css/styles.css`, driven by the theme switcher — better than any external palette library. Always reference the variable, never a hard-coded hex, so themes keep working.

Default theme = **Solar White** (white + orange):

| Token | Value | Use |
|-------|-------|-----|
| `--green` (accent) | `#d97706` | Primary orange — buttons, highlights, icons |
| `--blue` (accent 2) | `#dc2626` | Secondary red accent |
| `--bg-primary` | `#fffbf0` | Page background |
| `--bg-secondary` | `#fff7e6` | Alternating section bg |
| `--text-primary` | `#1c1410` | Headings / strong text |
| `--text-secondary` | `rgba(28,20,16,.72)` | Body text |
| `--border` | `rgba(0,0,0,.1)` | Card borders |
| `--btn-neon-text` | `#ffffff` | Text on orange buttons |

Other themes (Sky Light, Mint, Sunrise, Solar Premium, dark themes…) override these same tokens — see the `[data-theme="…"]` blocks in `styles.css`.
