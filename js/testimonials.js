/* ============================================================
   TESTIMONIALS — loaded from the database (testimonials_api.php)
   so testimonials the owner adds in the admin dashboard appear here.

   If the request fails, the hard-coded cards in testimonials.html stay
   on the page as a fallback. If it succeeds, each grid shows exactly what
   the dashboard has published (a section with none is hidden).
   All text is set via textContent — never innerHTML — so owner-entered
   content can't inject markup.
   ============================================================ */
(function () {
  var customerGrid = document.getElementById('customerTestimonials');
  var businessGrid = document.getElementById('businessTestimonials');
  if (!customerGrid || !businessGrid || !window.fetch) return;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Only allow image sources we expect: inline data images, http(s), or a
  // relative path on this site.
  function safePhoto(src) {
    src = (src || '').trim();
    if (!src) return '';
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src)) return src;
    if (/^https?:\/\//i.test(src)) return src;
    if (/^[a-z]+:/i.test(src) || src.indexOf('..') !== -1) return '';
    return src;
  }

  // Building icon used for business testimonials without a photo.
  function buildingAvatar() {
    var wrap = el('div', 'proj-quote-avatar');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'width:48px;height:48px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;color:#fff;background:linear-gradient(135deg,#3ecf8e,#4ea8de);border:2px solid rgba(62,207,142,0.3);';
    var svg = document.createElementNS(SVG_NS, 'svg');
    [['width', '22'], ['height', '22'], ['viewBox', '0 0 24 24'], ['fill', 'none'], ['stroke', 'currentColor'],
     ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']].forEach(function (a) {
      svg.setAttribute(a[0], a[1]);
    });
    ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2',
     'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2', 'M10 6h4M10 10h4M10 14h4M10 18h4'].forEach(function (d) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    wrap.appendChild(svg);
    return wrap;
  }

  // Initials circle for customer testimonials without a photo.
  function initialsAvatar(name) {
    var initials = (name || '?').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    var wrap = el('div', 'proj-quote-avatar', initials);
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'width:48px;height:48px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;color:#fff;font-weight:700;font-size:1rem;background:linear-gradient(135deg,#3ecf8e,#4ea8de);border:2px solid rgba(62,207,142,0.3);';
    return wrap;
  }

  function card(t) {
    var root = el('div', 'proj-quote-card glass-card');
    root.setAttribute('data-animate', '');
    root.appendChild(el('div', 'proj-quote-mark', '“'));

    var body = el('div', 'proj-quote-body');
    var rating = Math.max(0, Math.min(5, parseInt(t.rating, 10) || 0));
    if (rating > 0) {
      var stars = el('div', 'proj-quote-stars', new Array(rating + 1).join('★'));
      stars.setAttribute('aria-label', rating + ' out of 5 stars');
      stars.style.cssText = 'color:#f5b301;font-size:0.95rem;letter-spacing:2px;margin-bottom:12px;';
      body.appendChild(stars);
    }
    var text = el('p', 'proj-quote-text', t.message || '');
    text.style.whiteSpace = 'pre-line';   // keep the line breaks typed in the dashboard
    body.appendChild(text);

    var author = el('div', 'proj-quote-author');
    var photo = safePhoto(t.photo);
    if (photo) {
      var img = el('img', 'proj-quote-photo');
      img.src = photo;
      img.alt = t.name || '';
      img.loading = 'lazy';
      author.appendChild(img);
    } else {
      author.appendChild(t.type === 'business' ? buildingAvatar() : initialsAvatar(t.name));
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
    grid.textContent = '';
    if (!list.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';
    list.forEach(function (t, i) {
      var c = card(t);
      grid.appendChild(c);
      // These cards are added after the page's scroll-animation observer ran,
      // so reveal them directly (with a small stagger).
      setTimeout(function () { c.classList.add('visible'); }, 60 + i * 80);
    });
  }

  fetch('testimonials_api.php?action=public', { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (data) {
      if (!Array.isArray(data)) return; // unexpected reply → keep the static fallback
      render(customerGrid, data.filter(function (t) { return t.type !== 'business'; }));
      render(businessGrid, data.filter(function (t) { return t.type === 'business'; }));
    })
    .catch(function () { /* keep the hard-coded testimonials */ });
})();
