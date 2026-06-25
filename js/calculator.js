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
     (window.CALC_DATA). Fall back to sane defaults if it didn't load.
     ------------------------------------------------------------ */
  var CD = window.CALC_DATA || {};
  var GEN_PER_KW  = CD.perKwDailyGen || 4;   // kWh per kW per day
  var DAYS        = CD.daysPerMonth || 30;
  var PANEL_KW    = CD.panelKw || 0.54;
  var TARIFF_DEF  = CD.tariffPerUnit || 8;
  var ESCAL       = (CD.tariffEscalation != null ? CD.tariffEscalation : 0.03);
  var LIFE_YRS    = CD.systemLifeYears || 25;
  var CO2_FAC     = CD.co2FactorKgPerKwh || 0.82;
  var SQFT_PER_KW = CD.sqftPerKw || 100;
  var GEN_TIERS   = CD.genTiers || null;

  /* Per-size daily generation (kWh/kW/day). Bigger systems yield slightly more
     per kW; interpolate between product-sheet anchors, fall back to flat rate. */
  function genPerKw(kw) {
    var t = GEN_TIERS;
    if (!t || !t.length) return GEN_PER_KW;
    if (kw <= t[0].kw) return t[0].perKwDaily;
    if (kw >= t[t.length - 1].kw) return t[t.length - 1].perKwDaily;
    for (var i = 0; i < t.length - 1; i++) {
      if (kw >= t[i].kw && kw <= t[i + 1].kw) {
        var f = (kw - t[i].kw) / (t[i + 1].kw - t[i].kw);
        return t[i].perKwDaily + f * (t[i + 1].perKwDaily - t[i].perKwDaily);
      }
    }
    return GEN_PER_KW;
  }

  /* Aerem cost-per-kW tiers (₹67k ≤5kW, ₹55k 5–10kW). */
  var COST_TIERS = CD.costPerKwTiers || [
    { uptoKw: 5,        ratePerKw: 67000 },
    { uptoKw: 10,       ratePerKw: 55000 },
    { uptoKw: Infinity, ratePerKw: 55000 }
  ];
  function baseCostPerKw(kw) {
    for (var i = 0; i < COST_TIERS.length; i++) {
      if (kw <= COST_TIERS[i].uptoKw) return COST_TIERS[i].ratePerKw;
    }
    return COST_TIERS[COST_TIERS.length - 1].ratePerKw;
  }

  /* Category: subsidy eligibility, bill-offset cap, cost multiplier vs base. */
  var CATEGORY = {
    residential: { subsidy: true,  offsetCap: CD.billOffsetRate || 0.90, mult: 1.00 },
    commercial:  { subsidy: false, offsetCap: 0.85, mult: 0.95 },
    industrial:  { subsidy: false, offsetCap: 0.82, mult: 0.92 }
  };
  if (CD.categories) {
    if (CD.categories.RESIDENTIAL) CATEGORY.residential.mult = CD.categories.RESIDENTIAL.costMultiplier;
    if (CD.categories.COMMERCIAL)  CATEGORY.commercial.mult  = CD.categories.COMMERCIAL.costMultiplier;
    if (CD.categories.INDUSTRIAL)  CATEGORY.industrial.mult  = CD.categories.INDUSTRIAL.costMultiplier;
  }

  /* PM Surya Ghar + state top-up subsidy (residential) — slabs/caps from CALC_DATA. */
  function slabAmount(kw, perKwFirst2, per3rd, cap) {
    var amt = Math.min(kw, 2) * perKwFirst2 + (kw > 2 ? Math.min(kw - 2, 1) * per3rd : 0);
    return Math.min(amt, cap);
  }
  function residentialSubsidy(kw) {
    var s = CD.subsidy;
    if (!s || !s.enabled) {
      return Math.round(slabAmount(kw, 30000, 18000, 78000));
    }
    // Central (PM Surya Ghar)
    var central = slabAmount(kw, s.perKwFirst2Kw, s.perKw3rdKw, s.cap);
    // State top-up: slab-based if provided, else legacy flat stateSubsidy.
    var state = 0;
    if (s.state) {
      state = slabAmount(kw, s.state.perKwFirst2Kw, s.state.perKw3rdKw, s.state.cap);
    } else if (s.stateSubsidy) {
      state = s.stateSubsidy;
    }
    return Math.round(central + state);
  }

  /* ---------- shared state fed from estimator into EMI ---------- */
  var assetCost = 300000;   // financeable system cost (net of subsidy)
  var monthlySaving = 0;    // monthly bill saving, for the cashflow insight
  var hasEstimate = false;

  var $ = function (id) { return document.getElementById(id); };
  function setText(id, val) { var e = $(id); if (e) e.textContent = val; }

  /* ============================================================
     STEP 1 - SAVINGS ESTIMATOR
     ============================================================ */
  var estForm = $('estForm');
  if (!estForm) return; // not on the calculator page

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

    var opt = $('estLocation').selectedOptions[0];
    var tariff = parseFloat(opt.getAttribute('data-tariff')) || TARIFF_DEF;  // Rs per unit

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
    var cat = CATEGORY[consumerType];

    // Consumption and sizing (generation = flat kWh/kW/day from CALC_DATA)
    var dailyUnits = monthlyUnits / DAYS;
    var sizeFromBill = dailyUnits / GEN_PER_KW;   // kW needed to cover usage
    var sizeFromRoof = roofArea / SQFT_PER_KW;    // ~100 sq ft per kW
    var systemSize = Math.max(1, Math.min(sizeFromRoof, sizeFromBill));
    systemSize = parseFloat(systemSize.toFixed(1));

    // Generation, panels, CO2 (yield per kW scales with system size)
    var monthlyGen = Math.round(systemSize * genPerKw(systemSize) * DAYS);
    var panels = Math.ceil(systemSize / PANEL_KW);    // 540 Wp panels
    var co2 = parseFloat((monthlyGen * 12 * CO2_FAC / 1000).toFixed(1)); // tonnes/yr

    // Savings (capped offset of consumption)
    var offsetUnits = Math.min(monthlyUnits * cat.offsetCap, monthlyGen);
    monthlySaving = Math.round(offsetUnits * tariff);
    var newBill = Math.max(bill - monthlySaving, Math.round(bill * 0.08));
    var reduction = Math.round((bill - newBill) / bill * 100);
    var annualSaving = monthlySaving * 12;

    // 25-year savings with annual tariff escalation
    var savings25 = 0, yearSave = annualSaving;
    for (var y = 0; y < LIFE_YRS; y++) { savings25 += yearSave; yearSave *= (1 + ESCAL); }
    savings25 = Math.round(savings25);

    // Cost and subsidy
    var grossCost = Math.round(systemSize * baseCostPerKw(systemSize) * cat.mult);
    var subsidy = cat.subsidy ? residentialSubsidy(systemSize) : 0;
    var netCost = Math.max(grossCost - subsidy, 0);
    var payback = annualSaving > 0 ? parseFloat((netCost / annualSaving).toFixed(1)) : 0;

    // Paint report
    setText('rSavings25', fmt(savings25));
    setText('rSavingsAnnual', fmt(annualSaving));
    setText('rSystem', systemSize + ' kW');
    setText('rGen', monthlyGen.toLocaleString('en-IN'));
    setText('rPanels', panels);
    setText('rPayback', payback + ' yrs');
    setText('rCo2', co2 + ' T');
    setText('rSubsidy', subsidy > 0 ? fmt(subsidy) : 'N/A');
    setText('rSubsidy2', '− ' + (subsidy > 0 ? fmt(subsidy) : rupee + '0'));
    setText('rGross', fmt(grossCost));
    setText('rNet', fmt(netCost));
    setText('rBillNow', fmt(bill));
    setText('rBillSolar', fmt(newBill));
    setText('rReduction', reduction + '%');
    if ($('barNow')) $('barNow').style.width = '100%';
    if ($('barSolar')) $('barSolar').style.width = Math.max(8, Math.round(newBill / bill * 100)) + '%';

    if ($('scPlaceholder')) $('scPlaceholder').hidden = true;
    var report = $('scReport');
    report.hidden = false;

    // Update left visual panel: show gauge + mini stats
    var scVisIdle = $('scVisIdle'), scVisResult = $('scVisResult');
    if (scVisIdle) scVisIdle.hidden = true;
    if (scVisResult) scVisResult.hidden = false;

    setText('vSystem', systemSize + ' kW');
    setText('vPanels', panels + ' panels');
    setText('vGen', monthlyGen.toLocaleString('en-IN') + ' kWh/mo');
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

    // Feed EMI calculator
    hasEstimate = true;
    assetCost = netCost;
    configureEmiFromAsset(netCost);

    report.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ============================================================
     STEP 2 - EMI CALCULATOR
     ============================================================ */
  var loanEl = $('emiLoan');
  var dpEl = $('emiDp');
  var tenureEl = $('emiTenure');
  var interestEl = $('emiInterest');
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
    var rate = parseFloat(interestEl.value) || 9.5;

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

    [loanEl, dpEl, tenureEl, interestEl].forEach(paintRange);

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
  interestEl.addEventListener('input', updateEmi);

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
