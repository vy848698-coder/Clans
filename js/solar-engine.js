/* ============================================================
   CLANS MACHINA — SHARED SOLAR ESTIMATE ENGINE
   ------------------------------------------------------------
   Single source of truth for the FRD estimate math. Used by BOTH
   the full calculator (js/calculator.js) and the homepage teaser
   widget (index.html), so the two can never silently diverge.

   Reads all tunable constants from window.CALC_DATA (the PRIMARY
   / FRD block in js/calculator-data.js). Pure, no DOM.
   ============================================================ */
(function () {
  'use strict';

  function CD() { return window.CALC_DATA || {}; }

  /* Subsidy eligibility by property type — Home & Housing Society only. */
  function subsidyEligible(type) {
    var cd = CD();
    if (cd.categories && cd.categories[type] && typeof cd.categories[type].subsidy === 'boolean') {
      return cd.categories[type].subsidy;
    }
    return type === 'residential' || type === 'industrial';
  }

  /* FRD Step 6 subsidy table, keyed by whole kW. Returns { central, state }.
     `state` amounts are the Odisha figures — callers decide whether the
     location is eligible for the state top-up (see includeStateSubsidy). */
  function subsidyFor(kw) {
    var t = CD().subsidyTable || {
      '1':     { central: 30000, state: 25000 },
      '2':     { central: 60000, state: 50000 },
      '3plus': { central: 78000, state: 60000 }
    };
    var row = kw <= 1 ? t['1'] : (kw === 2 ? t['2'] : t['3plus']);
    return { central: row.central, state: row.state };
  }

  /* ------------------------------------------------------------
     FRD ESTIMATE ENGINE — pure function, returns every FRD output.
       bill      ₹/month (already converted from units if needed)
       roofSqft  available shadow-free roof in sq ft (Infinity = uncapped)
       type      residential | commercial | industrial
       opts      { includeStateSubsidy: bool }  — default true.
                 Set false for locations outside the state-subsidy
                 zone (pan-India: only Odisha gets the state top-up).
     ------------------------------------------------------------ */
  function computeEstimate(bill, roofSqft, type, opts) {
    opts = opts || {};
    var cd = CD();

    var TARIFF       = cd.tariffPerUnit      || 5;      // ₹/unit (Step 1 & 10)
    var DAYS         = cd.daysPerMonth       || 30;     // Step 2 & 9
    var GEN_PER_KW   = cd.genPerKwDaily      || 4;      // units/kW/day (Step 3 & 9)
    var SQFT_PER_KW  = cd.sqftPerKw          || 100;    // Step 4
    var COST_PER_KW  = cd.costPerKw          || 70000;  // ₹/kW flat (Step 5)
    var LIFE_YRS     = cd.systemLifeYears    || 25;     // Step 12
    var CO2_PER_UNIT = cd.co2FactorKgPerUnit || 0.82;   // kg/unit (Step 13)
    var PANEL_KW     = cd.panelKw            || 0.54;   // "panels required" display
    var EXPANSION    = cd.futureExpansionPct || 0;      // optional 10–20% oversizing

    // Steps 1–2: consumption
    var monthlyUnits = bill / TARIFF;
    var dailyUnits   = monthlyUnits / DAYS;

    // Step 3: ideal size — round UP to whole kW, optional expansion allowance
    var idealKw = Math.max(1, Math.ceil(dailyUnits / GEN_PER_KW));
    if (EXPANSION > 0) idealKw = Math.max(1, Math.ceil(idealKw * (1 + EXPANSION)));

    // Step 4: roof cap — whole kW the roof can hold (100 sq ft/kW)
    var roofMaxKw = Math.floor(roofSqft / SQFT_PER_KW);
    var recommendedKw = Math.max(1, Math.min(idealKw, roofMaxKw));
    var roofShortfall = roofMaxKw < idealKw;
    var extraSqft = roofShortfall ? Math.max(0, idealKw * SQFT_PER_KW - roofSqft) : 0;

    var kw = recommendedKw;
    var roofRequired = kw * SQFT_PER_KW;

    // Step 9: generation (units/mo) + panels (display only)
    var monthlyGen = kw * GEN_PER_KW * DAYS;
    var panels = Math.ceil(kw / PANEL_KW);

    // Steps 5–7: cost, subsidy, customer investment
    var cost = kw * COST_PER_KW;
    var rawSub = subsidyEligible(type) ? subsidyFor(kw) : { central: 0, state: 0 };
    var includeState = opts.includeStateSubsidy !== false;   // default: include
    var stateSub = includeState ? rawSub.state : 0;
    var sub = { central: rawSub.central, state: stateSub, total: rawSub.central + stateSub };
    var investment = Math.max(cost - sub.total, 0);

    // Steps 10–12: savings — flat ×25, no escalation/degradation (per FRD)
    var monthlySaving = monthlyGen * TARIFF;
    var annualSaving  = monthlySaving * 12;
    var savings25     = annualSaving * LIFE_YRS;
    var payback       = annualSaving > 0 ? investment / annualSaving : 0;

    // Step 13: CO₂ avoided
    var co2MonthlyKg = monthlyGen * CO2_PER_UNIT;
    var co2AnnualKg  = co2MonthlyKg * 12;
    var co2LifeT     = co2AnnualKg * LIFE_YRS / 1000;

    return {
      monthlyUnits: monthlyUnits, dailyUnits: dailyUnits,
      idealKw: idealKw, recommendedKw: kw, roofMaxKw: roofMaxKw,
      roofShortfall: roofShortfall, extraSqft: extraSqft, roofRequired: roofRequired,
      monthlyGen: monthlyGen, panels: panels,
      cost: cost, subsidy: sub, investment: investment,
      monthlySaving: monthlySaving, annualSaving: annualSaving, savings25: savings25,
      payback: payback,
      co2MonthlyKg: co2MonthlyKg, co2AnnualKg: co2AnnualKg, co2LifeT: co2LifeT
    };
  }

  window.SolarEngine = {
    computeEstimate: computeEstimate,
    subsidyFor: subsidyFor,
    subsidyEligible: subsidyEligible
  };
})();
