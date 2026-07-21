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
     STATE / DISTRICT — the user picks State then District from real
     cascading dropdowns (js/india-states-districts.js). The FRD subsidy
     table's `state` amounts are the Odisha figures, so the state top-up
     applies to Odisha only; everywhere else shows central subsidy only.
     The selected state is read straight off the dropdown at submit time.
     ------------------------------------------------------------ */

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

  /* ---- STATE → DISTRICT CASCADING DROPDOWNS (all India) ---- */
  (function initStateDistrict() {
    var stateSel = $('estState');
    var distSel = $('estDistrict');
    var data = window.INDIA_STATES_DISTRICTS;
    if (!stateSel || !distSel || !data) return;

    function opt(value, label, disabled, selected) {
      var o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      if (disabled) o.disabled = true;
      if (selected) o.selected = true;
      return o;
    }

    // Populate states alphabetically.
    Object.keys(data).sort().forEach(function (st) {
      stateSel.appendChild(opt(st, st, false, false));
    });

    // Fill districts for the chosen state (already sorted in the data file).
    function fillDistricts(state, keep) {
      distSel.innerHTML = '';
      var list = data[state] || [];
      if (!list.length) {
        distSel.appendChild(opt('', 'Select state first', true, true));
        distSel.disabled = true;
        return;
      }
      distSel.appendChild(opt('', 'Select district', true, !keep));
      list.forEach(function (d) {
        distSel.appendChild(opt(d, d, false, keep && d === keep));
      });
      distSel.disabled = false;
    }

    stateSel.addEventListener('change', function () {
      fillDistricts(stateSel.value, null);
    });
    // No default state — the user must pick, so the state subsidy is never
    // applied to the wrong location.
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

    // Validate mandatory inputs (State, District, Bill, Roof)
    var stateSel = $('estState');
    var distSel = $('estDistrict');
    var stateVal = stateSel ? stateSel.value : '';
    var districtVal = distSel ? distSel.value : '';
    var billInput = parseFloat($('estBill').value) || 0;
    var roofInput = parseFloat(roof.value) || 0;
    var err = $('estError');
    if (!stateVal || !districtVal || billInput <= 0 || roofInput <= 0) {
      if (err) err.hidden = false;
      var focusEl = !stateVal ? stateSel : (!districtVal ? distSel : (billInput <= 0 ? $('estBill') : roof));
      if (focusEl) focusEl.focus();
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

    // State → subsidy: the state top-up applies to Odisha only.
    var resolvedState = stateVal;
    var locInput = districtVal + ', ' + stateVal;   // display string for the PDF
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
      district: districtVal || '',
      bill: bill, monthlyUnits: est.monthlyUnits,
      systemSize: systemSize, roofRequired: est.roofRequired, panels: panels,
      monthlyGen: monthlyGen, gen25: gen25,
      grossCost: grossCost, subCentral: est.subsidy.central, subState: est.subsidy.state,
      subsidyTotal: subsidy, netCost: netCost, netBenefit: netBenefit,
      monthlySaving: monthlySaving, annualSaving: annualSaving, savings25: savings25,
      payback: payback, billNow: bill, billSolar: newBill, reduction: reduction,
      co2Mo: est.co2MonthlyKg, co2Yr: est.co2AnnualKg, co2Life: est.co2LifeT
    };

    // Reveal the PDF-download card for this fresh estimate and reset it back
    // to the lead form (a new estimate warrants a new proposal number).
    var scLead = $('scLead');
    if (scLead) scLead.hidden = false;
    if (typeof window.__resetLeadForm === 'function') window.__resetLeadForm();
    // Auto-fetch the lead form's District (and State) from the estimator
    // selection — always in sync, so the proposal matches what was chosen.
    var leadDistrictEl = $('leadDistrict');
    if (leadDistrictEl) leadDistrictEl.value = districtVal;
    var leadStateEl = $('leadState');
    if (leadStateEl) leadStateEl.value = stateVal;

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

    // Auto-generate a unique proposal number: CM-YYYYMMDD-XXXX.
    function makeProposalNo(d) {
      var y = d.getFullYear();
      var m = ('0' + (d.getMonth() + 1)).slice(-2);
      var day = ('0' + d.getDate()).slice(-2);
      var rand = Math.floor(1000 + Math.random() * 9000);
      return 'CM-' + y + m + day + '-' + rand;
    }

    function proposalHTML(s, lead, emi) {
      var d = s.generatedAt instanceof Date ? s.generatedAt : new Date();
      var dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      var proposalNo = (lead && lead.proposalNo) || makeProposalNo(d);
      var inr = function (n) { return Math.round(n).toLocaleString('en-IN'); };
      var row = function (label, val, strong) {
        return '<tr><td>' + esc(label) + '</td><td class="cm-num' + (strong ? ' cm-hl' : '') + '">' + val + '</td></tr>';
      };
      var card = function (k, v) {
        return '<div class="cm-card"><div class="cm-k">' + k + '</div><div class="cm-v">' + v + '</div></div>';
      };
      var subStateRow = s.subState > 0
        ? row((s.state || 'State') + ' subsidy', '− ' + rupeeInr(s.subState)) : '';
      var brandMark = logoDataUri
        ? '<img class="cm-logo" src="' + logoDataUri + '" alt="Clans Machina" />'
        : '<div class="cm-brand">Clans Machina <span>Solar</span></div>';
      var emiSection = (emi && emi.monthly) ?
        ('<div class="cm-h2">Loan / EMI plan</div><table>' +
          row('Loan amount', esc(emi.loan)) +
          row('Monthly EMI', esc(emi.monthly) + (emi.months ? ' × ' + esc(emi.months) + ' months' : ''), true) +
          row('Interest rate', '6.5% p.a.') +
          row('Total interest', esc(emi.interest)) +
          row('Total repayment', esc(emi.total)) +
        '</table>') : '';
      var usps = ['Premium Solar Solutions', 'MNRE-Compliant Installation', 'Government Subsidy Assistance',
        'Bank Loan Support', 'Net Metering Assistance', 'Comprehensive Warranty',
        'Professional Installation', 'Dedicated After-Sales Service'];
      // Inline SVGs (self-contained — no external assets in the print doc).
      var checkSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#3ecf8e"/><path d="M8 12.4l2.6 2.6 5-5.6" stroke="#0b3b28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var icoPhone = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6.5 3h3l1.5 4-2 1.4a11 11 0 0 0 5 5l1.4-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5a2 2 0 0 1 2-2Z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      var icoMail = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#fff" stroke-width="1.6"/><path d="m3.5 7 8.5 6 8.5-6" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      var icoGlobe = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="1.6"/><path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z" stroke="#fff" stroke-width="1.6"/></svg>';
      var ctaItem = function (ico, k, v) {
        return '<div class="cm-cta-item"><span class="cm-ico">' + ico + '</span>' +
          '<div><div class="cm-cik">' + k + '</div><div class="cm-civ">' + v + '</div></div></div>';
      };
      // Contact + site line — the name/date/proposal-no already show in the band above.
      var top = [];
      if (lead && lead.phone) top.push('Mobile: <b>' + esc(lead.phone) + '</b>');
      if (lead && lead.email) top.push('Email: <b>' + esc(lead.email) + '</b>');
      var bottom = [];
      var district = (lead && lead.district) || s.district || '';
      if (district) bottom.push('District: <b>' + esc(district) + '</b>');
      if (s.state) bottom.push('State: <b>' + esc(s.state) + '</b>');
      bottom.push('Property: <b>' + esc(s.propertyType) + '</b>');
      bottom.push('Monthly bill: <b>' + rupeeInr(s.bill) + '</b>');
      var whoLine = (top.length ? top.join(' · ') + '<br>' : '') + bottom.join(' · ');

      // NOTE: every class is `cm-`-prefixed and scoped under #cmroot so the host
      // site's stylesheet (e.g. its own .hero/.logo/.cta rules) can never leak in
      // — html2canvas reads computed styles from the live DOM.
      return '<style>' +
'#cmroot,#cmroot *{box-sizing:border-box;margin:0;padding:0;font-family:"Segoe UI",Arial,sans-serif}' +
'#cmroot{color:#12241c;background:#fff;padding:26px 30px;font-size:13px;line-height:1.5;width:100%}' +
'#cmroot .cm-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #3ecf8e;padding-bottom:12px;margin-bottom:14px}' +
'#cmroot .cm-logo{height:38px;width:auto}' +
'#cmroot .cm-brand{font-size:22px;font-weight:800;color:#0f6f47;letter-spacing:-.5px}' +
'#cmroot .cm-brand span{color:#3ecf8e}' +
'#cmroot .cm-meta{text-align:right;font-size:11px;color:#6b7c74;line-height:1.7}' +
'#cmroot .cm-meta b{color:#12241c}' +
'#cmroot .cm-h2{font-size:15px;font-weight:800;color:#0f6f47;margin:15px 0 6px;page-break-after:avoid;break-after:avoid}' +
'#cmroot .cm-hero{background:linear-gradient(135deg,#e9fbf3,#f4fbf8);border:1px solid #cdeede;border-radius:10px;padding:14px 16px;margin-bottom:4px;page-break-inside:avoid;break-inside:avoid}' +
'#cmroot .cm-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7c74}' +
'#cmroot .cm-big{font-size:28px;font-weight:800;color:#0f6f47;line-height:1.1;margin-top:2px}' +
'#cmroot .cm-sub{font-size:12px;color:#3a5248;margin-top:2px}' +
'#cmroot .cm-who{font-size:12px;color:#3a5248;margin-bottom:12px}' +
'#cmroot .cm-who b{color:#12241c}' +
'#cmroot .cm-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px;page-break-inside:avoid;break-inside:avoid}' +
'#cmroot .cm-card{flex:1 1 30%;border:1px solid #e0e8e4;border-radius:8px;padding:9px 11px}' +
'#cmroot .cm-k{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#6b7c74}' +
'#cmroot .cm-v{font-size:16px;font-weight:700;color:#12241c;margin-top:2px}' +
'#cmroot table{width:100%;border-collapse:collapse;margin-top:2px;page-break-inside:avoid;break-inside:avoid}' +
'#cmroot td{padding:5px 2px;border-bottom:1px solid #eef2f0;font-size:12.5px}' +
'#cmroot .cm-num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}' +
'#cmroot .cm-num.cm-hl{color:#0f6f47;font-size:14px}' +
'#cmroot tr.cm-total td{border-top:2px solid #cdeede;border-bottom:none;padding-top:8px;font-size:15px;font-weight:800;color:#0f6f47}' +
'#cmroot .cm-why{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:5px;list-style:none;page-break-inside:avoid;break-inside:avoid}' +
'#cmroot .cm-why li{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:600;color:#12241c;' +
'background:linear-gradient(135deg,#f1fbf6,#f7fcfa);border:1px solid #dcefe6;border-radius:9px;padding:8px 11px}' +
'#cmroot .cm-why li svg{flex:none}' +
'#cmroot .cm-cta{margin-top:16px;position:relative;overflow:hidden;background:linear-gradient(135deg,#0b3b28,#0f6f47 68%,#12805a);' +
'color:#fff;border-radius:14px;padding:20px 22px;page-break-inside:avoid;break-inside:avoid}' +
'#cmroot .cm-cta:after{content:"";position:absolute;right:-70px;top:-70px;width:200px;height:200px;border-radius:50%;' +
'background:radial-gradient(circle,rgba(62,207,142,.45),transparent 70%)}' +
'#cmroot .cm-cta-inner{position:relative;z-index:1}' +
'#cmroot .cm-badge{display:inline-block;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;' +
'background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);border-radius:30px;padding:4px 12px;color:#d6f5e6;margin-bottom:10px}' +
'#cmroot .cm-cta-title{color:#fff;font-size:19px;font-weight:800;margin-bottom:3px;letter-spacing:-.3px}' +
'#cmroot .cm-cta-lead{color:#cdeede;font-size:12px;margin-bottom:13px}' +
'#cmroot .cm-cta-lead b{color:#8ef2c4}' +
'#cmroot .cm-cta-row{display:flex;flex-wrap:wrap;gap:9px}' +
'#cmroot .cm-cta-item{flex:1 1 28%;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.1);' +
'border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:9px 11px}' +
'#cmroot .cm-ico{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;' +
'background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22)}' +
'#cmroot .cm-cik{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#a8e6cd;margin-bottom:1px}' +
'#cmroot .cm-civ{font-size:11.5px;font-weight:700;color:#fff}' +
'#cmroot .cm-foot{margin-top:14px;border-top:1px solid #e0e8e4;padding-top:10px;font-size:10px;color:#8a978f;line-height:1.55}' +
'#cmroot .cm-cover{background:linear-gradient(135deg,#0b3b28,#0f6f47 60%,#12805a);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:14px;page-break-inside:avoid;break-inside:avoid}' +
'#cmroot .cm-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#a8e6cd}' +
'#cmroot .cm-title{font-size:23px;font-weight:800;line-height:1.12;margin:3px 0 13px;color:#fff}' +
'#cmroot .cm-cgrid{display:flex;flex-wrap:wrap;gap:26px;border-top:1px solid rgba(255,255,255,.2);padding-top:12px}' +
'#cmroot .cm-cgrid>div{display:flex;flex-direction:column;gap:2px}' +
'#cmroot .cm-cgrid span{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#a8e6cd}' +
'#cmroot .cm-cgrid b{font-size:14px;color:#fff}' +
'</style>' +
'<div id="cmroot">' +
'<div class="cm-head">' + brandMark +
'<div class="cm-meta"><b>Solar Proposal</b><br>No. ' + esc(proposalNo) + '<br>' + esc(dateStr) + '</div></div>' +
'<div class="cm-cover">' +
  '<div class="cm-kicker">Solar Savings Proposal</div>' +
  '<div class="cm-title">Your Solar Journey Starts Here</div>' +
  '<div class="cm-cgrid">' +
    '<div><span>Prepared for</span><b>' + esc((lead && lead.name) || s.propertyType) + '</b></div>' +
    '<div><span>Date</span><b>' + esc(dateStr) + '</b></div>' +
    '<div><span>Proposal No.</span><b>' + esc(proposalNo) + '</b></div>' +
  '</div>' +
'</div>' +
'<div class="cm-who">' + whoLine + '</div>' +
'<div class="cm-hero"><div class="cm-lbl">Estimated 25-year savings</div>' +
'<div class="cm-big">' + rupeeInr(s.savings25) + '</div>' +
'<div class="cm-sub">' + rupeeInr(s.annualSaving) + ' saved every year · ' + rupeeInr(s.monthlySaving) + '/month · Net benefit ' + rupeeInr(s.netBenefit) + '</div></div>' +
'<div class="cm-h2">Solar assessment &amp; recommended system</div><div class="cm-grid">' +
card('Recommended capacity', s.systemSize + ' kW') +
card('Roof area required', inr(s.roofRequired) + ' sq ft') +
card('Monthly consumption', inr(s.monthlyUnits) + ' units') +
card('Monthly generation', inr(s.monthlyGen) + ' units') +
card('Monthly saving', rupeeInr(s.monthlySaving)) +
card('Payback period', s.payback + ' yrs') +
'</div>' +
'<div class="cm-h2">Investment &amp; subsidy</div><table>' +
row('Project cost', rupeeInr(s.grossCost)) +
row('Central subsidy', '− ' + rupeeInr(s.subCentral)) +
subStateRow +
row('Total subsidy', '− ' + rupeeInr(s.subsidyTotal)) +
'<tr class="cm-total"><td>Your investment</td><td class="cm-num">' + rupeeInr(s.netCost) + '</td></tr>' +
'</table>' +
emiSection +
'<div class="cm-h2">Savings, bill &amp; environment impact</div><table>' +
row('Current monthly bill', rupeeInr(s.billNow)) +
row('Bill with solar', rupeeInr(s.billSolar), true) +
row('Bill reduction', s.reduction + '%') +
row('Annual savings', rupeeInr(s.annualSaving)) +
row('Electricity generated (25 years)', inr(s.gen25) + ' units') +
row('Net financial benefit (25 years)', rupeeInr(s.netBenefit), true) +
row('CO₂ avoided (per month)', inr(s.co2Mo) + ' kg') +
row('CO₂ avoided (per year)', inr(s.co2Yr) + ' kg') +
row('CO₂ avoided (25 years)', s.co2Life.toFixed(1) + ' tonnes') +
'</table>' +
'<div class="cm-h2">Why choose Clans Machina</div><ul class="cm-why">' +
usps.map(function (u) { return '<li>' + checkSvg + '<span>' + u + '</span></li>'; }).join('') +
'</ul>' +
'<div class="cm-cta"><div class="cm-cta-inner">' +
'<span class="cm-badge">Get Started Today</span>' +
'<div class="cm-cta-title">Ready for the next step?</div>' +
'<div class="cm-cta-lead">Book a <b>FREE site survey</b> and talk to a Clans Machina solar expert — no obligation.</div>' +
'<div class="cm-cta-row">' +
  ctaItem(icoPhone, 'Call / WhatsApp', '+91 91241 65341') +
  ctaItem(icoMail, 'Email', 'info@clansmachina.in') +
  ctaItem(icoGlobe, 'Website', 'www.clansmachina.in') +
'</div>' +
'</div></div>' +
'<div class="cm-foot">Indicative estimate generated by the Clans Machina solar calculator per the standard tariff, generation and PM Surya Ghar subsidy assumptions. ' +
'Final figures depend on your roof, shading, DISCOM tariff and site survey. Subsidy eligibility is subject to prevailing government policy. ' +
'This document is a savings estimate, not a contract or a guarantee.</div>' +
'</div>';
    }

    // Browser print fallback (used only if html2pdf fails to load/render).
    function printFallback(markup) {
      var frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(frame);
      var doc = frame.contentWindow.document;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Clans Machina — Solar Proposal</title>' +
        '<style>html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>' +
        '</head><body>' + markup + '</body></html>');
      doc.close();
      function go() {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {}
        setTimeout(function () { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 60000);
      }
      if (frame.contentWindow.document.readyState === 'complete') setTimeout(go, 150);
      else frame.onload = function () { setTimeout(go, 150); };
    }

    // POST the generated PDF (data URL) + lead to the server to email + store it.
    function emailProposal(lead, s, pdfDataUrl) {
      try {
        return fetch('send-proposal.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: lead.name, phone: lead.phone, email: lead.email,
            district: lead.district, state: lead.state, proposalNo: lead.proposalNo,
            systemSize: s.systemSize, bill: Math.round(s.bill), pdf: pdfDataUrl || ''
          })
        }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
          .catch(function () { return { ok: false }; });
      } catch (e) { return Promise.resolve({ ok: false }); }
    }

    function setEmailStatus(res) {
      var el = $('leadEmailStatus');
      if (!el) return;
      if (res && res.ok && res.emailed) {
        el.textContent = 'A copy has been emailed to your inbox.';
        el.style.color = '';
      } else if (res && res.ok) {
        el.textContent = 'Your download is ready (email delivery is not set up yet).';
      } else {
        el.textContent = 'We couldn’t email a copy — please use the download above.';
      }
    }

    // Generate the PDF client-side: instant download + (optionally) email a copy.
    // EMI figures are read live so the PDF matches the current EMI panel.
    function generateProposal(snapshot, lead, sendEmail) {
      var markup = proposalHTML(snapshot, lead, emiFigures());
      var filename = 'Clans-Machina-Solar-Proposal-' + (lead.proposalNo || 'estimate') + '.pdf';

      if (typeof window.html2pdf === 'undefined') {
        // Library missing — print for the download, still email the summary.
        printFallback(markup);
        if (sendEmail) emailProposal(lead, snapshot, '').then(setEmailStatus);
        return;
      }

      // Render at the document's top-left (not off-screen / not fixed) and tell
      // html2canvas to capture from 0,0 — otherwise, if the page is scrolled down
      // to the lead form, the capture is offset and the PDF comes out blank.
      var host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:0;top:0;width:794px;background:#fff;z-index:-1;';
      host.innerHTML = markup;
      document.body.appendChild(host);
      var root = host.querySelector('#cmroot') || host;
      function cleanup() { if (host.parentNode) host.parentNode.removeChild(host); }

      var opt = {
        margin: 0, filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2, useCORS: true, backgroundColor: '#ffffff',
          windowWidth: 794, scrollX: 0, scrollY: 0, x: 0, y: 0
        },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      // Guarantee a zero scroll offset while html2canvas captures, then restore.
      var prevScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
      window.scrollTo(0, 0);

      window.html2pdf().set(opt).from(root).toPdf().get('pdf')
        .then(function (pdf) {
          window.scrollTo(0, prevScroll);
          pdf.save(filename);                      // instant download
          return pdf.output('datauristring');      // base64 data URL for email
        })
        .catch(function () { window.scrollTo(0, prevScroll); printFallback(markup); return ''; })
        .then(function (dataUrl) {
          return sendEmail ? emailProposal(lead, snapshot, dataUrl) : null;
        })
        .then(function (res) { if (sendEmail) setEmailStatus(res); cleanup(); });
    }

    /* ---- Lead capture: gate the PDF behind Name / Mobile / Email / District ---- */
    var leadForm = $('leadForm');
    var leadDone = $('leadDone');
    var leadErr = $('leadError');
    var currentLead = null;   // the validated lead for the current proposal (re-download)

    function showErr(msg, focusEl) {
      if (leadErr) { leadErr.textContent = msg; leadErr.hidden = false; }
      if (focusEl) focusEl.focus();
    }

    if (leadForm) {
      leadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!lastSnapshot) return;   // no estimate yet — section is hidden until then

        var name = ($('leadName').value || '').trim();
        var phoneRaw = ($('leadPhone').value || '').trim();
        var phone = phoneRaw.replace(/\D/g, '');
        var email = ($('leadEmail').value || '').trim();
        var district = ($('leadDistrict').value || '').trim();

        if (!name) return showErr('Please enter your name.', $('leadName'));
        if (phone.length !== 10) return showErr('Please enter a valid 10-digit mobile number.', $('leadPhone'));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('Please enter a valid email address.', $('leadEmail'));
        if (!district) return showErr('Please enter your district.', $('leadDistrict'));
        if (leadErr) leadErr.hidden = true;

        currentLead = {
          name: name, phone: phone, email: email, district: district,
          state: lastSnapshot.state, propertyType: lastSnapshot.propertyType,
          proposalNo: makeProposalNo(lastSnapshot.generatedAt instanceof Date ? lastSnapshot.generatedAt : new Date())
        };

        // Swap the form for the "ready / download again" state.
        if (leadForm) leadForm.hidden = true;
        if (leadDone) {
          setText('leadDoneNo', currentLead.proposalNo);
          var es = $('leadEmailStatus');
          if (es) { es.textContent = 'Emailing a copy to ' + currentLead.email + '…'; es.style.color = ''; }
          leadDone.hidden = false;
        }

        // Generate the PDF: instant download + email a copy to the customer.
        generateProposal(lastSnapshot, currentLead, true);
      });
    }

    var pdfAgainBtn = $('pdfAgainBtn');
    if (pdfAgainBtn) {
      pdfAgainBtn.addEventListener('click', function () {
        if (lastSnapshot && currentLead) generateProposal(lastSnapshot, currentLead, false);
      });
    }

    // Let the estimator reset this card back to the form for a fresh estimate.
    window.__resetLeadForm = function () {
      currentLead = null;
      if (leadErr) leadErr.hidden = true;
      if (leadDone) leadDone.hidden = true;
      if (leadForm) leadForm.hidden = false;
    };
  })();

  /* ============================================================
     STEP 2 - EMI CALCULATOR
     ============================================================ */
  var loanEl = $('emiLoan');
  var dpEl = $('emiDp');
  var tenureEl = $('emiTenure');
  var RATE = (CD.emi && CD.emi.interestRate) || 6.5;   // fixed p.a. (FRD Step 8)
  // FRD Input 6 — the tenure slider snaps to these discrete years only.
  // The range input holds the index (0..n-1); this maps it to the year value.
  var TENURES = (CD.emi && CD.emi.tenures) || [3, 5, 7, 10];
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
    var tIdx = parseInt(tenureEl.value, 10);
    if (isNaN(tIdx) || tIdx < 0) tIdx = 1;
    var tenure = TENURES[tIdx] != null ? TENURES[tIdx] : 5;   // 3 / 5 / 7 / 10 yrs (FRD)
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
