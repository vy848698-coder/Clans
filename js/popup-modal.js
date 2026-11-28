/**
 * Homepage "Meet Saathi" popup.
 *
 * Introduces the Solar Saathi chatbot and sends the visitor to it
 * (https://saathi.clansmachina.com/, or the local dev server — the URL comes
 * from window.ClansSaathi, set up in js/shared-footer.js).
 *
 * Opens 5 seconds after the page settles, on every visit and every refresh,
 * the same timing the earlier lead-form popup used. Nothing is stored.
 *
 * Loaded from a script tag in index.html only, after shared-footer.js, so the
 * Saathi mascot (window.ClansSaathi.bot) is already available. Styles, DOM and
 * behaviour are all injected from here. The overlay keeps the .cm-pop-overlay
 * class name because shared-footer.js and styles.css use it to keep the small
 * Saathi teaser out of the way while this is open.
 */
(function () {
  'use strict';

  var DELAY_MS = 5000;

  var S = window.ClansSaathi || {};
  var SAATHI_URL = S.url || 'https://saathi.clansmachina.com/';

  /* ---------- styles ---------- */

  // Fixed light palette (the card is always light), in the site's deep greens
  // rather than theme variables, which flip under the alternate site themes.
  var css = [
    '.cm-pop-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;',
    'padding:20px;background:rgba(6,16,12,.45);opacity:0;visibility:hidden;',
    'transition:opacity .32s ease,visibility .32s ease;overflow-y:auto;}',
    '.cm-pop-overlay.is-open{opacity:1;visibility:visible;}',

    '.cm-sb{position:relative;width:min(100%,680px);margin:auto;border-radius:22px;overflow:hidden;',
    'background:linear-gradient(150deg,#e9f8f0 0%,#f3fbf7 45%,#e4f4ec 100%);',
    'box-shadow:0 30px 90px rgba(4,20,14,.5),0 0 0 1px rgba(11,122,75,.12);',
    'font-family:var(--font-main,"Inter",sans-serif);color:#0d1f18;line-height:1.5;',
    'transform:translateY(18px) scale(.97);opacity:0;',
    'transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .38s ease;}',
    '.cm-pop-overlay.is-open .cm-sb{transform:none;opacity:1;}',

    '.cm-sb-close{position:absolute;top:12px;right:12px;z-index:3;width:36px;height:36px;display:flex;',
    'align-items:center;justify-content:center;border:0;border-radius:50%;background:rgba(13,31,24,.07);',
    'color:#3d4f47;cursor:pointer;font-size:22px;line-height:1;transition:background .2s ease;}',
    '.cm-sb-close:hover{background:rgba(13,31,24,.14);}',
    '.cm-sb-close:focus-visible{outline:2px solid #16b365;outline-offset:2px;}',

    /* hero: heading left, mascot right */
    '.cm-sb-hero{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;',
    'padding:30px 34px 18px;}',
    '.cm-sb-kicker{margin:0;font-family:var(--font-display,"Space Grotesk","Inter",sans-serif);font-weight:700;',
    'font-size:clamp(1.35rem,3.2vw,1.9rem);line-height:1.15;letter-spacing:-.02em;}',
    '.cm-sb-name{display:block;margin:2px 0 8px;font-family:var(--font-display,"Space Grotesk","Inter",sans-serif);',
    'font-weight:800;font-size:clamp(2.4rem,6.4vw,3.5rem);line-height:1;letter-spacing:-.035em;',
    'background:linear-gradient(95deg,#0b7a4b,#16b365);-webkit-background-clip:text;background-clip:text;',
    '-webkit-text-fill-color:transparent;color:#0b7a4b;}',
    '.cm-sb-tag{margin:0;font-size:1rem;color:#4b5d55;max-width:300px;}',
    '.cm-sb-tag b{color:#0b7a4b;}',

    '.cm-sb-mascot{position:relative;width:170px;height:150px;}',
    '.cm-sb-mascot::before{content:"";position:absolute;inset:6% 2% 0;border-radius:50%;',
    'background:radial-gradient(circle,rgba(22,179,101,.22),transparent 68%);}',
    '.cm-sb-bot{position:relative;width:100%;height:100%;filter:drop-shadow(0 12px 18px rgba(6,40,26,.22));',
    'animation:cm-sb-float 3.6s ease-in-out infinite;}',
    '@keyframes cm-sb-float{50%{transform:translateY(-6px);}}',
    '.cm-sb-bubble{position:absolute;right:-6px;bottom:8px;width:46px;height:46px;border-radius:50%;',
    'background:#0b7a4b;color:#fff;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 6px 16px rgba(11,122,75,.4);border:3px solid #fff;}',
    '.cm-sb-bubble i{width:5px;height:5px;margin:0 2px;border-radius:50%;background:#fff;',
    'animation:cm-sb-dots 1.2s infinite;}',
    '.cm-sb-bubble i:nth-child(2){animation-delay:.15s;}.cm-sb-bubble i:nth-child(3){animation-delay:.3s;}',
    '@keyframes cm-sb-dots{0%,60%,100%{opacity:.4;transform:none;}30%{opacity:1;transform:translateY(-2px);}}',

    /* white panel: copy + CTA left, QR right */
    '.cm-sb-panel{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;',
    'margin:0 18px;padding:22px 22px;border-radius:16px;background:#fff;',
    'box-shadow:0 6px 24px rgba(6,40,26,.07);}',
    '.cm-sb-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px;}',
    '.cm-sb-panel h3{margin:0;font-family:var(--font-display,"Space Grotesk","Inter",sans-serif);',
    'font-size:1.14rem;line-height:1.25;letter-spacing:-.01em;}',
    '.cm-sb-time{flex:none;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;',
    'background:#eaf7f0;color:#0b7a4b;font-size:.72rem;font-weight:700;white-space:nowrap;}',

    /* feature rows: icon tile + title + one-line detail */
    '.cm-sb-feats{margin:0 0 18px;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;}',
    '.cm-sb-feats li{display:flex;align-items:center;gap:12px;}',
    '.cm-sb-ic{flex:none;width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;',
    'background:linear-gradient(145deg,#eaf7f0,#d6f0e2);color:#0b7a4b;box-shadow:inset 0 0 0 1px rgba(11,122,75,.1);}',
    '.cm-sb-feats strong{display:block;font-size:.92rem;font-weight:700;color:#0d1f18;line-height:1.3;}',
    '.cm-sb-feats small{display:block;font-size:.8rem;color:#6b7a72;line-height:1.35;}',

    '.cm-sb-cta{display:flex;align-items:center;justify-content:center;gap:9px;min-height:52px;padding:10px 18px;',
    'border-radius:11px;color:#fff;font-size:.98rem;font-weight:700;text-decoration:none;letter-spacing:.01em;',
    'background:linear-gradient(95deg,#0b7a4b,#16b365);box-shadow:0 8px 22px rgba(11,122,75,.28);',
    'transition:filter .2s ease,transform .15s ease,box-shadow .2s ease;}',
    '.cm-sb-cta svg{transition:transform .2s ease;}',
    '.cm-sb-cta:hover{filter:brightness(1.07);transform:translateY(-1px);box-shadow:0 12px 30px rgba(11,122,75,.38);color:#fff;}',
    '.cm-sb-cta:hover svg{transform:translateX(3px);}',
    '.cm-sb-cta:focus-visible{outline:2px solid #0b7a4b;outline-offset:2px;}',
    '.cm-sb-hint{margin:9px 0 0;font-size:.76rem;color:#7a8a82;text-align:center;}',

    '.cm-sb-qr{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 12px 12px;',
    'border-radius:16px;background:linear-gradient(160deg,#f3fbf7,#e6f5ed);border:1px solid rgba(11,122,75,.14);}',
    '.cm-sb-qr-box{padding:8px;border-radius:12px;background:#fff;box-shadow:0 4px 14px rgba(6,40,26,.1);}',
    '.cm-sb-qr img{display:block;width:124px;height:124px;}',
    '.cm-sb-qr span{display:flex;align-items:center;gap:6px;font-size:.74rem;font-weight:700;color:#0b7a4b;',
    'text-align:center;line-height:1.3;}',
    '.cm-sb:focus{outline:0;}',

    /* trust strip */
    '.cm-sb-foot{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:18px;padding:13px 16px;',
    'background:#0b6b43;color:#fff;font-size:.88rem;font-weight:600;}',

    /* phones: stack, and drop the QR — nobody scans their own screen */
    '@media (max-width:620px){',
    '.cm-pop-overlay{padding:12px;}',
    // Mascot on top, heading centred under it: the side-by-side hero leaves
    // too little width for the heading on a phone.
    '.cm-sb-hero{grid-template-columns:1fr;justify-items:center;text-align:center;padding:16px 18px 14px;gap:2px;}',
    '.cm-sb-mascot{order:-1;width:104px;height:90px;}',
    '.cm-sb-bubble{width:32px;height:32px;border-width:2px;right:-8px;bottom:0;}',
    '.cm-sb-bubble i{width:4px;height:4px;margin:0 1.5px;}',
    '.cm-sb-kicker{font-size:1.3rem;}',
    '.cm-sb-name{font-size:2.5rem;margin:0 0 6px;}',
    '.cm-sb-tag{font-size:.9rem;max-width:290px;margin:0 auto;}',
    '.cm-sb-panel{grid-template-columns:1fr;margin:0 12px;padding:18px 16px 16px;}',
    '.cm-sb-panel h3{font-size:1.04rem;}',
    '.cm-sb-feats{gap:10px;margin-bottom:16px;}',
    '.cm-sb-ic{width:36px;height:36px;}',
    '.cm-sb-qr{display:none;}',
    '.cm-sb-foot{margin-top:14px;font-size:.8rem;}',
    '}',
    '@media (max-width:360px){',
    '.cm-sb-time{display:none;}',
    '.cm-sb-feats small,.cm-sb-hint{display:none;}',
    '.cm-sb-feats{gap:8px;}',
    '.cm-sb-mascot{width:92px;height:80px;}',
    '}',

    '@media (prefers-reduced-motion:reduce){',
    '.cm-pop-overlay,.cm-sb{transition-duration:.01ms;}.cm-sb{transform:none;}',
    '.cm-sb-bot,.cm-sb-bubble i{animation:none;}',
    '}'
  ].join('');

  /* ---------- markup ---------- */

  var arrow = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var shield = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Line icons (Lucide-style, 24-unit grid) for the feature rows.
  var svg = function (w, d) {
    return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  var ic = {
    calc:  svg(19, '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="4" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>'),
    home:  svg(19, '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>'),
    chat:  svg(19, '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.7A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>'),
    clock: svg(12, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    phone: svg(14, '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>')
  };
  var bot = typeof S.bot === 'function' ? S.bot('sbp', 'cm-sb-bot') : '';

  var html = [
    '<div class="cm-sb" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="cmSbTitle">',
    '  <button type="button" class="cm-sb-close" aria-label="Close">&times;</button>',
    '  <div class="cm-sb-hero">',
    '    <div>',
    '      <h2 class="cm-sb-kicker" id="cmSbTitle">Meet your Solar Buddy <span class="cm-sb-name">Saathi</span></h2>',
    '      <p class="cm-sb-tag">Your <b>free</b> guide to <b>rooftop solar</b>, from subsidy to savings.</p>',
    '    </div>',
    bot ? '    <div class="cm-sb-mascot">' + bot + '<span class="cm-sb-bubble" aria-hidden="true"><i></i><i></i><i></i></span></div>' : '',
    '  </div>',
    '  <div class="cm-sb-panel">',
    '    <div>',
    '      <div class="cm-sb-head"><h3>Plan your rooftop solar</h3><span class="cm-sb-time">' + ic.clock + ' 2 min</span></div>',
    '      <ul class="cm-sb-feats">',
    '        <li><span class="cm-sb-ic">' + ic.calc + '</span><span><strong>Savings &amp; subsidy</strong><small>Your exact bill savings and govt. subsidy</small></span></li>',
    '        <li><span class="cm-sb-ic">' + ic.home + '</span><span><strong>Free home visit</strong><small>Book a site survey with our solar experts</small></span></li>',
    '        <li><span class="cm-sb-ic">' + ic.chat + '</span><span><strong>Odia, Hindi or English</strong><small>Ask anything, in the language you like</small></span></li>',
    '      </ul>',
    '      <a class="cm-sb-cta" href="' + SAATHI_URL + '" target="_blank" rel="noopener">Let&#39;s Go ' + arrow + '</a>',
    '      <p class="cm-sb-hint">Opens Saathi in a new tab. No sign-up needed.</p>',
    '    </div>',
    '    <div class="cm-sb-qr">',
    '      <div class="cm-sb-qr-box"><img src="image/saathi-qr.svg" alt="QR code to open Saathi on your phone" width="124" height="124" decoding="async"></div>',
    '      <span>' + ic.phone + ' Scan to chat on phone</span>',
    '    </div>',
    '  </div>',
    '  <div class="cm-sb-foot">' + shield + ' Trusted. Secure. Always here to help.</div>',
    '</div>'
  ].join('');

  /* ---------- build ---------- */

  var styleEl = document.createElement('style');
  styleEl.id = 'cm-popup-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var overlay = document.createElement('div');
  overlay.className = 'cm-pop-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  var cta = overlay.querySelector('.cm-sb-cta');
  var card = overlay.querySelector('.cm-sb');
  var lastFocus = null;
  var isOpen = false;

  /* ---------- open / close ---------- */

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    overlay.classList.add('is-open', 'was-shown');
    document.body.style.overflow = 'hidden';
    if (!window.matchMedia('(hover:none)').matches) {
      setTimeout(function () { card.focus({ preventScroll: true }); }, 380);
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  overlay.querySelector('.cm-sb-close').addEventListener('click', close);
  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay) close();          // backdrop click only
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });

  // Going to Saathi closes the popup, so the homepage is clear on return.
  cta.addEventListener('click', function () {
    if (window.fbq) fbq('trackCustom', 'SaathiPopupClick');
    setTimeout(close, 150);
  });

  // Keep Tab inside the dialog while it is open.
  overlay.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var list = Array.prototype.filter.call(
      overlay.querySelectorAll('button,a[href]'),
      function (el) { return el.offsetParent !== null; }
    );
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- schedule ---------- */

  setTimeout(open, DELAY_MS);
})();
