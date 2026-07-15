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
    var SITE = 'https://www.clansmachina.in';
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
          'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+91-91241-65341',
            'contactType': 'customer service',
            'areaServed': 'IN',
            'availableLanguage': ['en', 'hi']
          },
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

  // Floating Call Now button (bottom-right). Skipped on pages that already
  // have the chatbot widget in that corner (e.g. home, FAQ) to avoid overlap.
  if (!document.querySelector('.call-float') && !document.querySelector('.chatbot-widget')) {
    var call = document.createElement('a');
    call.className = 'call-float';
    call.href = 'tel:+919124165341';
    call.setAttribute('aria-label', 'Call Now +91 91241 65341');
    call.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg>';
    document.body.appendChild(call);
  }
})();
