/* ============================================================
   REVIEWS — loaded from the database (testimonials_api.php) so the
   reviews the owner manages in the admin dashboard appear on the site.

   Any grid marked up like this is filled from the database:
     <div class="testimonials-grid" data-reviews="home" data-review-style="testi" data-review-mark>
   data-reviews       placement key (see PLACEMENTS in testimonials_api.php)
   data-review-style  "testi" → .testi-card (homepage / offering / partnership)
                      "quote" → .proj-quote-card (testimonials.html)
   data-review-mark   (testi only) show the decorative quote icon

   If the request fails, the hard-coded cards in the page stay as a
   fallback. If it succeeds, each grid shows exactly what the dashboard
   has published, and a grid with no reviews hides its section.
   All text is set via textContent, never innerHTML, so owner-entered
   content can't inject markup.
   ============================================================ */
(function () {
  var grids = Array.prototype.slice.call(document.querySelectorAll('[data-reviews]'));
  if (!grids.length || !window.fetch) return;

  // Site root, worked out from this script's own URL so it also works from
  // sub-folders such as /our-offering/.
  var script = document.currentScript || document.querySelector('script[src*="js/testimonials.js"]');
  var BASE = script ? script.src.replace(/js\/testimonials\.js(\?.*)?$/, '') : '';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var GRADIENT = 'background:linear-gradient(135deg,#3ecf8e,#4ea8de);border:2px solid rgba(62,207,142,0.3);';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(paths, size, extraClass) {
    var s = document.createElementNS(SVG_NS, 'svg');
    [['width', size], ['height', size], ['viewBox', '0 0 24 24'], ['fill', 'none'], ['stroke', 'currentColor'],
     ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']].forEach(function (a) {
      s.setAttribute(a[0], a[1]);
    });
    if (extraClass) s.setAttribute('class', extraClass);
    s.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }

  // Lucide "quote" icon (same paths as js/lib/lucide.min.js).
  function quoteIcon() {
    return svg([
      'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z',
      'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z'
    ], '24', 'lucide lucide-quote');
  }

  function buildingIcon() {
    return svg(['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2',
                'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2', 'M10 6h4M10 10h4M10 14h4M10 18h4'], '22');
  }

  function initials(name) {
    return (name || '?').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }

  // Only allow image sources we expect: inline data images, http(s), or a
  // path on this site (resolved against the site root).
  function photoUrl(src) {
    src = (src || '').trim();
    if (!src) return '';
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src)) return src;
    if (/^https?:\/\//i.test(src)) return src;
    if (/^[a-z]+:/i.test(src) || src.indexOf('..') !== -1) return '';
    return BASE + encodeURI(src.replace(/^\/+/, ''));
  }

  function stars(rating) {
    rating = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    return rating ? new Array(rating + 1).join('★') : '';
  }

  /* ---- .testi-card (homepage, offering pages, partnership) ---- */
  function testiCard(t, withMark) {
    var root = el('div', 'testi-card glass-card' + (t.featured ? ' testi-featured' : ''));
    root.setAttribute('data-animate', '');
    if (withMark) {
      var mark = el('span', 'testi-mark');
      mark.appendChild(quoteIcon());
      root.appendChild(mark);
    }
    var s = stars(t.rating);
    if (s) {
      var st = el('div', 'testi-stars', s);
      st.setAttribute('aria-label', t.rating + ' out of 5 stars');
      root.appendChild(st);
    }
    var q = el('p', 'testi-quote', t.message || '');
    q.style.whiteSpace = 'pre-line';      // keep line breaks typed in the dashboard
    q.style.overflowWrap = 'anywhere';    // a long word or link can't overflow the card
    // With no stars row, start the text below the corner quote icon, not under it.
    if (withMark && !s) q.style.marginTop = '36px';
    root.appendChild(q);

    var foot = el('div', 'testi-footer');
    var photo = photoUrl(t.photo);
    if (photo) {
      var img = el('img', 'testi-avatar testi-avatar--photo');
      img.src = photo;
      img.alt = t.name || '';
      img.loading = 'lazy';
      foot.appendChild(img);
    } else {
      var av = el('div', 'testi-avatar', initials(t.name));
      av.setAttribute('aria-hidden', 'true');
      foot.appendChild(av);
    }
    var meta = el('div', 'testi-meta');
    meta.style.overflowWrap = 'anywhere';
    meta.appendChild(el('strong', null, t.name || ''));
    if (t.role) meta.appendChild(el('span', null, t.role));
    foot.appendChild(meta);
    root.appendChild(foot);
    return root;
  }

  /* ---- .proj-quote-card (testimonials.html) ---- */
  function quoteCard(t, isBusiness) {
    var root = el('div', 'proj-quote-card glass-card');
    root.setAttribute('data-animate', '');
    root.appendChild(el('div', 'proj-quote-mark', '“'));

    var body = el('div', 'proj-quote-body');
    var s = stars(t.rating);
    if (s) {
      var st = el('div', 'proj-quote-stars', s);
      st.setAttribute('aria-label', t.rating + ' out of 5 stars');
      st.style.cssText = 'color:#f5b301;font-size:0.95rem;letter-spacing:2px;margin-bottom:12px;';
      body.appendChild(st);
    }
    var text = el('p', 'proj-quote-text', t.message || '');
    text.style.whiteSpace = 'pre-line';
    body.appendChild(text);

    var author = el('div', 'proj-quote-author');
    var photo = photoUrl(t.photo);
    if (photo) {
      var img = el('img', 'proj-quote-photo');
      img.src = photo;
      img.alt = t.name || '';
      img.loading = 'lazy';
      author.appendChild(img);
    } else {
      var av = el('div', 'proj-quote-avatar', isBusiness ? null : initials(t.name));
      av.setAttribute('aria-hidden', 'true');
      av.style.cssText = 'width:48px;height:48px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;color:#fff;font-weight:700;font-size:1rem;' + GRADIENT;
      if (isBusiness) av.appendChild(buildingIcon());
      author.appendChild(av);
    }
    var meta = el('div');
    meta.appendChild(el('strong', null, t.name || ''));
    if (t.role) meta.appendChild(el('span', null, t.role));
    author.appendChild(meta);
    body.appendChild(author);
    root.appendChild(body);
    return root;
  }

  function render(grid, list) {
    var section = grid.closest('section');
    var style = grid.getAttribute('data-review-style');
    var withMark = grid.hasAttribute('data-review-mark');
    var isBusiness = grid.getAttribute('data-reviews') === 'testimonials-business';
    grid.textContent = '';
    if (!list.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';
    list.forEach(function (t, i) {
      var c = style === 'quote' ? quoteCard(t, isBusiness) : testiCard(t, withMark);
      grid.appendChild(c);
      // Added after the page's scroll-animation observer ran, so reveal directly.
      setTimeout(function () { c.classList.add('visible'); }, 60 + i * 80);
    });
  }

  var keys = grids.map(function (g) { return g.getAttribute('data-reviews'); })
    .filter(function (k, i, all) { return k && all.indexOf(k) === i; });

  fetch(BASE + 'testimonials_api.php?action=public&placement=' + encodeURIComponent(keys.join(',')), { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (data) {
      if (!Array.isArray(data)) return; // unexpected reply → keep the static fallback
      grids.forEach(function (g) {
        var key = g.getAttribute('data-reviews');
        render(g, data.filter(function (t) { return t.placement === key; }));
      });
    })
    .catch(function () { /* keep the hard-coded reviews */ });
})();
