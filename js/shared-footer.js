(function () {
  var footerTemplate = [
    '<div class="container">',
    '  <div class="footer-top">',
    '    <div class="footer-brand">',
    '      <a href="index.html" class="logo">',
    '        <img src="image/clans_logo.webp" alt="Clans Machina" class="logo-img logo-img--footer" width="95" height="32" loading="lazy" decoding="async" fetchpriority="low" />',
    '      </a>',
    '      <p>Rooftop solar done right &mdash; transparent savings and dependable service. Trusted by 1,000+ homes across India.</p>',
    '      <div class="social-links">',
    '        <a href="https://www.instagram.com/clansmachinaofficial/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">',
    '          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    '        </a>',
    '        <a href="https://www.youtube.com/@clansmachina" target="_blank" rel="noopener noreferrer" aria-label="YouTube">',
    '          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4" stroke="currentColor" stroke-width="1.8"/><path d="M10 9l5 3-5 3V9z" fill="currentColor"/></svg>',
    '        </a>',
    '        <a href="https://www.facebook.com/clansmachinaindia" target="_blank" rel="noopener noreferrer" aria-label="Facebook">',
    '          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '        </a>',
    '        <a href="https://in.linkedin.com/company/clansmachinaofficial" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">',
    '          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" stroke-width="1.8"/><path d="M7 10v7M7 7v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    '        </a>',
    '        <a href="https://twitter.com/clansmachina" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">',
    '          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    '        </a>',
    '      </div>',
    '    </div>',
    '    <div class="footer-links-group">',
    '      <h5>Our Offerings</h5>',
    '      <ul>',
    '        <li><a href="our-offering/home.html">Residential Solar</a></li>',
    '        <li><a href="our-offering/commercial.html">Commercial Solar</a></li>',
    '        <li><a href="our-offering/housing-society.html">Housing Societies</a></li>',
    '        <li><a href="index.html#services">EV Charging</a></li>',
    '        <li><a href="index.html#services">Solar AMC &amp; Maintenance</a></li>',
    '        <li><a href="solar-solutions/Ongrid.html">On-Grid Systems</a></li>',
    '        <li><a href="solar-solutions/Offgrid.html">Off-Grid Systems</a></li>',
    '        <li><a href="solar-solutions/hybrid.html">Hybrid Systems</a></li>',
    '      </ul>',
    '    </div>',
    '    <div class="footer-links-group">',
    '      <h5>Company</h5>',
    '      <ul>',
    '        <li><a href="careers.html">Careers</a></li>',
    '        <li><a href="partnership.html">Partnership</a></li>',
    '        <li><a href="testimonials.html">Testimonials</a></li>',
    '        <li><a href="calculator.html">Solar Calculator</a></li>',
    '        <li><a href="faq.html">FAQ</a></li>',
    '        <li><a href="blog.php">Blog</a></li>',
    '      </ul>',
    '    </div>',
    '    <div class="footer-links-group">',
    '      <h5>Resources</h5>',
    '      <ul>',
    '        <li><a href="calculator.html">Solar Calculator</a></li>',
    '        <li><a href="faq.html">Government Subsidies</a></li>',
    '        <li><a href="faq.html">FAQ</a></li>',
    '        <li><a href="index.html#contact">Support Center</a></li>',
    '      </ul>',
    '    </div>',
    '  </div>',
    '  <div class="footer-bottom">',
    '    <p>&#169; 2026 Clans Machina Energy Pvt. Ltd. All rights reserved. Proudly Made in India.</p>',
    '    <div class="footer-legal">',
    '      <a href="footer.html#privacy">Privacy Policy</a>',
    '      <a href="footer.html#terms">Terms and Conditions</a>',
    '      <a href="footer.html#cancellation">Warranty &amp; Return Policy</a>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');

  // Pages living in a subfolder (e.g. /our-offering/) need internal links
  // and the logo image prefixed with '../' so they resolve to the site root.
  var inSubfolder = /\/(our-offering|solar-solutions)\//i.test(window.location.pathname);

  var footers = document.querySelectorAll('footer.footer');
  footers.forEach(function (footer) {
    footer.innerHTML = footerTemplate;
    if (!inSubfolder) return;
    footer.querySelectorAll('a[href], img[src]').forEach(function (el) {
      var attr = el.tagName === 'IMG' ? 'src' : 'href';
      var val = el.getAttribute(attr);
      if (!val || /^(https?:|\/\/|#|mailto:|tel:|\.\.\/)/i.test(val)) return;
      el.setAttribute(attr, '../' + val);
    });
  });

  // ---- Global structured data (JSON-LD) — Organization + WebSite + LocalBusiness ----
  // Injected site-wide so every page carries a consistent business identity for SEO.
  if (!document.getElementById('cm-global-schema')) {
    var SITE = 'https://www.clansmachina.com';
    var graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': SITE + '/#organization',
          'name': 'Clans Machina',
          'legalName': 'Clans Machina Energy Pvt. Ltd.',
          'url': SITE + '/',
          'logo': {
            '@type': 'ImageObject',
            'url': SITE + '/image/clans_logo.webp',
            'width': 95,
            'height': 32
          },
          'image': SITE + '/image/service-residential.webp',
          'description': 'Rooftop solar for homes, businesses and housing societies across India — transparent savings, government subsidy support and a 25-year performance warranty.',
          'email': 'info@clansmachina.in',
          'telephone': '+91-91241-65341',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'DCB-221, DLF Cyber City, Chandaka Industrial Estate, Patia',
            'addressLocality': 'Bhubaneswar',
            'addressRegion': 'Odisha',
            'postalCode': '751024',
            'addressCountry': 'IN'
          },
          'areaServed': { '@type': 'Country', 'name': 'India' },
          'contactPoint': [
            {
              '@type': 'ContactPoint',
              'telephone': '+91-91241-65341',
              'contactType': 'customer service',
              'areaServed': 'IN',
              'availableLanguage': ['en', 'hi']
            },
            {
              '@type': 'ContactPoint',
              'telephone': '1800-891-3731',
              'contactType': 'customer service',
              'contactOption': 'TollFree',
              'areaServed': 'IN',
              'availableLanguage': ['en', 'hi']
            }
          ],
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.8',
            'ratingCount': '1000',
            'bestRating': '5',
            'worstRating': '1'
          },
          'sameAs': [
            'https://www.instagram.com/clansmachinaofficial/',
            'https://www.youtube.com/@clansmachina',
            'https://www.facebook.com/clansmachinaindia',
            'https://in.linkedin.com/company/clansmachinaofficial',
            'https://twitter.com/clansmachina'
          ]
        },
        {
          '@type': 'WebSite',
          '@id': SITE + '/#website',
          'url': SITE + '/',
          'name': 'Clans Machina Solar',
          'inLanguage': 'en-IN',
          'publisher': { '@id': SITE + '/#organization' }
        },
        {
          '@type': ['LocalBusiness', 'SolarInstallation'],
          '@id': SITE + '/#localbusiness',
          'name': 'Clans Machina',
          'url': SITE + '/',
          'image': SITE + '/image/service-residential.webp',
          'logo': SITE + '/image/clans_logo.webp',
          'telephone': '+91-91241-65341',
          'email': 'info@clansmachina.in',
          'priceRange': '₹₹',
          'parentOrganization': { '@id': SITE + '/#organization' },
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'DCB-221, DLF Cyber City, Chandaka Industrial Estate, Patia',
            'addressLocality': 'Bhubaneswar',
            'addressRegion': 'Odisha',
            'postalCode': '751024',
            'addressCountry': 'IN'
          },
          'geo': { '@type': 'GeoCoordinates', 'latitude': 20.3499, 'longitude': 85.8197 },
          'areaServed': [
            { '@type': 'Country', 'name': 'India' },
            { '@type': 'City', 'name': 'Bhubaneswar' },
            { '@type': 'City', 'name': 'Cuttack' },
            { '@type': 'City', 'name': 'Mumbai' },
            { '@type': 'City', 'name': 'Delhi' },
            { '@type': 'City', 'name': 'Bengaluru' }
          ],
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.8',
            'ratingCount': '1000',
            'bestRating': '5',
            'worstRating': '1'
          }
        }
      ]
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'cm-global-schema';
    s.textContent = JSON.stringify(graph);
    document.head.appendChild(s);
  }

  // Floating WhatsApp button (site-wide, bottom-left)
  if (!document.querySelector('.wa-float')) {
    var wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.href = 'https://wa.me/919124165341';
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    wa.setAttribute('aria-label', 'Chat with us on WhatsApp');
    wa.innerHTML = '<svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M16.04 4C9.93 4 5 8.93 5 15.04c0 2.13.6 4.12 1.64 5.82L5 28l7.32-1.6a11 11 0 0 0 3.72.65h.01c6.1 0 11.03-4.93 11.03-11.04C27.08 8.93 22.15 4 16.04 4zm0 20.18h-.01a9.1 9.1 0 0 1-3.46-.68l-.25-.1-4.34.95.93-4.23-.16-.26a9.06 9.06 0 0 1-1.39-4.82c0-5.02 4.09-9.1 9.12-9.1 2.44 0 4.72.95 6.44 2.67a9.04 9.04 0 0 1 2.67 6.44c0 5.03-4.09 9.11-9.1 9.11zm5-6.82c-.27-.14-1.62-.8-1.87-.89-.25-.09-.43-.14-.62.14-.18.27-.71.89-.87 1.07-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.2-1.36-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.46.09-.18.05-.34-.02-.48-.07-.14-.62-1.49-.85-2.04-.22-.53-.45-.46-.62-.47l-.53-.01c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.84c.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.56.58.65.21 1.25.18 1.72.11.52-.08 1.62-.66 1.85-1.3.23-.64.23-1.18.16-1.3-.07-.12-.25-.18-.52-.32z"/></svg>';
    document.body.appendChild(wa);
  }

  // Solar Saathi chatbot (site-wide, bottom-right). The launcher opens the
  // Solar Saathi app in a new tab (desktop and mobile); the app saves every
  // lead to `saathi_leads`, which the admin dashboard reads.
  // Styles: "SOLAR SAATHI CHATBOT" in css/styles.css.
  // Any element with data-open-saathi opens it, as does window.ClansSaathi.open().
  if (!document.querySelector('.saathi-launcher')) {
    // Where the Saathi app runs. On this PC / the office Wi-Fi it is the dev
    // server (npm run dev, port 3005); on the live site, SAATHI_PROD_URL.
    var SAATHI_PROD_URL = 'https://saathi.clansmachina.com/';
    var host = location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1' || /^(192\.168|10)\./.test(host);
    var saathiUrl = window.SAATHI_URL || (isLocal ? 'http://' + host + ':3005/' : SAATHI_PROD_URL);
    var WA_URL = 'https://wa.me/919124165341';

    // Saathi's head, drawn from the chatbot's own mascot (solar-panel cap,
    // visor, green eyes). `p` keeps gradient ids unique per copy.
    var saathiBot = function (p, cls) {
      return '<svg class="' + cls + '" viewBox="38 6 164 142" aria-hidden="true" focusable="false">' +
        '<defs>' +
        '<linearGradient id="' + p + 'sh" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#e8eff5"/><stop offset="1" stop-color="#b7c6d4"/></linearGradient>' +
        '<linearGradient id="' + p + 'vi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14262f"/><stop offset="1" stop-color="#050c10"/></linearGradient>' +
        '<linearGradient id="' + p + 'ce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a80d6"/><stop offset="1" stop-color="#163a66"/></linearGradient>' +
        '<clipPath id="' + p + 'cl"><rect x="79" y="19" width="82" height="22" rx="3"/></clipPath>' +
        '</defs>' +
        '<rect x="116" y="36" width="8" height="18" rx="3" fill="#9fb0bf"/>' +
        '<rect x="76" y="16" width="88" height="28" rx="5" fill="#e3eaf0"/>' +
        '<rect x="79" y="19" width="82" height="22" rx="3" fill="url(#' + p + 'ce)"/>' +
        '<g stroke="rgba(255,255,255,.3)" stroke-width="1"><line x1="99.5" y1="19" x2="99.5" y2="41"/><line x1="120" y1="19" x2="120" y2="41"/><line x1="140.5" y1="19" x2="140.5" y2="41"/><line x1="79" y1="30" x2="161" y2="30"/></g>' +
        '<g clip-path="url(#' + p + 'cl)"><g class="saathi-cells-shine"><rect x="70" y="8" width="14" height="44" fill="#fff" opacity=".4" transform="skewX(-22)"/></g></g>' +
        '<circle cx="54" cy="95" r="11.5" fill="url(#' + p + 'sh)"/><circle cx="54" cy="95" r="5.5" fill="none" stroke="#3ecf8e" stroke-width="2.5"/>' +
        '<circle cx="186" cy="95" r="11.5" fill="url(#' + p + 'sh)"/><circle cx="186" cy="95" r="5.5" fill="none" stroke="#3ecf8e" stroke-width="2.5"/>' +
        '<rect x="56" y="48" width="128" height="94" rx="42" fill="url(#' + p + 'sh)"/>' +
        '<ellipse cx="88" cy="60" rx="20" ry="6" fill="#fff" opacity=".8" transform="rotate(-12 88 60)"/>' +
        '<rect x="68" y="62" width="104" height="66" rx="30" fill="url(#' + p + 'vi)" stroke="rgba(62,207,142,.3)"/>' +
        '<g class="saathi-eyes" fill="#3ecf8e"><rect x="94.5" y="81" width="13" height="20" rx="6.5"/><rect x="132.5" y="81" width="13" height="20" rx="6.5"/>' +
        '<circle cx="103.5" cy="86" r="1.9" fill="#eafff5"/><circle cx="141.5" cy="86" r="1.9" fill="#eafff5"/></g>' +
        '<path d="M109 109 Q120 118 131 109" fill="none" stroke="#3ecf8e" stroke-width="3.4" stroke-linecap="round"/>' +
        '<ellipse cx="84" cy="110" rx="6.5" ry="3.6" fill="#ffb27a" opacity=".35"/><ellipse cx="156" cy="110" rx="6.5" ry="3.6" fill="#ffb27a" opacity=".35"/>' +
        '</svg>';
    };
    var openSaathi = function () { window.open(saathiUrl, '_blank', 'noopener'); };

    var launcher = document.createElement('a');
    launcher.className = 'saathi-launcher';
    launcher.href = saathiUrl;
    launcher.target = '_blank';
    launcher.rel = 'noopener';
    launcher.setAttribute('aria-label', 'Chat with Solar Saathi: get your free solar plan (opens in a new tab)');
    launcher.innerHTML = saathiBot('sl', 'saathi-launcher__bot') +
      '<span class="saathi-launcher__dot" aria-hidden="true"></span>';

    var teaser = document.createElement('div');
    teaser.className = 'saathi-teaser';
    teaser.innerHTML =
      '<span class="saathi-teaser__title">Hi, I&#39;m Saathi &#128075;</span>' +
      '<span class="saathi-teaser__text">Get your free rooftop solar plan and subsidy estimate in 2 minutes, in Hindi or English.</span>' +
      '<a class="saathi-teaser__cta" href="' + saathiUrl + '" target="_blank" rel="noopener">Get my free plan &rarr;</a>' +
      '<button type="button" class="saathi-teaser__x" aria-label="Dismiss">&times;</button>';

    document.body.appendChild(teaser);
    document.body.appendChild(launcher);

    var teaserTimer = null;
    var hideTeaser = function () {
      clearTimeout(teaserTimer);
      teaser.classList.remove('is-visible');
      try { sessionStorage.setItem('saathiTeaserSeen', '1'); } catch (e) {}
    };
    var showTeaser = function () {
      // Wait while the homepage lead popup is on screen.
      if (document.querySelector('.cm-pop-overlay.is-open')) { teaserTimer = setTimeout(showTeaser, 3000); return; }
      teaser.classList.add('is-visible');
      teaserTimer = setTimeout(hideTeaser, 14000);
    };

    launcher.addEventListener('click', hideTeaser);
    teaser.addEventListener('click', function (e) {
      if (!e.target.closest('.saathi-teaser__x, .saathi-teaser__cta')) openSaathi();
      hideTeaser();
    });
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest && e.target.closest('[data-open-saathi]');
      if (trigger) { e.preventDefault(); openSaathi(); }
    });
    window.ClansSaathi = { open: openSaathi, url: saathiUrl };

    var teaserSeen = false;
    try { teaserSeen = sessionStorage.getItem('saathiTeaserSeen') === '1'; } catch (e) {}
    if (!teaserSeen) teaserTimer = setTimeout(showTeaser, 4000);
  }
})();
