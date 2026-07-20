/* ============================================================
   CLANS MACHINA — SOLAR CALCULATOR DATA / CONFIG
   ------------------------------------------------------------
   Single source of truth for the calculator constants.
   The PRIMARY (FRD) block below drives calculator.html per the
   client's Functional Requirement Document (FRD).
   Edit numbers HERE only — the calculator logic reads from this.
   ============================================================ */
window.CALC_DATA = {

  /* =========================================================
     PRIMARY — FRD ENGINE (used by js/calculator.js)
     Every value here maps to a numbered step in the client FRD.
     ========================================================= */

  tariffPerUnit: 5,            // ₹/unit — FRD Step 1 & Step 10
  daysPerMonth: 30,           // FRD Step 2 & Step 9
  genPerKwDaily: 4,           // units/kW/day — FRD Step 3 & Step 9
  sqftPerKw: 100,             // sq ft per kW — FRD Step 4
  costPerKw: 70000,           // ₹/kW, flat — FRD Step 5
  systemLifeYears: 25,        // FRD Step 12
  co2FactorKgPerUnit: 0.82,   // kg CO₂ avoided per unit — FRD Step 13
  panelKw: 0.54,              // 540 Wp panel — for "panels required" display only

  // Optional future-expansion allowance (FRD Step 3, "optional 10–20%").
  // 0 = size exactly to consumption. Set 0.10–0.20 to oversize.
  futureExpansionPct: 0,

  // FRD Step 8 — EMI: fixed interest, discrete tenures. Shown only for Bank Loan.
  emi: {
    interestRate: 6.5,        // % p.a., fixed — FRD Step 8
    tenures: [3, 5, 7, 10]    // years — FRD Input 6
  },

  // FRD Step 6 — Government subsidy by whole-kW size.
  // Applied to Home + Housing Society only; Commercial = none (see categories).
  subsidyTable: {
    '1':     { central: 30000, state: 25000 },   // total ₹55,000
    '2':     { central: 60000, state: 50000 },   // total ₹1,10,000
    '3plus': { central: 78000, state: 60000 }    // total ₹1,38,000 (3 kW & above)
  },

  // Property types and subsidy eligibility (client decision).
  categories: {
    residential: { label: 'Home',            subsidy: true  },
    commercial:  { label: 'Commercial',      subsidy: false },
    industrial:  { label: 'Housing Society', subsidy: true  }
  },

  // FRD worked example, used to validate the engine during development:
  //   ₹3,000 bill → 600 units → 5 kW → cost ₹3,50,000 − subsidy ₹1,38,000
  //   → investment ₹2,12,000 · savings ₹3,000/mo · ₹36,000/yr · ₹9,00,000/25yr
  //   → CO₂ 492 kg/mo · ~5.9 t/yr · ~148 t/25yr
  _frdExample: { bill: 3000, kw: 5, annualSaving: 36000, savings25: 900000, co2LifeTonnes: 148 }

  /* The former LEGACY block (perKwDailyGen, genTiers, costPerKwTiers,
     billOffsetRate, tariffEscalation, subsidy slabs) was removed once the
     homepage teaser was migrated onto the shared FRD engine
     (js/solar-engine.js). Both calculators now read the PRIMARY block above. */
};
