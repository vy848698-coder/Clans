/* ============================================================
   CLANS MACHINA - LIGHTWEIGHT JS FOR SUBPAGES
   ============================================================ */

(function () {
  'use strict';

  const mobileQuickLinksQuery = window.matchMedia
    ? window.matchMedia('(max-width: 1024px)')
    : null;

  function getCurrentFile() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function setServiceQuickLinks() {
    const currentFile = getCurrentFile();
    const quickLinksByPage = {
      'index.html': {
        heading: 'Quick Links',
        links: [
          { href: 'services.html', label: 'Our Offerings' },
          { href: 'calculator.html', label: 'Savings Calculator' },
          { href: 'faq.html', label: 'Subsidy and FAQ' }
        ]
      },
      'blog.php': {
        heading: 'Read Next',
        links: [
          { href: 'blog.php', label: 'Latest Insights' },
          { href: 'index.html#projects', label: 'Case Studies' },
          { href: 'index.html#contact', label: 'Talk to Solar Expert' }
        ]
      },
      'faq.html': {
        heading: 'Help and Actions',
        links: [
          { href: 'faq.html', label: 'FAQ Hub' },
          { href: 'calculator.html', label: 'Check Solar ROI' },
          { href: 'index.html#contact', label: 'Book Free Consultation' }
        ]
      },
      'calculator.html': {
        heading: 'From Estimate to Install',
        links: [
          { href: 'services.html', label: 'Our Offerings' },
          { href: 'faq.html', label: 'Subsidy and FAQ' },
          { href: 'index.html#contact', label: 'Request Site Survey' }
        ]
      },
      'footer.html': {
        heading: 'Helpful Pages',
        links: [
          { href: 'blog.php', label: 'Blog and Insights' },
          { href: 'faq.html', label: 'Policy and FAQ' },
          { href: 'index.html#contact', label: 'Contact Team' }
        ]
      }
    };

    const config = quickLinksByPage[currentFile] || quickLinksByPage['index.html'];
    const visibleLinkCount = mobileQuickLinksQuery && mobileQuickLinksQuery.matches ? 2 : config.links.length;
    document.querySelectorAll('.nav-dropdown-col--quick').forEach(col => {
      const heading = col.querySelector('.nav-dropdown-heading');
      if (heading && config.heading) {
        heading.textContent = config.heading;
      }
      const links = Array.from(col.querySelectorAll('.nav-quick-link'));
      links.forEach((link, idx) => {
        const def = config.links[idx];
        if (!def || idx >= visibleLinkCount) {
          link.style.display = 'none';
          return;
        }
        link.style.display = '';
        link.setAttribute('href', def.href);
        link.textContent = def.label;
      });
    });
  }

  /* ---- NAV ACTIVE LINK ---- */
  function setActiveNavLink() {
    const currentFile = getCurrentFile();
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = (link.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#')) return;
      const targetFile = href.split('#')[0].split('/').pop().toLowerCase();
      if (targetFile === currentFile) {
        link.classList.add('active');
        // Only mark the toggle of the dropdown that actually contains this link.
        const dropdown = link.closest('.nav-dropdown');
        if (dropdown) {
          const toggle = dropdown.querySelector('.nav-dropdown-toggle');
          if (toggle) toggle.classList.add('active');
        }
      }
    });
  }
  setActiveNavLink();
  setServiceQuickLinks();
  window.addEventListener('resize', setServiceQuickLinks, { passive: true });
  if (mobileQuickLinksQuery) {
    if (typeof mobileQuickLinksQuery.addEventListener === 'function') {
      mobileQuickLinksQuery.addEventListener('change', setServiceQuickLinks);
    } else if (typeof mobileQuickLinksQuery.addListener === 'function') {
      mobileQuickLinksQuery.addListener(setServiceQuickLinks);
    }
  }

  /* Theme restore is handled by js/shared-theme.js (shared across all pages). */

  /* ---- NAVBAR SCROLL ---- */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* ---- HAMBURGER MENU ---- */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    const setMobileMenuOpen = isOpen => {
      navLinks.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    hamburger.setAttribute('aria-expanded', 'false');
    if (!hamburger.getAttribute('aria-controls')) {
      hamburger.setAttribute('aria-controls', 'navLinks');
    }

    hamburger.addEventListener('click', () => {
      setMobileMenuOpen(!navLinks.classList.contains('open'));
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMobileMenuOpen(false));
    });

    document.addEventListener('click', e => {
      const target = e.target instanceof Element ? e.target : null;
      if (!navLinks.classList.contains('open')) return;
      if (target && (target.closest('#hamburger') || target.closest('#navLinks'))) return;
      setMobileMenuOpen(false);
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      setMobileMenuOpen(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false);
      }
    }, { passive: true });
  }

  /* ---- NAV DROPDOWN ---- */
  const navDropdowns = document.querySelectorAll('.nav-dropdown');
  if (navDropdowns.length) {
    const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hoverCloseDelay = 140;

    function getFirstVisibleDropdownLink(dropdown) {
      const links = Array.from(dropdown.querySelectorAll('.nav-dropdown-menu a'));
      return links.find(link => getComputedStyle(link).display !== 'none');
    }

    function openDropdown(dropdown, btn, focusFirstLink) {
      closeDropdowns(dropdown);
      dropdown.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      if (focusFirstLink) {
        const firstLink = getFirstVisibleDropdownLink(dropdown);
        if (firstLink) firstLink.focus();
      }
    }

    function closeDropdowns(except) {
      navDropdowns.forEach(dropdown => {
        if (except && dropdown === except) return;
        dropdown.classList.remove('open');
        const btn = dropdown.querySelector('.nav-dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    navDropdowns.forEach(dropdown => {
      const btn = dropdown.querySelector('.nav-dropdown-toggle');
      if (!btn) return;
      let hoverTimer = null;

      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-haspopup', 'true');

      btn.addEventListener('click', e => {
        e.stopPropagation();
        const willOpen = !dropdown.classList.contains('open');
        if (willOpen) {
          openDropdown(dropdown, btn, false);
        } else {
          closeDropdowns();
        }
      });

      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          openDropdown(dropdown, btn, true);
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          closeDropdowns();
          btn.focus();
        }
      });

      const menu = dropdown.querySelector('.nav-dropdown-menu');
      if (menu) {
        menu.addEventListener('keydown', e => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          closeDropdowns();
          btn.focus();
        });
      }

      if (canHover) {
        dropdown.addEventListener('mouseenter', () => {
          if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
          }
          openDropdown(dropdown, btn, false);
        });

        dropdown.addEventListener('mouseleave', () => {
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => {
            dropdown.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
          }, hoverCloseDelay);
        });
      }
    });

    document.addEventListener('click', e => {
      const target = e.target instanceof Element ? e.target : null;
      if (target && target.closest('.nav-dropdown')) return;
      closeDropdowns();
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      closeDropdowns();
    });
  }

  /* ---- SMOOTH SCROLL (SAME PAGE HASH LINKS ONLY) ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (!href || href.length <= 1) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- INTERSECTION ANIMATION ---- */
  const animElements = document.querySelectorAll('[data-animate]');
  if (animElements.length > 0) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    animElements.forEach(el => observer.observe(el));
  }

  /* ---- LEGAL TOC SCROLL-SPY ---- */
  const tocLinks = document.querySelectorAll('.legal-toc nav a');
  if (tocLinks.length > 0) {
    const sections = Array.from(tocLinks)
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(l => l.classList.toggle('active',
            l.getAttribute('href') === '#' + entry.target.id));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => spy.observe(s));
  }

  /* ---- COUNT-UP ANIMATION for .about-impact-stat ---- */
  const impactStats = document.querySelectorAll('.about-impact-stat strong');
  if (impactStats.length > 0) {
    function animateCount(el) {
      const raw = el.textContent.trim();
      // Extract leading number, optional decimal, and trailing suffix (e.g. "+", " MW", " %")
      const match = raw.match(/^([\d,]+(?:\.\d+)?)(.*)/);
      if (!match) return;
      const target = parseFloat(match[1].replace(/,/g, ''));
      const suffix = match[2];
      const useComma = match[1].includes(',');
      const duration = 1800;
      const start = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        const formatted = useComma ? current.toLocaleString('en-IN') : current;
        el.textContent = formatted + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const countObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    impactStats.forEach(el => countObserver.observe(el));
  }

  /* ---- RANGE SLIDER LABEL ---- */
  const roofSize = document.getElementById('roofSize');
  const roofSizeLabel = document.getElementById('roofSizeLabel');
  if (roofSize && roofSizeLabel) {
    roofSize.addEventListener('input', () => {
      roofSizeLabel.textContent = roofSize.value + ' sq ft';
    });
  }

  /* ---- CALCULATOR ---- */
  const calcForm = document.getElementById('calcForm');
  if (calcForm) {
    calcForm.addEventListener('submit', e => {
      e.preventDefault();
      const bill = parseFloat(document.getElementById('monthlyBill').value) || 0;
      const locationMultiplier = parseFloat(document.getElementById('location').value) || 1.4;
      const roof = parseFloat(document.getElementById('roofSize').value) || 500;

      const billReductionFactor = bill < 3000 ? 0.62 : (bill < 7000 ? 0.72 : 0.78);
      const annualSavings = Math.round(bill * 12 * billReductionFactor);

      const roofBasedSize = (roof / 100) * locationMultiplier;
      const billBasedSize = bill / 900;
      const rawSystemSize = Math.min(roofBasedSize, Math.max(1.5, billBasedSize));
      const systemSize = parseFloat(rawSystemSize.toFixed(1));

      const costPerKw = systemSize >= 30 ? 50000 : (systemSize >= 10 ? 53000 : 56000);
      const grossSystemCost = Math.round(systemSize * costPerKw);

      const subsidy = Math.round(Math.min(78000, grossSystemCost * 0.2));
      const netSystemCost = Math.max(grossSystemCost - subsidy, 0);
      const roi = netSystemCost > 0 && annualSavings > 0 ? parseFloat((netSystemCost / annualSavings).toFixed(1)) : 0;
      const co2 = parseFloat((systemSize * 1.45).toFixed(1));

      const annualSavingsEl = document.getElementById('annualSavings');
      const roiYearsEl = document.getElementById('roiYears');
      const co2SavedEl = document.getElementById('co2Saved');
      const systemSizeEl = document.getElementById('systemSize');
      const subsidyEl = document.getElementById('subsidyEstimate');
      const netCostEl = document.getElementById('netSystemCost');

      if (annualSavingsEl) annualSavingsEl.textContent = '\u20B9' + annualSavings.toLocaleString('en-IN');
      if (roiYearsEl) roiYearsEl.textContent = roi + ' Yrs';
      if (co2SavedEl) co2SavedEl.textContent = co2 + ' T';
      if (systemSizeEl) systemSizeEl.textContent = systemSize + ' kW';
      if (subsidyEl) subsidyEl.textContent = '\u20B9' + subsidy.toLocaleString('en-IN');
      if (netCostEl) netCostEl.textContent = '\u20B9' + netSystemCost.toLocaleString('en-IN');

      const placeholder = document.getElementById('calcPlaceholder');
      const resultCards = document.getElementById('resultCards');
      if (placeholder) placeholder.style.display = 'none';
      if (resultCards) resultCards.style.display = 'grid';
    });
  }

  /* ---- FAQ ACCORDION ---- */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        const icon = openItem.querySelector('.faq-q span');
        if (icon) icon.textContent = '+';
      });

      if (!isOpen) {
        item.classList.add('open');
        const icon = btn.querySelector('span');
        if (icon) icon.textContent = '-';
      }
    });
  });

  /* ---- BLOG DIRECTORY FILTERS ---- */
  const blogDirectory = document.querySelector('.blog-directory');
  if (blogDirectory) {
    const cards = Array.from(document.querySelectorAll('.blog-page-card'));
    const categoryLinks = Array.from(document.querySelectorAll('.blog-categories a[data-filter]'));
    const searchInput = document.getElementById('blogSearchInput');
    const loadMoreBtn = document.getElementById('blogLoadMoreBtn');
    const emptyState = document.getElementById('blogEmptyState');

    let activeFilter = 'all';
    let query = '';
    let expanded = false;

    cards.forEach(card => {
      const title = card.querySelector('h3');
      const chip = card.querySelector('.bp-chip');
      const titleText = title ? title.textContent.toLowerCase() : '';
      const chipText = chip ? chip.textContent.toLowerCase() : '';
      const catText = (card.dataset.category || '').toLowerCase();
      // Free-text search looks across title + chip + category.
      card.dataset.search = (titleText + ' ' + chipText + ' ' + catText).trim();
      // Category filter matches whole slugs only (space-separated), so "solar"
      // never accidentally matches "solar-basics".
      card.dataset.cats = ' ' + catText.split(/\s+/).filter(Boolean).join(' ') + ' ';
    });

    function cardMatches(card) {
      const haystack = card.dataset.search || '';
      const matchesQuery = !query || haystack.includes(query);
      const matchesFilter = activeFilter === 'all' ||
        (card.dataset.cats || '').includes(' ' + activeFilter + ' ');
      return matchesQuery && matchesFilter;
    }

    function applyBlogFilters() {
      const usingFilter = activeFilter !== 'all' || query.length > 0;
      let visible = 0;
      let hiddenStillExists = false;

      cards.forEach(card => {
        const initiallyHidden = card.classList.contains('blog-hidden');
        const visibleByLoadMore = !initiallyHidden || expanded || usingFilter;
        const show = cardMatches(card) && visibleByLoadMore;
        card.style.display = show ? 'block' : 'none';
        if (show) visible += 1;
        if (!usingFilter && !expanded && initiallyHidden) hiddenStillExists = true;
      });

      if (loadMoreBtn) {
        loadMoreBtn.style.display = hiddenStillExists ? 'inline-flex' : 'none';
      }
      if (emptyState) {
        emptyState.style.display = visible === 0 ? 'block' : 'none';
      }
    }

    categoryLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        activeFilter = (link.dataset.filter || 'all').toLowerCase();
        categoryLinks.forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        applyBlogFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        query = searchInput.value.trim().toLowerCase();
        applyBlogFilters();
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        expanded = true;
        applyBlogFilters();
      });
    }

    applyBlogFilters();
  }
})();
