/* ============================================================
   CLANS MACHINA - SOLAR SAVINGS + EMI CALCULATOR
   Standalone logic for calculator.html
   ============================================================ */
(function () {
  'use strict';

  var rupee = '₹';

  function fmt(n) {
    return rupee + Math.round(n).toLocaleString('en-IN');
  }

  /* ------------------------------------------------------------
     All tunable constants live in js/calculator-data.js
     (window.CALC_DATA). The FRD estimate math lives in the shared
     engine js/solar-engine.js (window.SolarEngine) so the homepage
     teaser and this calculator can never silently diverge.
     ------------------------------------------------------------ */
  var CD = window.CALC_DATA || {};
  var TARIFF = CD.tariffPerUnit || 5;   // ₹/unit — used for the bill<->units input toggle

  var computeEstimate = (window.SolarEngine && window.SolarEngine.computeEstimate) || function () {
    return {}; // engine failed to load — guarded below so the page doesn't throw
  };

  /* ------------------------------------------------------------
     LOCATION → STATE resolution (pan-India). The FRD subsidy table's
     `state` amounts are the Odisha figures, so the state top-up only
     applies to Odisha; everywhere else shows central subsidy only.
     Resolves a typed/detected location string to its state via the
     CITIES_INDIA list, or directly if the string is a state name.
     ------------------------------------------------------------ */
  function resolveState(locStr) {
    if (!locStr) return '';
    var q = String(locStr).trim().toLowerCase();
    if (!q) return '';
    if (q.indexOf('odisha') >= 0 || q.indexOf('orissa') >= 0) return 'Odisha';
    var cities = window.CITIES_INDIA || [];
    for (var i = 0; i < cities.length; i++) {
      if (cities[i].name.toLowerCase() === q || cities[i].state.toLowerCase() === q) {
        return cities[i].state;
      }
    }
    return '';   // unknown / free-typed → treated as non-Odisha (central-only)
  }

  /* ---------- shared state fed from estimator into EMI ---------- */
  var assetCost = 300000;   // financeable system cost (net of subsidy)
  var monthlySaving = 0;    // monthly bill saving, for the cashflow insight
  var hasEstimate = false;
  var lastEstimate = null;  // full FRD result of the most recent calculation
  var lastSnapshot = null;  // flattened, display-ready values for the lead PDF

  var $ = function (id) { return document.getElementById(id); };
  function setText(id, val) { var e = $(id); if (e) e.textContent = val; }

  /* ============================================================
     STEP 1 - SAVINGS ESTIMATOR
     ============================================================ */
  var estForm = $('estForm');
  if (!estForm) return; // not on the calculator page

  /* ---- AUTO-DETECT LOCATION -> reverse-geocode GPS to a city name ---- */
  (function initDetect() {
    var btn = $('estDetect');
    var input = $('estLocation');
    if (!btn || !input) return;

    var msg = $('estDetectMsg');
    var label = $('estDetectLabel');

    function say(text, cls) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'sc-detect-msg' + (cls ? ' ' + cls : '');
      msg.hidden = !text;
    }
    function busy(on) {
      btn.disabled = on;
      btn.classList.toggle('is-loading', on);
      if (label) label.textContent = on ? 'Detecting…' : 'Detect';
    }

    // Turn GPS coordinates into the nearest town/city name via BigDataCloud's
    // free, key-less client endpoint (CORS-enabled). Prefer city, then locality.
    function lookupCity(lat, lng) {
      var url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
        encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lng) + '&localityLanguage=en';
      return fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('geocode'); return r.json(); })
        .then(function (d) { return (d.city || d.locality || d.principalSubdivision || '').trim(); });
    }

    btn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        say('Location not supported on this device — please type your city.', 'is-err');
        return;
      }
      busy(true);
      say('Getting your location…', '');
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          lookupCity(pos.coords.latitude, pos.coords.longitude)
            .then(function (city) {
              busy(false);
              if (!city) { say('Couldn\'t read your city — please type it in.', 'is-err'); return; }
              input.value = city;   // fills the field directly (no dropdown re-trigger)
              say('Location set to ' + city + '.', 'is-ok');
            })
            .catch(function () {
              busy(false);
              say('Couldn\'t look up your city — please type it in.', 'is-err');
            });
        },
        function (err) {
          busy(false);
          var m = err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — please type your city.'
            : 'Couldn\'t detect location — please type your city.';
          say(m, 'is-err');
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    });
  })();

  /* ---- CITY AUTOCOMPLETE (pan-India combobox) ---- */
  (function initCityAutocomplete() {
    var input = $('estLocation');
    var list = $('estCityList');
    var cities = window.CITIES_INDIA;
    if (!input || !list || !cities || !cities.length) return;

    var matches = [];
    var activeIdx = -1;

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); activeIdx = -1; }
    function render() {
      if (!matches.length) { close(); return; }
      list.innerHTML = matches.map(function (c, i) {
        return '<li class="sc-ac-item" role="option" data-i="' + i + '">' +
          '<strong>' + esc(c.name) + '</strong><span>' + esc(c.state) + '</span></li>';
      }).join('');
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function filter() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { close(); return; }
      var starts = [], contains = [];
      for (var i = 0; i < cities.length; i++) {
        var p = cities[i].name.toLowerCase().indexOf(q);
        if (p === 0) starts.push(cities[i]);
        else if (p > 0) contains.push(cities[i]);
      }
      matches = starts.concat(contains).slice(0, 8);
      activeIdx = -1;
      render();
    }
    function choose(i) { var c = matches[i]; if (c) { input.value = c.name; close(); } }
    function highlight(idx) {
      var items = list.querySelectorAll('.sc-ac-item');
      for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-active', i === idx);
      activeIdx = idx;
    }

    input.addEventListener('input', filter);
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) filter(); });
    input.addEventListener('keydown', function (e) {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(Math.min(activeIdx + 1, matches.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(Math.max(activeIdx - 1, 0)); }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); choose(activeIdx); }
      else if (e.key === 'Escape') { close(); }
    });
    // mousedown (not click) so selection lands before the input loses focus
    list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('.sc-ac-item');
      if (li) { e.preventDefault(); choose(parseInt(li.getAttribute('data-i'), 10)); }
    });
    document.addEventListener('click', function (e) {
      if (e.target !== input && !list.contains(e.target)) close();
    });
  })();

  /* ---- TWO INTERNAL SCREENS: choose property -> calculator ---- */
  var TYPE_LABEL = { residential: 'Home', commercial: 'Commercial', industrial: 'Housing Society' };
  var consumerType = 'residential';
  var scChoose = $('scChoose');
  var scTool = $('scTool');

  var TYPE_ICON = {
    residential: '<svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10v9h14v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19v-5h4v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    commercial:  '<svg width="32" height="32" fill="none" viewBox="0 0 24 24"><rect x="4" y="3" width="11" height="18" rx="1" stroke="currentColor" stroke-width="1.8"/><path d="M15 8h5v13h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 7h2M7 11h2M7 15h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    industrial:  '<svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M3 21V10l6 4V10l6 4V7l6 3v11H3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var TYPE_HINTS = {
    residential: [
      { label: 'System size',    value: '1–10 kW'         },
      { label: 'Govt. subsidy',  value: 'Up to ₹1,38,000' },
      { label: 'Avg. payback',   value: '4–6 years'       },
      { label: 'Monthly saving', value: '₹1,500–4,000'   }
    ],
    commercial: [
      { label: 'System size',    value: '10–100 kW'       },
      { label: 'Tax benefit',    value: '40% depreciation'},
      { label: 'Avg. payback',   value: '3–5 years'       },
      { label: 'Bill reduction', value: '30–50%'          }
    ],
    industrial: [
      { label: 'System size',    value: '100 kW+'         },
      { label: 'ROI',            value: 'Highest tier'    },
      { label: 'Avg. payback',   value: '2–4 years'       },
      { label: 'Monthly saving', value: '₹50,000+'       }
    ]
  };

  function applyType(type) {
    if (!TYPE_LABEL[type]) type = 'residential';
    consumerType = type;
    setText('scTypeTag', TYPE_LABEL[type]);

    var icon = $('scVisIcon');
    if (icon) icon.innerHTML = TYPE_ICON[type];

    var label = $('scVisLabel');
    if (label) label.textContent = TYPE_LABEL[type] + ' Solar';

    var hintsEl = $('scVisHints');
    if (hintsEl) {
      hintsEl.innerHTML = TYPE_HINTS[type].map(function (h) {
        return '<div class="sc-vis-hint"><span>' + h.label + '</span><strong>' + h.value + '</strong></div>';
      }).join('');
    }

    /* reset to idle state when type changes */
    var idle = $('scVisIdle'), res = $('scVisResult');
    if (idle) idle.hidden = false;
    if (res) res.hidden = true;
  }

  function setUrlType(type) {
    try {
      var url = type ? (window.location.pathname + '?type=' + type) : window.location.pathname;
      window.history.replaceState(null, '', url);
    } catch (e) { /* history API unavailable */ }
  }

  /* Reveal scroll-animated children: they start at opacity:0 and are normally
     revealed by an IntersectionObserver, but elements inside a hidden screen
     are never observed — so reveal them when we show the screen. */
  function reveal(container) {
    if (!container) return;
    container.querySelectorAll('[data-animate]').forEach(function (el) { el.classList.add('visible'); });
  }

  function showTool(type) {
    applyType(type);
    if (scChoose) scChoose.hidden = true;
    if (scTool) scTool.hidden = false;
    reveal(scTool);
    setUrlType(type);
    window.scrollTo(0, 0);
  }

  function showChoose() {
    if (scTool) scTool.hidden = true;
    if (scChoose) scChoose.hidden = false;
    reveal(scChoose);
    setUrlType(null);
    window.scrollTo(0, 0);
  }

  // Property cards -> open the calculator for that type
  document.querySelectorAll('[data-choose-type]').forEach(function (card) {
    card.addEventListener('click', function () { showTool(card.getAttribute('data-choose-type')); });
  });
  // Back link -> return to the choose screen
  var scBack = $('scBack');
  if (scBack) scBack.addEventListener('click', showChoose);

  // Initial screen: deep-link via ?type= jumps straight to the calculator
  var initialType = null;
  try { initialType = new URLSearchParams(window.location.search).get('type'); } catch (e) {}
  if (scChoose && scTool) {
    if (initialType && TYPE_LABEL[initialType]) showTool(initialType);
    else showChoose();
  } else {
    applyType(initialType && TYPE_LABEL[initialType] ? initialType : 'residential');
  }

  // Deep-link via ?bill= (from the homepage bill slider) pre-fills the bill field
  try {
    var initialBill = new URLSearchParams(window.location.search).get('bill');
    if (initialBill && $('estBill')) {
      var b = parseInt(initialBill, 10);
      if (!isNaN(b) && b > 0) $('estBill').value = b;
    }
  } catch (e) {}

  var roof = $('estRoof');
  var roofUnit = $('estRoofUnit');
  function paintRange(el) {
    if (!el) return;
    var min = parseFloat(el.min) || 0;
    var max = parseFloat(el.max) || 100;
    var pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  estForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var tariff = TARIFF;  // ₹/unit (FRD flat rate)

    // Validate mandatory inputs
    var billInput = parseFloat($('estBill').value) || 0;
    var roofInput = parseFloat(roof.value) || 0;
    var err = $('estError');
    if (billInput <= 0 || roofInput <= 0) {
      if (err) err.hidden = false;
      (billInput <= 0 ? $('estBill') : roof).focus();
      return;
    }
    if (err) err.hidden = true;

    // Electricity input: rupee bill or kWh units
    var billUnit = $('estBillUnit') ? $('estBillUnit').value : 'bill';
    var bill, monthlyUnits;
    if (billUnit === 'units') { monthlyUnits = billInput; bill = monthlyUnits * tariff; }
    else { bill = billInput; monthlyUnits = bill / tariff; }

    // Roof area normalised to sq ft (~100 sq ft per kW)
    var roofArea = (roofUnit && roofUnit.value === 'sqm') ? roofInput * 10.7639 : roofInput;

    // Location → state: the state subsidy top-up applies to Odisha only.
    var locInput = $('estLocation') ? $('estLocation').value : '';
    var resolvedState = resolveState(locInput);
    var stateEligible = resolvedState === 'Odisha';

    // --- Run the FRD engine (shared with the homepage teaser) ---
    var est = computeEstimate(bill, roofArea, consumerType, { includeStateSubsidy: stateEligible });
    lastEstimate = est;

    // Map engine outputs onto the locals the existing report paints.
    var systemSize   = est.recommendedKw;
    var monthlyGen   = est.monthlyGen;
    var panels       = est.panels;
    var co2          = parseFloat((est.co2AnnualKg / 1000).toFixed(1)); // annual tonnes
    monthlySaving    = est.monthlySaving;   // module-level: feeds EMI cashflow
    var annualSaving = est.annualSaving;
    var savings25    = est.savings25;
    var grossCost    = est.cost;
    var subsidy      = est.subsidy.total;
    var netCost      = est.investment;
    var payback      = parseFloat(est.payback.toFixed(1));

    // Bill-comparison bar (savings can meet or exceed the bill once sized to load).
    var newBill   = Math.max(bill - monthlySaving, 0);
    var reduction = bill > 0 ? Math.min(100, Math.round(monthlySaving / bill * 100)) : 0;

    // Roof-shortfall notice (FRD Step 3)
    var roofWarn = $('rRoofWarn');
    if (roofWarn) {
      if (est.roofShortfall) {
        setText('rRoofWarnMsg',
          'Based on your available roof area, we recommend a maximum of ' + est.recommendedKw +
          ' kW. To reach your ideal ' + est.idealKw + ' kW system, an additional ' +
          Math.round(est.extraSqft).toLocaleString('en-IN') + ' sq ft of shadow-free roof is required.');
        roofWarn.hidden = false;
      } else {
        roofWarn.hidden = true;
      }
    }

    // Paint report — headline + system stats
    setText('rSavings25', fmt(savings25));
    setText('rSavingsAnnual', fmt(annualSaving));
    setText('rSystem', systemSize + ' kW');
    setText('rRoofReq', Math.round(est.roofRequired).toLocaleString('en-IN'));
    setText('rConsumption', Math.round(est.monthlyUnits).toLocaleString('en-IN'));
    setText('rGen', monthlyGen.toLocaleString('en-IN'));
    setText('rPayback', payback + ' yrs');

    // Extra dashboard figures (FRD Step 12 display list)
    var gen25 = monthlyGen * 12 * 25;                 // total units generated over life
    var netBenefit = Math.max(savings25 - netCost, 0); // savings minus investment
    setText('rSaveMo', fmt(monthlySaving));
    setText('rGen25', Math.round(gen25).toLocaleString('en-IN'));
    setText('rNetBenefit', fmt(netBenefit));

    // Cost + subsidy split (FRD Steps 5–7)
    setText('rGross', fmt(grossCost));
    setText('rSubCentral', '− ' + fmt(est.subsidy.central));
    // State subsidy row: shown only where a state top-up applies (Odisha).
    // Elsewhere (pan-India) we show central subsidy only.
    var stateRow = $('rSubStateRow');
    if (est.subsidy.state > 0) {
      setText('rSubStateLabel', resolvedState + ' state subsidy');
      setText('rSubState', '− ' + fmt(est.subsidy.state));
      if (stateRow) stateRow.style.display = '';
    } else if (stateRow) {
      stateRow.style.display = 'none';
    }
    setText('rSubsidy2', '− ' + fmt(subsidy));
    setText('rNet', fmt(netCost));

    // Bill comparison
    setText('rBillNow', fmt(bill));
    setText('rBillSolar', fmt(newBill));
    setText('rReduction', reduction + '%');
    if ($('barNow')) $('barNow').style.width = '100%';
    if ($('barSolar')) $('barSolar').style.width = Math.max(8, Math.round(newBill / bill * 100)) + '%';

    // Carbon impact (FRD Step 13): monthly kg, yearly kg, lifetime tonnes + message
    setText('rCo2Mo', Math.round(est.co2MonthlyKg).toLocaleString('en-IN') + ' kg');
    setText('rCo2Yr', Math.round(est.co2AnnualKg).toLocaleString('en-IN') + ' kg');
    setText('rCo2Life', est.co2LifeT.toFixed(1) + ' t');
    setText('rCo2Msg', 'By installing this solar system, you can reduce approximately ' +
      Math.round(est.co2LifeT) + ' tonnes of CO₂ emissions over 25 years, contributing to a cleaner, greener environment.');

    if ($('scPlaceholder')) $('scPlaceholder').hidden = true;
    var report = $('scReport');
    report.hidden = false;

    // Update left visual panel: show gauge + mini stats
    var scVisIdle = $('scVisIdle'), scVisResult = $('scVisResult');
    if (scVisIdle) scVisIdle.hidden = true;
    if (scVisResult) scVisResult.hidden = false;

    setText('vSystem', systemSize + ' kW');
    setText('vPanels', panels + ' panels');
    setText('vGen', monthlyGen.toLocaleString('en-IN') + ' units/mo');
    setText('vCo2', co2 + ' T/yr');

    // Animate the gauge (circumference of r=62 circle ≈ 390)
    var gaugeFill = $('gaugeFill');
    var gaugePct  = $('gaugePct');
    if (gaugeFill) {
      var circ = 390;
      var offset = circ * (1 - reduction / 100);
      gaugeFill.style.strokeDashoffset = circ; // reset
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          gaugeFill.style.strokeDashoffset = offset;
        });
      });
    }
    if (gaugePct) gaugePct.textContent = reduction + '%';

    // Snapshot every display value so the lead form / PDF proposal can
    // reproduce exactly what the customer saw (no recompute, no drift).
    lastSnapshot = {
      generatedAt: new Date(),
      propertyType: TYPE_LABEL[consumerType] || 'Home',
      location: locInput || '',
      state: resolvedState || '',
      bill: bill, monthlyUnits: est.monthlyUnits,
      systemSize: systemSize, roofRequired: est.roofRequired, panels: panels,
      monthlyGen: monthlyGen, gen25: gen25,
      grossCost: grossCost, subCentral: est.subsidy.central, subState: est.subsidy.state,
      subsidyTotal: subsidy, netCost: netCost, netBenefit: netBenefit,
      monthlySaving: monthlySaving, annualSaving: annualSaving, savings25: savings25,
      payback: payback, billNow: bill, billSolar: newBill, reduction: reduction,
      co2Mo: est.co2MonthlyKg, co2Yr: est.co2AnnualKg, co2Life: est.co2LifeT
    };

    // Reveal the PDF-download card for this fresh estimate.
    var scLead = $('scLead');
    if (scLead) scLead.hidden = false;

    // Feed EMI calculator
    hasEstimate = true;
    assetCost = netCost;
    configureEmiFromAsset(netCost);

    report.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ============================================================
     PDF PROPOSAL
     One button generates a branded, print-optimised proposal and
     hands it to the browser's "Save as PDF" via a hidden iframe
     (no external libraries). The proposal is built from the current
     estimate snapshot plus the live EMI figures.
     ============================================================ */
  (function initPdfProposal() {
    var pdfBtn = $('pdfBtn');
    if (!pdfBtn) return;

    var rupeeInr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    // Preload the brand logo as a data URI so it's guaranteed inlined before
    // the print dialog fires (a network <img> may not load in time). Falls
    // back to a text wordmark if the fetch fails.
    var logoDataUri = null;
    (function preloadLogo() {
      try {
        fetch('image/clans_logo.webp')
          .then(function (r) { return r.ok ? r.blob() : null; })
          .then(function (b) {
            if (!b) return;
            var fr = new FileReader();
            fr.onload = function () { logoDataUri = fr.result; };
            fr.readAsDataURL(b);
          })
          .catch(function () {});
      } catch (e) { /* fetch unsupported — text fallback used */ }
    })();

    // Read the live EMI figures from the calculator's EMI panel (Step 2).
    function emiFigures() {
      var t = function (id) { var e = $(id); return e ? e.textContent.trim() : ''; };
      return {
        monthly: t('emiMonthly'), months: t('emiMonths'), tenure: t('emiTenureVal'),
        loan: t('emiLoanVal'), interest: t('emiTotalInterest'), total: t('emiTotal')
      };
    }

    function proposalHTML(s, lead, emi) {
      var d = s.generatedAt instanceof Date ? s.generatedAt : new Date();
      var dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      var row = function (label, val, strong) {
        return '<tr><td>' + esc(label) + '</td><td class="num' + (strong ? ' hl' : '') + '">' + val + '</td></tr>';
      };
      var subStateRow = s.subState > 0
        ? row((s.state || 'State') + ' subsidy', '− ' + rupeeInr(s.subState)) : '';
      var brandMark = logoDataUri
        ? '<img class="logo" src="' + logoDataUri + '" alt="Clans Machina" />'
        : '<div class="brand">Clans Machina <span>Solar</span></div>';
      var where = esc(s.location || '');
      var emiSection = (emi && emi.monthly) ?
        ('<h2>Loan / EMI plan</h2><table>' +
          row('Loan amount', esc(emi.loan)) +
          row('Monthly EMI', esc(emi.monthly) + (emi.months ? ' × ' + esc(emi.months) + ' months' : ''), true) +
          row('Interest rate', '6.5% p.a.') +
          row('Total interest', esc(emi.interest)) +
          row('Total repayment', esc(emi.total)) +
        '</table>') : '';
      var usps = ['Premium Solar Solutions', 'MNRE-Compliant Installation', 'Government Subsidy Assistance',
        'Bank Loan Support', 'Net Metering Assistance', 'Comprehensive Warranty',
        'Professional Installation', 'Dedicated After-Sales Service'];
      // "Prepared for" line — customer details are optional (no lead form).
      var top = [];
      if (lead && lead.name) top.push('Prepared for <b>' + esc(lead.name) + '</b>');
      if (lead && lead.phone) top.push(esc(lead.phone));
      if (lead && lead.email) top.push(esc(lead.email));
      var bottom = [];
      if (where) bottom.push('Location: <b>' + where + '</b>');
      bottom.push('Property: <b>' + esc(s.propertyType) + '</b>');
      bottom.push('Monthly bill: <b>' + rupeeInr(s.bill) + '</b>');
      var whoLine = (top.length ? top.join(' · ') + '<br>' : '') + bottom.join(' · ');
      return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Clans Machina — Solar Proposal</title><style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:"Segoe UI",Arial,sans-serif;color:#12241c;padding:30px 34px;font-size:13px;line-height:1.5}' +
'.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #3ecf8e;padding-bottom:14px;margin-bottom:18px}' +
'.logo{height:40px;width:auto}' +
'.brand{font-size:22px;font-weight:800;color:#0f6f47;letter-spacing:-.5px}' +
'.brand span{color:#3ecf8e}' +
'.meta{text-align:right;font-size:11px;color:#6b7c74;line-height:1.7}' +
'.meta b{color:#12241c}' +
'h2{font-size:15px;color:#0f6f47;margin:20px 0 8px}' +
'.hero{background:linear-gradient(135deg,#e9fbf3,#f4fbf8);border:1px solid #cdeede;border-radius:10px;padding:16px 18px;margin-bottom:6px}' +
'.hero .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7c74}' +
'.hero .big{font-size:30px;font-weight:800;color:#0f6f47;line-height:1.1;margin-top:2px}' +
'.hero .sub{font-size:12px;color:#3a5248;margin-top:2px}' +
'.who{font-size:12px;color:#3a5248;margin-bottom:14px}' +
'.who b{color:#12241c}' +
'.grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:6px}' +
'.card{flex:1 1 44%;border:1px solid #e0e8e4;border-radius:8px;padding:10px 12px}' +
'.card .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7c74}' +
'.card .v{font-size:17px;font-weight:700;color:#12241c;margin-top:2px}' +
'table{width:100%;border-collapse:collapse;margin-top:4px}' +
'td{padding:6px 2px;border-bottom:1px solid #eef2f0}' +
'td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}' +
'td.num.hl{color:#0f6f47;font-size:15px}' +
'tr.total td{border-top:2px solid #cdeede;border-bottom:none;padding-top:9px;font-size:15px;font-weight:800;color:#0f6f47}' +
'.why{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:4px;padding:0;list-style:none}' +
'.why li{flex:1 1 40%;font-size:12px;color:#3a5248;padding-left:16px;position:relative}' +
'.why li:before{content:"";position:absolute;left:0;top:5px;width:8px;height:8px;border-radius:50%;background:#3ecf8e}' +
'.cta{margin-top:18px;background:#0f6f47;color:#fff;border-radius:10px;padding:16px 18px}' +
'.cta h3{color:#fff;font-size:14px;margin-bottom:6px}' +
'.cta p{color:#e9fbf3;font-size:12px;margin:2px 0}' +
'.cta b{color:#fff}' +
'.foot{margin-top:18px;border-top:1px solid #e0e8e4;padding-top:12px;font-size:10.5px;color:#8a978f;line-height:1.6}' +
'@media print{body{padding:0}}' +
'</style></head><body>' +
'<div class="head">' + brandMark +
'<div class="meta"><b>Solar Proposal</b><br>' + esc(dateStr) + '</div></div>' +
'<div class="who">' + whoLine + '</div>' +
'<div class="hero"><div class="lbl">Estimated 25-year savings</div>' +
'<div class="big">' + rupeeInr(s.savings25) + '</div>' +
'<div class="sub">' + rupeeInr(s.annualSaving) + ' saved every year · ' + rupeeInr(s.monthlySaving) + '/month · Net benefit ' + rupeeInr(s.netBenefit) + '</div></div>' +
'<h2>Recommended system</h2><div class="grid">' +
'<div class="card"><div class="k">Recommended capacity</div><div class="v">' + s.systemSize + ' kW</div></div>' +
'<div class="card"><div class="k">Roof area required</div><div class="v">' + Math.round(s.roofRequired).toLocaleString('en-IN') + ' sq ft</div></div>' +
'<div class="card"><div class="k">Monthly generation</div><div class="v">' + Math.round(s.monthlyGen).toLocaleString('en-IN') + ' units</div></div>' +
'<div class="card"><div class="k">Payback period</div><div class="v">' + s.payback + ' yrs</div></div>' +
'</div>' +
'<h2>Investment & subsidy</h2><table>' +
row('Project cost', rupeeInr(s.grossCost)) +
row('Central subsidy', '− ' + rupeeInr(s.subCentral)) +
subStateRow +
row('Total subsidy', '− ' + rupeeInr(s.subsidyTotal)) +
'<tr class="total"><td>Your investment</td><td class="num">' + rupeeInr(s.netCost) + '</td></tr>' +
'</table>' +
emiSection +
'<h2>Bill & environment impact</h2><table>' +
row('Current monthly bill', rupeeInr(s.billNow)) +
row('Bill with solar', rupeeInr(s.billSolar), true) +
row('Bill reduction', s.reduction + '%') +
row('CO₂ avoided (per month)', Math.round(s.co2Mo).toLocaleString('en-IN') + ' kg') +
row('CO₂ avoided (per year)', Math.round(s.co2Yr).toLocaleString('en-IN') + ' kg') +
row('CO₂ avoided (25 years)', s.co2Life.toFixed(1) + ' tonnes') +
'</table>' +
'<h2>Why choose Clans Machina</h2><ul class="why">' +
usps.map(function (u) { return '<li>' + u + '</li>'; }).join('') +
'</ul>' +
'<div class="cta"><h3>Ready for the next step?</h3>' +
'<p>Book a <b>free site survey</b> and talk to a solar expert.</p>' +
'<p>Call / WhatsApp: <b>+91 91241 65341</b> · Email: <b>info@clansmachina.in</b></p>' +
'<p>Website: <b>www.clansmachina.in</b></p></div>' +
'<div class="foot">Indicative estimate generated by the Clans Machina solar calculator per the standard tariff, generation and PM Surya Ghar subsidy assumptions. ' +
'Final figures depend on your roof, shading, DISCOM tariff and site survey. Subsidy eligibility is subject to prevailing government policy. ' +
'This document is a savings estimate, not a contract or a guarantee.</div>' +
'</body></html>';
    }

    function downloadPdf(snapshot, lead) {
      // EMI is read live at download time (reflects whatever the customer set
      // in the EMI panel).
      var html = proposalHTML(snapshot, lead, emiFigures());
      var frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(frame);
      var doc = frame.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
      var done = false;
      function go() {
        if (done) return; done = true;
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch (e) { /* print unavailable */ }
        // Leave the frame long enough for the print dialog to read it.
        setTimeout(function () { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 60000);
      }
      // Give the iframe a tick to lay out before printing.
      if (frame.contentWindow.document.readyState === 'complete') setTimeout(go, 150);
      else frame.onload = function () { setTimeout(go, 150); };
    }

    pdfBtn.addEventListener('click', function () {
      if (!lastSnapshot) return;   // no estimate yet — button is hidden until then
      downloadPdf(lastSnapshot, { state: lastSnapshot.state, propertyType: lastSnapshot.propertyType });
    });
  })();

  /* ============================================================
     STEP 2 - EMI CALCULATOR
     ============================================================ */
  var loanEl = $('emiLoan');
  var dpEl = $('emiDp');
  var tenureEl = $('emiTenure');
  var RATE = (CD.emi && CD.emi.interestRate) || 6.5;   // fixed p.a. (FRD Step 8)
  var syncing = false;

  /* Re-base the sliders when a fresh estimate comes in. */
  function configureEmiFromAsset(cost) {
    cost = Math.max(50000, Math.round(cost / 5000) * 5000);
    loanEl.max = cost;
    var dp = parseFloat(dpEl.value) || 20;
    loanEl.value = Math.round(cost * (1 - dp / 100) / 5000) * 5000;
    $('emiAsset').textContent = fmt(cost);
    updateEmi();
  }

  function currentCost() {
    return parseFloat(loanEl.max) || assetCost;
  }

  function emiFor(P, years, annualRatePct) {
    var months = Math.round(12 * years);
    var r = months >= 12 ? annualRatePct / 100 / 12 : 0;
    var emi = r > 0
      ? Math.floor(P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1))
      : (months > 0 ? Math.floor(P / months) : 0);
    var total = emi * months;
    return { emi: emi, months: months, total: total, interest: Math.max(total - P, 0) };
  }

  function updateEmi() {
    var cost = currentCost();
    var loan = parseFloat(loanEl.value) || 0;
    var dp = cost - loan;
    var dpPct = cost > 0 ? Math.round(dp / cost * 100) : 0;
    var tenure = parseFloat(tenureEl.value) || 5;
    var rate = RATE;   // fixed 6.5% p.a. per FRD

    var res = emiFor(loan, tenure, rate);

    $('emiLoanVal').textContent = fmt(loan);
    $('emiDpVal').innerHTML = dpPct + '% &middot; ' + fmt(dp);
    $('emiTenureVal').textContent = tenure + (tenure === 1 ? ' year' : ' years');
    $('emiInterestVal').textContent = rate + '% p.a.';
    $('emiMonthly').textContent = fmt(res.emi);
    $('emiMonths').textContent = res.months;
    $('emiPrincipal').textContent = fmt(loan);
    $('emiInterest2').textContent = fmt(res.interest);
    $('emiTotalInterest').textContent = fmt(res.interest);
    $('emiTotal').textContent = fmt(res.total);

    var denom = loan + res.interest;
    var pPct = denom > 0 ? (loan / denom * 100) : 100;
    $('splitPrincipal').style.width = pPct + '%';
    $('splitInterest').style.width = (100 - pPct) + '%';

    [loanEl, dpEl, tenureEl].forEach(paintRange);

    // Net cashflow insight (only meaningful after an estimate)
    var cashflow = $('emiCashflow');
    if (hasEstimate && monthlySaving > 0) {
      var net = res.emi - monthlySaving;
      cashflow.hidden = false;
      if (net <= 0) {
        $('emiNet').textContent = '+' + fmt(Math.abs(net)) + ' / month';
        $('emiNet').className = 'sc-cashflow-value positive';
        $('emiNetNote').textContent = 'Your monthly savings (' + fmt(monthlySaving) + ') exceed the EMI — you are cash-positive from day one.';
      } else {
        $('emiNet').textContent = fmt(net) + ' / month';
        $('emiNet').className = 'sc-cashflow-value';
        $('emiNetNote').textContent = 'EMI ' + fmt(res.emi) + ' minus solar savings ' + fmt(monthlySaving) + '. Outgo drops to zero once the loan is repaid.';
      }
    } else {
      cashflow.hidden = true;
    }
  }

  // Two-way sync: loan <-> down payment
  loanEl.addEventListener('input', function () {
    if (syncing) return;
    syncing = true;
    var cost = currentCost();
    var dpPct = cost > 0 ? Math.round((cost - parseFloat(loanEl.value)) / cost * 100) : 0;
    dpEl.value = Math.min(90, Math.max(0, dpPct));
    syncing = false;
    updateEmi();
  });
  dpEl.addEventListener('input', function () {
    if (syncing) return;
    syncing = true;
    var cost = currentCost();
    loanEl.value = Math.round(cost * (1 - parseFloat(dpEl.value) / 100) / 5000) * 5000;
    syncing = false;
    updateEmi();
  });
  tenureEl.addEventListener('input', updateEmi);

  // Initial paint with default asset cost
  configureEmiFromAsset(assetCost);

  /* Hero visual: count-up the sample 25-year savings figure once. */
  (function heroCountUp() {
    var el = document.getElementById('scArtCount');
    if (!el) return;
    var target = 1280000, dur = 1600, start = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = fmt(target); return; }
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  })();
})();
