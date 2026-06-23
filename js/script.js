/* ============================================================
   CLANS MACHINA - JS: Canvas, Counters, Calculator, Chatbot
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
          { href: 'our-offering/home.html', label: 'Our Offerings' },
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
          { href: 'our-offering/home.html', label: 'Our Offerings' },
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
    let dropdownHasActive = false;
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = (link.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#')) return;
      const targetFile = href.split('#')[0].toLowerCase();
      if (targetFile === currentFile) {
        link.classList.add('active');
        const dropdown = link.closest('.nav-dropdown');
        if (dropdown) dropdownHasActive = true;
      }
    });
    if (dropdownHasActive) {
      document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.classList.add('active');
      });
    }
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

    // Close on nav link click
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

  /* ---- SMOOTH SCROLL ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- CANVAS PARTICLE ANIMATION ---- */
  const canvas = document.getElementById('heroCanvas');
  let ctx = null;
  if (canvas) {
    ctx = canvas.getContext('2d');
  }
  let particles = [];
  let animFrame;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function createParticles() {
    if (!canvas) return;
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 14000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(Math.random() * 0.25 + 0.05),
        r: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.4 + 0.15
      });
    }
  }

  function drawParticles() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Warm sunlight glow from above
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height * 0.15, 0,
      canvas.width / 2, canvas.height * 0.15, canvas.width * 0.8
    );
    grad.addColorStop(0, 'rgba(245,178,52,0.07)');
    grad.addColorStop(1, 'rgba(22,19,13,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw drifting sun motes (no connecting lines — soft, warm, ambient)
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,200,120,${p.alpha})`;
      ctx.fill();
    });
  }

  function updateParticles() {
    if (!canvas) return;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      // Gently wrap motes that drift off the top back to the bottom
      if (p.y < -5) {
        p.y = canvas.height + 5;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
    });
  }

  function animate() {
    if (!canvas || !ctx) return;
    updateParticles();
    drawParticles();
    animFrame = requestAnimationFrame(animate);
  }

  if (canvas && ctx) {
    resizeCanvas();
    createParticles();
    animate();
  }

  let resizeTimer;
  if (canvas && ctx) {
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelAnimationFrame(animFrame);
        resizeCanvas();
        createParticles();
        animate();
      }, 200);
    });
  }

  /* ---- INTERSECTION OBSERVER: SCROLL ANIMATIONS + COUNTERS ---- */
  const animElements = document.querySelectorAll('[data-animate]');
  const countersStarted = new Set();

  function animateCounter(el) {
    if (countersStarted.has(el)) return;
    countersStarted.add(el);
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(ease * target).toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target.toLocaleString('en-IN');
    }
    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Start counters inside this element
        entry.target.querySelectorAll('.trust-num[data-target], .impact-num[data-target]').forEach(animateCounter);
        // If the element itself is a counter
        if (entry.target.classList.contains('trust-num') || entry.target.classList.contains('impact-num')) {
          animateCounter(entry.target);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  animElements.forEach(el => observer.observe(el));

  // Also observe counters outside data-animate
  document.querySelectorAll('.trust-num[data-target], .impact-num[data-target]').forEach(el => {
    const counterObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounter(el);
        counterObs.unobserve(el);
      }
    }, { threshold: 0.5 });
    counterObs.observe(el);
  });

  /* ---- RANGE SLIDER ---- */
  const roofSize = document.getElementById('roofSize');
  const roofSizeLabel = document.getElementById('roofSizeLabel');
  if (roofSize) {
    roofSize.addEventListener('input', () => {
      roofSizeLabel.textContent = roofSize.value + ' sq ft';
    });
  }

  /* ---- SOLAR CALCULATOR ---- */
  const calcForm = document.getElementById('calcForm');
  if (calcForm) {
    calcForm.addEventListener('submit', e => {
      e.preventDefault();
      const bill = parseFloat(document.getElementById('monthlyBill').value) || 0;
      const locationMultiplier = parseFloat(document.getElementById('location').value) || 1.4;
      const roof = parseFloat(document.getElementById('roofSize').value) || 500;

      // Savings and sizing model for indicative pre-feasibility estimates
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

      // Update result elements
      document.getElementById('annualSavings').textContent =
        '\u20B9' + annualSavings.toLocaleString('en-IN');
      document.getElementById('roiYears').textContent = roi + ' Yrs';
      document.getElementById('co2Saved').textContent = co2 + ' T';
      document.getElementById('systemSize').textContent = systemSize + ' kW';

      const subsidyEl = document.getElementById('subsidyEstimate');
      const netCostEl = document.getElementById('netSystemCost');
      if (subsidyEl) subsidyEl.textContent = '\u20B9' + subsidy.toLocaleString('en-IN');
      if (netCostEl) netCostEl.textContent = '\u20B9' + netSystemCost.toLocaleString('en-IN');

      // Show results
      document.getElementById('calcPlaceholder').style.display = 'none';
      document.getElementById('resultCards').style.display = 'grid';
    });
  }

  /* ---- CONTACT FORM ---- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const submitBtn = document.getElementById('submitBtn');
    const formSuccess = document.getElementById('formSuccess');
    const formErrors = document.getElementById('formErrors');
    const contactFields = {
      name: document.getElementById('cName'),
      phone: document.getElementById('cPhone'),
      email: document.getElementById('cEmail'),
      city: document.getElementById('cCity'),
      bill: document.getElementById('cBill')
    };

    function clearFieldState(field) {
      if (!field) return;
      field.classList.remove('input-invalid');
      field.removeAttribute('aria-invalid');
    }

    function setFieldInvalid(field) {
      if (!field) return;
      field.classList.add('input-invalid');
      field.setAttribute('aria-invalid', 'true');
    }

    function clearFormMessages() {
      if (formErrors) {
        formErrors.style.display = 'none';
        formErrors.innerHTML = '';
      }
      if (formSuccess) {
        formSuccess.style.display = 'none';
      }
    }

    function validateContactForm() {
      const errors = [];
      const firstInvalid = [];
      const name = (contactFields.name?.value || '').trim();
      const phoneDigits = (contactFields.phone?.value || '').replace(/\D/g, '');
      const email = (contactFields.email?.value || '').trim();
      const city = (contactFields.city?.value || '').trim();
      const bill = (contactFields.bill?.value || '').trim();

      Object.values(contactFields).forEach(clearFieldState);

      if (name.length < 2) {
        errors.push('Enter your full name.');
        setFieldInvalid(contactFields.name);
        firstInvalid.push(contactFields.name);
      }
      if (phoneDigits.length !== 10) {
        errors.push('Enter a valid 10-digit phone number.');
        setFieldInvalid(contactFields.phone);
        firstInvalid.push(contactFields.phone);
      }
      if (!contactFields.email?.checkValidity()) {
        errors.push('Enter a valid email address.');
        setFieldInvalid(contactFields.email);
        firstInvalid.push(contactFields.email);
      }
      if (city.length < 2) {
        errors.push('Enter your city.');
        setFieldInvalid(contactFields.city);
        firstInvalid.push(contactFields.city);
      }
      if (!bill) {
        errors.push('Select your monthly bill range.');
        setFieldInvalid(contactFields.bill);
        firstInvalid.push(contactFields.bill);
      }

      return { errors, firstField: firstInvalid[0] };
    }

    Object.values(contactFields).forEach(field => {
      if (!field) return;
      field.addEventListener('input', () => clearFieldState(field));
      field.addEventListener('change', () => clearFieldState(field));
    });

    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      clearFormMessages();

      const validation = validateContactForm();
      if (validation.errors.length) {
        if (formErrors) {
          formErrors.innerHTML = '<ul><li>' + validation.errors.join('</li><li>') + '</li></ul>';
          formErrors.style.display = 'block';
        }
        if (validation.firstField) validation.firstField.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      const restoreBtn = () => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Book Free Consultation';
      };

      const payload = {
        name: contactFields.name.value.trim(),
        phone: contactFields.phone.value.trim(),
        email: contactFields.email.value.trim(),
        city: contactFields.city.value.trim(),
        service: (document.getElementById('cService') || {}).value || '',
        bill: contactFields.bill.value,
        message: (document.getElementById('cMsg') || {}).value || ''
      };

      fetch('submit-contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.text().then(text => {
          // Parse manually so a non-JSON response (PHP not executed, 404,
          // server warning) gives a clear message instead of a vague error.
          try {
            return JSON.parse(text);
          } catch (err) {
            console.error('Contact form: server did not return JSON.', { status: res.status, body: text });
            throw new Error('Bad server response (HTTP ' + res.status + '). If you opened this page via Live Server or as a file, open it through http://localhost/ instead so PHP can run.');
          }
        }))
        .then(data => {
          if (data.ok) {
            if (formSuccess) formSuccess.style.display = 'flex';
            contactForm.reset();
          } else if (formErrors) {
            formErrors.innerHTML = '<ul><li>' + (data.message || 'Submission failed.') + '</li></ul>';
            formErrors.style.display = 'block';
          }
        })
        .catch(err => {
          if (formErrors) {
            formErrors.innerHTML = '<ul><li>' + (err && err.message ? err.message : 'Network error. Please try again.') + '</li></ul>';
            formErrors.style.display = 'block';
          }
        })
        .finally(restoreBtn);
    });
  }

  /* ---- CHATBOT ---- */
  const chatbotToggle = document.getElementById('chatbotToggle');
  const chatbotPanel = document.getElementById('chatbotPanel');
  const chatClose = document.getElementById('chatClose');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');

  function addMsg(text, isBot) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (isBot ? 'bot-msg' : 'user-msg');
    const span = document.createElement('span');
    span.textContent = text;
    div.appendChild(span);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function getBotResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('saving') || m.includes('bill') || m.includes('calculat')) {
      return 'With solar, most customers save 80-90% on electricity bills. Use our calculator above to get your exact savings!';
    }
    if (m.includes('quote') || m.includes('price') || m.includes('cost')) {
      return 'A typical home system costs Rs.2.5L to Rs.4L installed. After PM Surya Ghar subsidy, your net cost can be much lower. Want a free site survey?';
    }
    if (m.includes('subsid') || m.includes('scheme') || m.includes('government')) {
      return 'Under PM Surya Ghar Muft Bijli scheme 2025, you can get up to Rs.78,000 subsidy on residential rooftop solar. We handle all the paperwork!';
    }
    if (m.includes('install') || m.includes('how long') || m.includes('time')) {
      return 'Our installations are typically completed in 1-2 days. From booking to going live, the entire process takes 15-25 days including approvals.';
    }
    if (m.includes('warrant') || m.includes('guarantee')) {
      return 'We offer a 25-year panel performance warranty, 10-year inverter warranty, and our ClansZero savings guarantee - India\'s first!';
    }
    if (m.includes('hi') || m.includes('hello') || m.includes('hey')) {
      return 'Hello! I am your Solar Helper. I can help with solar savings, pricing, subsidies and more. What would you like to know?';
    }
    return 'Great question! Our solar experts can give you a detailed answer. Book a free consultation and we will call you within 2 hours.';
  }

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    addMsg(text, false);
    chatInput.value = '';
    setTimeout(() => addMsg(getBotResponse(text), true), 700);
  }

  if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
      const isOpen = chatbotPanel.style.display !== 'none';
      chatbotPanel.style.display = isOpen ? 'none' : 'block';
    });
  }
  if (chatClose) {
    chatClose.addEventListener('click', () => {
      chatbotPanel.style.display = 'none';
    });
  }
  if (chatSend) {
    chatSend.addEventListener('click', sendChat);
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendChat();
    });
  }

  /* ---- FAQ ACCORDION ---- */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
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

  // Quick replies
  document.querySelectorAll('.quick-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      const reply = btn.dataset.reply;
      addMsg(reply, false);
      setTimeout(() => addMsg(getBotResponse(reply), true), 700);
      chatbotPanel.style.display = 'block';
    });
  });

  /* Theme picker is handled by js/shared-theme.js (shared across all pages). */

})();
