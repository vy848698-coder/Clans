/* ============================================================
   CLANS MACHINA — SHARED THEME PICKER
   Injects the theme button + panel on every page (if not already
   present) and applies the saved theme. Default: Mint Fresh.
   ============================================================ */
(function () {
  'use strict';

  // Bumped to v2 so the new Mint Fresh default applies even to visitors
  // who previously had an older default saved in localStorage.
  var THEME_KEY = 'cm_theme_v2';
  var DEFAULT_THEME = 'mint-fresh';

  var BTN_HTML =
    '<button class="theme-picker-btn" id="themePickerBtn" aria-label="Switch theme" title="Switch theme">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>' +
        '<circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>' +
      '</svg> Themes' +
    '</button>';

  function swatch(theme, label, bg, a, b) {
    return '<button class="theme-swatch" data-theme="' + theme + '">' +
      '<span class="swatch-preview" style="--sw-bg:' + bg + '; --sw-a:' + a + '; --sw-b:' + b + ';"></span>' +
      '<span class="swatch-label">' + label + '</span></button>';
  }

  var PANEL_HTML =
    '<div class="theme-overlay" id="themeOverlay"></div>' +
    '<aside class="theme-panel" id="themePanel" aria-label="Theme picker">' +
      '<div class="theme-panel-header"><h3>&#127912; Choose Theme</h3>' +
        '<button class="theme-panel-close" id="themePanelClose" aria-label="Close">&times;</button></div>' +
      '<div class="theme-group"><p class="theme-group-label">&#9733; Default</p><div class="theme-swatches">' +
        swatch('mint-fresh', 'Mint Fresh', '#f0fdf8', '#059669', '#0284c7') +
      '</div></div>' +
      '<div class="theme-group"><p class="theme-group-label">&#9788; Light Themes</p><div class="theme-swatches">' +
        swatch('solar-premium', 'Solar Premium', '#16130d', '#f5b234', '#5cb3df') +
        swatch('solar-white', 'Solar White', '#fffbf0', '#d97706', '#dc2626') +
        swatch('sky-light', 'Sky Light', '#eef3fc', '#1d4ed8', '#0891b2') +
        swatch('sunrise-warm', 'Sunrise Warm', '#fdf6ec', '#ea580c', '#ca8a04') +
      '</div></div>' +
      '<div class="theme-group"><p class="theme-group-label">&#9670; Mid Themes</p><div class="theme-swatches">' +
        swatch('slate-teal', 'Slate Teal', '#182f3d', '#14b8a6', '#38bdf8') +
        swatch('ocean-depth', 'Ocean Depth', '#0c1e30', '#06b6d4', '#818cf8') +
      '</div></div>' +
      '<div class="theme-group"><p class="theme-group-label">&#9679; Dark Themes</p><div class="theme-swatches">' +
        swatch('industrial', 'Industrial', '#111518', 'currentColor', 'currentColor') +
        swatch('midnight-navy', 'Midnight', '#060c18', '#3b82f6', '#a78bfa') +
        swatch('obsidian-purple', 'Obsidian', '#0e0b1a', 'currentColor', '#e8c468') +
        swatch('carbon-ember', 'Carbon Ember', '#13100e', '#f97316', '#fbbf24') +
      '</div></div>' +
    '</aside>';

  function applyTheme(name) {
    var html = document.documentElement;
    if (name === 'industrial' || !name) {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', name);
    }
    document.querySelectorAll('.theme-swatch').forEach(function (s) {
      var isActive = (s.dataset.theme === name) || (!name && s.dataset.theme === 'industrial');
      s.classList.toggle('active', isActive);
    });
    try { localStorage.setItem(THEME_KEY, name); } catch (e) {}
  }

  function init() {
    // Inject the button into the navbar actions if a page doesn't have it.
    if (!document.getElementById('themePickerBtn')) {
      var actions = document.querySelector('.nav-actions');
      if (actions) actions.insertAdjacentHTML('afterbegin', BTN_HTML);
    }
    // Inject the panel + overlay if a page doesn't have it.
    if (!document.getElementById('themePanel')) {
      document.body.insertAdjacentHTML('beforeend', PANEL_HTML);
    }

    var btn = document.getElementById('themePickerBtn');
    var panel = document.getElementById('themePanel');
    var overlay = document.getElementById('themeOverlay');
    var closeBtn = document.getElementById('themePanelClose');

    function open() { if (!panel) return; panel.classList.add('open'); if (overlay) overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function close() { if (!panel) return; panel.classList.remove('open'); if (overlay) overlay.classList.remove('active'); document.body.style.overflow = ''; }

    if (btn) btn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);

    document.querySelectorAll('.theme-swatch').forEach(function (b) {
      b.addEventListener('click', function () { applyTheme(b.dataset.theme); setTimeout(close, 220); });
    });

    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved || DEFAULT_THEME);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
