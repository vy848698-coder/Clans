/**
 * Homepage lead-capture popup.
 *
 * Opens 5 seconds after the page settles — on every visit and every refresh,
 * unconditionally, by the client's decision. There is no "already seen" or
 * "already submitted" rule, so a visitor who books a consultation and then
 * reloads will see it again and can submit twice; expect some duplicate rows
 * in the leads table.
 *
 * Collects Name / PIN / WhatsApp / monthly bill and posts to
 * submit-contact.php (the same endpoint as the contact form) with
 * source:'popup', which lets the server skip the otherwise mandatory email
 * address.
 *
 * Loaded from a script tag in index.html only — deliberately not from
 * js/shared-footer.js, which would put it on every page. Styles, DOM and
 * behaviour are all injected from here, so there is no markup in the page.
 * Paths are therefore site-root relative, matching index.html's own location.
 */
(function () {
  'use strict';

  var DELAY_MS      = 5000;            // wait before opening
  var PRELOAD_LEAD  = 1800;            // fetch artwork this early, so it paints instantly

  // No suppression state is stored at all — nothing in localStorage or
  // sessionStorage — so every homepage load shows the popup.

  /* ---------- styles ---------- */

  // Brand palette. The card is always light, so these are the deep-green values
  // the site uses on light surfaces (same family as the .btn-neon green and the
  // #0f6f47 in the transactional emails) rather than the theme variables, which
  // flip to orange/red under the alternate site themes.
  var css = [
    ':root{--cmp-green:#0b7a4b;--cmp-green-lite:#16b365;--cmp-green-soft:#eaf7f0;--cmp-ink:#0d1f18;}',

    // No backdrop blur, and a light scrim: the client wants the page itself to
    // stay readable behind the popup. Separation comes from the card's shadow
    // and its white surface instead.
    '.cm-pop-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;',
    'padding:20px;background:rgba(6,16,12,.42);',
    'opacity:0;visibility:hidden;transition:opacity .32s ease,visibility .32s ease;overflow-y:auto;}',
    '.cm-pop-overlay.is-open{opacity:1;visibility:visible;}',

    // Column split and title size are tuned together so "Switch to solar at
    // ₹0 Investment" stays on one line at desktop, as in the approved design.
    '.cm-pop-card{position:relative;display:grid;grid-template-columns:minmax(0,0.82fr) minmax(0,1.18fr);',
    'width:min(100%,940px);margin:auto;background:#fff;border-radius:22px;overflow:hidden;',
    'box-shadow:0 30px 90px rgba(4,20,14,.5),0 0 0 1px rgba(11,122,75,.1);',
    'transform:translateY(18px) scale(.97);opacity:0;',
    'transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .38s ease;',
    'font-family:var(--font-main,"Inter",sans-serif);color:var(--cmp-ink);line-height:1.5;}',
    '.cm-pop-overlay.is-open .cm-pop-card{transform:none;opacity:1;}',

    /* left artwork, with a brand scrim so the overlaid subsidy badge reads */
    '.cm-pop-media{position:relative;min-height:100%;background:#e6f1ea;}',
    '.cm-pop-media img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 28%;}',
    '.cm-pop-media::after{content:"";position:absolute;left:0;right:0;bottom:0;height:46%;pointer-events:none;',
    'background:linear-gradient(to top,rgba(6,32,21,.82),rgba(6,32,21,.28) 45%,transparent);}',
    '.cm-pop-badge{position:absolute;left:16px;right:16px;bottom:16px;z-index:2;color:#fff;}',
    '.cm-pop-badge strong{display:block;font-family:var(--font-display,"Space Grotesk","Inter",sans-serif);',
    'font-size:1.16rem;line-height:1.2;letter-spacing:-.01em;}',
    '.cm-pop-badge span{display:block;margin-top:3px;font-size:.76rem;color:rgba(255,255,255,.82);}',

    /* right panel */
    '.cm-pop-body{position:relative;padding:30px 32px 26px;display:flex;flex-direction:column;justify-content:center;}',
    // Soft brand glow behind the form, so the white panel is not flat.
    '.cm-pop-body::before{content:"";position:absolute;top:-70px;right:-70px;width:260px;height:260px;',
    'border-radius:50%;background:radial-gradient(circle,rgba(22,179,101,.13),transparent 68%);pointer-events:none;}',
    '.cm-pop-body>*{position:relative;}',

    '.cm-pop-close{position:absolute;top:12px;right:12px;width:36px;height:36px;display:flex;align-items:center;',
    'justify-content:center;border:0;border-radius:50%;background:rgba(13,31,24,.06);color:#5a6b62;cursor:pointer;',
    'font-size:22px;line-height:1;transition:background .2s ease,color .2s ease;}',
    '.cm-pop-close:hover{background:rgba(13,31,24,.12);color:var(--cmp-ink);}',
    '.cm-pop-close:focus-visible{outline:2px solid var(--cmp-green-lite);outline-offset:2px;}',

    /* eyebrow pill */
    '.cm-pop-eyebrow{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;margin:0 0 11px;',
    'padding:6px 13px 6px 10px;border-radius:999px;background:var(--cmp-green-soft);',
    'border:1px solid rgba(11,122,75,.18);color:var(--cmp-green);font-size:.71rem;font-weight:700;',
    'letter-spacing:.07em;text-transform:uppercase;}',
    '.cm-pop-dot{width:7px;height:7px;border-radius:50%;background:var(--cmp-green-lite);',
    'box-shadow:0 0 0 0 rgba(22,179,101,.55);animation:cm-pop-pulse 2.1s infinite;}',
    '@keyframes cm-pop-pulse{70%{box-shadow:0 0 0 7px rgba(22,179,101,0);}100%{box-shadow:0 0 0 0 rgba(22,179,101,0);}}',

    '.cm-pop-title{font-family:var(--font-display,"Space Grotesk","Inter",sans-serif);font-weight:700;',
    'font-size:clamp(1.42rem,2.1vw,1.72rem);line-height:1.2;letter-spacing:-.022em;color:var(--cmp-ink);',
    'margin:0 0 7px;padding-right:38px;}',
    '.cm-pop-title span{color:var(--cmp-green);background:linear-gradient(95deg,var(--cmp-green),var(--cmp-green-lite));',
    '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}',
    '.cm-pop-sub{margin:0 0 14px;font-size:.94rem;color:#5c6b64;line-height:1.45;}',
    '.cm-pop-offer{margin:0 0 15px;font-size:.98rem;font-weight:600;color:var(--cmp-ink);}',
    '.cm-pop-offer b{display:inline-block;padding:2px 8px;border-radius:7px;background:var(--cmp-green-soft);',
    'color:var(--cmp-green);font-weight:800;white-space:nowrap;}',

    '.cm-pop-form{display:flex;flex-direction:column;gap:10px;}',
    '.cm-pop-form input,.cm-pop-form select{width:100%;height:52px;padding:0 16px;font-size:.97rem;color:var(--cmp-ink);',
    'background:#fbfdfc;border:1px solid #d7e2dc;border-radius:11px;',
    'transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;',
    '-webkit-appearance:none;appearance:none;}',
    '.cm-pop-form input::placeholder{color:#93a29b;}',
    '.cm-pop-form select{color:#93a29b;cursor:pointer;padding-right:44px;',
    'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'9\' viewBox=\'0 0 14 9\' fill=\'none\'%3E%3Cpath d=\'M1 1l6 6 6-6\' stroke=\'%230b7a4b\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");',
    'background-repeat:no-repeat;background-position:right 17px center;}',
    '.cm-pop-form select.has-value{color:var(--cmp-ink);}',
    '.cm-pop-form select option{color:var(--cmp-ink);}',
    '.cm-pop-form input:focus,.cm-pop-form select:focus{outline:0;background:#fff;',
    'border-color:var(--cmp-green-lite);box-shadow:0 0 0 3px rgba(22,179,101,.16);}',
    '.cm-pop-form .is-invalid{border-color:#e5533d;box-shadow:0 0 0 3px rgba(229,83,61,.14);}',

    '.cm-pop-submit{display:flex;align-items:center;justify-content:center;gap:9px;height:56px;margin-top:6px;',
    'border:0;border-radius:11px;color:#fff;font-size:1rem;font-weight:700;font-family:inherit;cursor:pointer;',
    'letter-spacing:.01em;background:linear-gradient(95deg,var(--cmp-green),var(--cmp-green-lite));',
    'box-shadow:0 8px 22px rgba(11,122,75,.28);',
    'transition:filter .2s ease,transform .15s ease,box-shadow .2s ease;}',
    '.cm-pop-submit svg{flex:none;transition:transform .2s ease;}',
    '.cm-pop-submit:hover:not(:disabled){filter:brightness(1.07);box-shadow:0 12px 30px rgba(11,122,75,.38);',
    'transform:translateY(-1px);}',
    '.cm-pop-submit:hover:not(:disabled) svg{transform:translateX(3px);}',
    '.cm-pop-submit:disabled{opacity:.65;cursor:default;box-shadow:none;}',
    '.cm-pop-submit:focus-visible{outline:2px solid var(--cmp-green);outline-offset:2px;}',

    '.cm-pop-msg{display:none;margin-top:11px;padding:10px 13px;border-radius:9px;font-size:.87rem;line-height:1.45;}',
    '.cm-pop-msg.is-error{display:block;background:#fdecea;border:1px solid #f6c9c1;color:#9c3524;}',

    /* trust strip under the CTA */
    '.cm-pop-trust{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 14px;',
    'margin:13px 0 0;font-size:.76rem;color:#6b7a72;}',
    '.cm-pop-trust i{font-style:normal;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}',
    '.cm-pop-trust b{color:var(--cmp-ink);font-weight:700;}',
    '.cm-pop-star{color:#e8a92c;}',

    /* success state */
    '.cm-pop-done{display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;',
    'gap:12px;padding:26px 6px;min-height:320px;}',
    '.cm-pop-card.is-done .cm-pop-form,.cm-pop-card.is-done .cm-pop-offer,.cm-pop-card.is-done .cm-pop-eyebrow,',
    '.cm-pop-card.is-done .cm-pop-sub,.cm-pop-card.is-done .cm-pop-trust{display:none;}',
    '.cm-pop-card.is-done .cm-pop-done{display:flex;}',
    '.cm-pop-tick{width:64px;height:64px;border-radius:50%;background:var(--cmp-green-soft);color:var(--cmp-green);',
    'display:flex;align-items:center;justify-content:center;}',
    '.cm-pop-done h3{font-family:var(--font-display,"Space Grotesk","Inter",sans-serif);font-size:1.35rem;',
    'color:var(--cmp-ink);margin:0;}',
    '.cm-pop-done p{margin:0;font-size:.94rem;color:#5c6b64;}',

    /* stacked layout — artwork becomes a banner strip */
    '@media (max-width:860px){',
    '.cm-pop-card{grid-template-columns:1fr;width:min(100%,470px);}',
    // Let the banner take its natural height instead of a fixed one: the image
    // is cropped (in build-popup-image.js) to exactly what must be seen, so any
    // fixed height would crop it again and cut the boy out at the bottom.
    '.cm-pop-media{height:auto;min-height:0;}',
    '.cm-pop-media img{height:auto;object-fit:contain;object-position:center;}',
    // Faces reach low in this crop, so keep the bottom scrim shallow and float
    // the subsidy line as a compact glass pill in the free top-left corner.
    '.cm-pop-media::after{height:30%;}',
    '.cm-pop-badge{left:14px;right:auto;bottom:auto;top:12px;display:inline-flex;align-items:center;',
    'padding:6px 13px;border-radius:999px;background:rgba(6,32,21,.6);',
    'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}',
    '.cm-pop-badge strong{font-size:.83rem;}',
    '.cm-pop-badge span{display:none;}',
    '.cm-pop-body{padding:20px 22px 22px;}',
    '.cm-pop-close{background:rgba(255,255,255,.92);color:var(--cmp-ink);box-shadow:0 2px 10px rgba(0,0,0,.2);}',
    '.cm-pop-close:hover{background:#fff;}',
    '.cm-pop-title{padding-right:0;}',
    '}',
    '@media (max-width:420px){',
    '.cm-pop-overlay{padding:12px;}',
    // Tighten the pill so it cannot run under the close button on the narrowest
    // phones, where the body has barely 250px of usable width.
    '.cm-pop-eyebrow{font-size:.62rem;letter-spacing:.04em;padding:5px 11px 5px 9px;}',
    '.cm-pop-form input,.cm-pop-form select{height:50px;}',
    '.cm-pop-submit{height:52px;}',
    '}',

    '@media (prefers-reduced-motion:reduce){',
    '.cm-pop-overlay,.cm-pop-card{transition-duration:.01ms;}',
    '.cm-pop-card{transform:none;}',
    '.cm-pop-dot{animation:none;}',
    '}'
  ].join('');

  /* ---------- markup ---------- */

  var html = [
    '<div class="cm-pop-card" role="dialog" aria-modal="true" aria-labelledby="cmPopTitle">',
    '  <div class="cm-pop-media">',
    '    <picture>',
    '      <source media="(max-width:860px)" srcset="image/popup-wide.webp" width="1000" height="521">',
    '      <img src="image/popup.webp" alt="Indian family outside their home with rooftop solar panels" width="820" height="933" decoding="async">',
    '    </picture>',
    '    <div class="cm-pop-badge">',
    '      <strong>&#8377;1,38,000 subsidy</strong>',
    '      <span>Filed and handled for you, start to finish</span>',
    '    </div>',
    '  </div>',
    '  <div class="cm-pop-body">',
    '    <button type="button" class="cm-pop-close" aria-label="Close">&times;</button>',
    '    <p class="cm-pop-eyebrow"><span class="cm-pop-dot"></span>PM Surya Ghar &#183; Subsidy open</p>',
    '    <h2 class="cm-pop-title" id="cmPopTitle">Switch to solar at <span>&#8377;0 Investment</span></h2>',
    '    <p class="cm-pop-sub">Govt. subsidy covers your down payment, savings cover EMIs</p>',
    '    <p class="cm-pop-offer">Book a free consultation &amp; save up to <b>&#8377;78,000</b></p>',
    '    <form class="cm-pop-form" novalidate>',
    '      <input type="text" name="name" placeholder="Full Name*" autocomplete="name" maxlength="80">',
    '      <input type="tel" name="pin" placeholder="PIN Code*" autocomplete="postal-code" inputmode="numeric" maxlength="6">',
    '      <input type="tel" name="phone" placeholder="WhatsApp Number*" autocomplete="tel" inputmode="numeric" maxlength="14">',
    '      <select name="bill">',
    '        <option value="">Monthly Electricity Bill*</option>',
    '        <option>Below &#8377;1,000</option>',
    '        <option>&#8377;1,000 &#8211; &#8377;2,500</option>',
    '        <option>&#8377;2,500 &#8211; &#8377;5,000</option>',
    '        <option>&#8377;5,000 &#8211; &#8377;10,000</option>',
    '        <option>Above &#8377;10,000</option>',
    '      </select>',
    '      <button type="submit" class="cm-pop-submit">Book a FREE Consultation',
    '        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '      </button>',
    '      <div class="cm-pop-msg" role="alert"></div>',
    '    </form>',
    '    <p class="cm-pop-trust">',
    '      <i><span class="cm-pop-star">&#9733;</span> <b>4.8</b> on Google</i>',
    '      <i><b>1,000+</b> homes powered</i>',
    '      <i>Free site visit</i>',
    '    </p>',
    '    <div class="cm-pop-done">',
    '      <div class="cm-pop-tick"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>',
    '      <h3>Thank you!</h3>',
    '      <p>Our solar expert will call you on WhatsApp within 2 hours.</p>',
    '    </div>',
    '  </div>',
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

  var card    = overlay.querySelector('.cm-pop-card');
  var form    = overlay.querySelector('.cm-pop-form');
  var msg     = overlay.querySelector('.cm-pop-msg');
  var submit  = overlay.querySelector('.cm-pop-submit');
  var submitLabel = submit.innerHTML;   // captured with its arrow icon, for restoring after an error
  var billSel = form.elements.bill;
  var lastFocus = null;
  var isOpen = false;

  /* ---------- open / close ---------- */

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    // Focus the first field, but not on touch devices where it yanks up the
    // keyboard and hides the offer the popup is there to make.
    if (!window.matchMedia('(hover:none)').matches) {
      setTimeout(function () { form.elements.name.focus(); }, 380);
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  overlay.querySelector('.cm-pop-close').addEventListener('click', close);
  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay) close();          // backdrop click only
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });

  // Keep Tab inside the dialog while it is open.
  overlay.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var items = overlay.querySelectorAll('button,input,select,a[href]');
    var list = Array.prototype.filter.call(items, function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- validation + submit ---------- */

  function fail(field, text) {
    field.classList.add('is-invalid');
    msg.textContent = text;
    msg.classList.add('is-error');
    field.focus();
    return false;
  }

  form.addEventListener('input', function (e) {
    e.target.classList.remove('is-invalid');
    msg.classList.remove('is-error');
  });
  billSel.addEventListener('change', function () {
    billSel.classList.toggle('has-value', !!billSel.value);
    billSel.classList.remove('is-invalid');
    msg.classList.remove('is-error');
  });

  function validate() {
    var f = form.elements;
    var name  = f.name.value.trim();
    var pin   = f.pin.value.replace(/\D/g, '');
    var phone = f.phone.value.replace(/\D/g, '').replace(/^(0|91)(?=\d{10}$)/, '');

    if (name.length < 2)             return fail(f.name, 'Please enter your full name.');
    if (!/^[1-9][0-9]{5}$/.test(pin)) return fail(f.pin, 'Please enter a valid 6-digit PIN code.');
    if (!/^[6-9][0-9]{9}$/.test(phone)) return fail(f.phone, 'Please enter a valid 10-digit WhatsApp number.');
    if (!f.bill.value)               return fail(f.bill, 'Please select your monthly electricity bill.');

    return { name: name, pin: pin, phone: phone, bill: f.bill.value };
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.classList.remove('is-error');

    var data = validate();
    if (!data) return;

    submit.disabled = true;
    submit.textContent = 'Sending...';   // drops the arrow; submitLabel restores it

    fetch('submit-contact.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source:  'popup',
        name:    data.name,
        phone:   data.phone,
        email:   '',
        city:    'PIN ' + data.pin,
        service: 'Popup — Free Consultation',
        bill:    data.bill,
        message: 'Lead from the homepage popup. PIN Code: ' + data.pin + '. No email address collected — contact on WhatsApp.'
      })
    })
      .then(function (res) {
        return res.text().then(function (text) {
          try { return JSON.parse(text); }
          catch (err) { throw new Error('Server error (HTTP ' + res.status + '). Please try again.'); }
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.message || 'Submission failed. Please try again.');
        card.classList.add('is-done');
        setTimeout(close, 3200);
      })
      .catch(function (err) {
        msg.textContent = err && err.message ? err.message : 'Network error. Please try again.';
        msg.classList.add('is-error');
        submit.disabled = false;
        submit.innerHTML = submitLabel;
      });
  });

  /* ---------- schedule ---------- */

  // Warm the artwork before the reveal so the card never pops in half-painted.
  setTimeout(function () {
    var img = new Image();
    img.src = window.matchMedia('(max-width:860px)').matches
      ? 'image/popup-wide.webp'
      : 'image/popup.webp';
  }, Math.max(0, DELAY_MS - PRELOAD_LEAD));

  setTimeout(open, DELAY_MS);
})();
