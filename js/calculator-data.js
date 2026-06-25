/* ============================================================
   CLANS MACHINA — SOLAR CALCULATOR DATA / CONFIG
   ------------------------------------------------------------
   Single source of truth for all constants the savings + EMI
   calculator uses. Values are the Indian-market defaults
   corroborated in AEREM_CALCULATOR_SPEC.md (§9, 2026-06-23).
   Edit numbers HERE only — the calculator logic reads from this.
   ============================================================ */
window.CALC_DATA = {

  /* ---- Solar generation ---- */
  // Real-world yield (Clans Machina product sheet, 2026):
  //   2kW → 7–9 u/day, 3kW → 12–13, 4kW → 16–18, 5kW → 22–24 (max ~5 u/kW/day).
  // Average works out to ~4.2 units (kWh) per kW per day.
  perKwDailyGen: 4.2,          // kWh per kW per day (nominal — used for sizing)
  daysPerMonth: 30,           // → ~126 units / kW / month

  // Per-size daily generation (kWh/kW/day), matching the product sheet midpoints:
  //   2kW→8/day (4.0/kW), 3kW→12.5 (4.17), 4kW→17 (4.25), 5kW→23 (4.6).
  // Larger yield per kW for bigger systems; interpolated for in-between sizes.
  genTiers: [
    { kw: 2, perKwDaily: 4.0  },
    { kw: 3, perKwDaily: 4.17 },
    { kw: 4, perKwDaily: 4.25 },
    { kw: 5, perKwDaily: 4.6  }
  ],

  /* ---- Panel sizing ---- */
  panelKw: 0.54,              // 540 Wp per panel (mono-PERC / TOPCon standard)

  /* ---- System cost (₹ per kW, before subsidy) — Aerem's actual tiers ---- */
  // Aerem uses ₹67,000/kW up to 5 kW, then ₹55,000/kW in the 5–10 kW band.
  costPerKwTiers: [
    { uptoKw: 5,        ratePerKw: 67000 },  // up to 5 kW
    { uptoKw: 10,       ratePerKw: 55000 },  // 5–10 kW
    { uptoKw: Infinity, ratePerKw: 55000 }   // 10 kW+ (Aerem only bands to 10 kW)
  ],

  /* ---- Electricity tariff ---- */
  tariffPerUnit: 8,           // ₹ per unit (kWh) — used to convert bill <-> units
  tariffEscalation: 0.03,     // 3% annual rise, used for 25-yr savings

  /* ---- Environmental ---- */
  co2FactorKgPerKwh: 0.82,    // Indian grid emission factor (kg CO₂ / kWh)
  treesPerTonneCo2: 45,       // optional "equivalent trees" display

  /* ---- Performance / lifetime ---- */
  systemLifeYears: 25,        // warranty / savings horizon
  billOffsetRate: 0.90,       // solar offsets ~90% of the bill (rest = fixed/night)
  annualDegradation: 0.005,   // 0.5% panel output loss per year (optional)

  /* ---- Subsidy: PM Surya Ghar + state top-up (residential only) ----
     Calibrated to the Clans Machina product sheet (2026):
       2 kW → ₹1,10,000   3 kW → ₹1,38,000   4 kW → ₹1,38,000   5 kW → ₹1,38,000
     = central (PM Surya Ghar) ₹60k/₹78k  +  state top-up ₹50k/₹60k. */
  subsidy: {
    enabled: true,
    appliesTo: 'RESIDENTIAL',
    perKwFirst2Kw: 30000,     // central: ₹30,000 / kW for first 2 kW
    perKw3rdKw: 18000,        // central: ₹18,000 for the 3rd kW
    cap: 78000,               // central subsidy capped at ₹78,000 (systems ≥ 3 kW)
    // State top-up (slab-based) so totals match the product sheet exactly.
    //   2 kW → ₹50,000 (25k×2),  ≥3 kW → ₹60,000 (capped)
    state: {
      perKwFirst2Kw: 25000,   // ₹25,000 / kW for first 2 kW
      perKw3rdKw: 10000,      // ₹10,000 for the 3rd kW
      cap: 60000              // state top-up capped at ₹60,000
    }
  },

  /* ---- Consumer categories ---- */
  categories: {
    RESIDENTIAL: { label: 'Residential', subsidy: true,  costMultiplier: 1.00 },
    COMMERCIAL:  { label: 'Commercial',  subsidy: false, costMultiplier: 0.95 },
    INDUSTRIAL:  { label: 'Industrial',  subsidy: false, costMultiplier: 0.92 }
  },

  /* ---- Roof area requirement ---- */
  // ~100 sq ft of shadow-free roof needed per 1 kW.
  sqftPerKw: 100,
  areaUnits: [
    { key: 'sqft',   label: 'sq ft', toSqft: 1 },
    { key: 'sqm',    label: 'sq m',  toSqft: 10.7639 },
    { key: 'sqyd',   label: 'sq yd', toSqft: 9 }
  ],

  /* ---- EMI calculator defaults + slider ranges ---- */
  // EMI formula itself is exact in AEREM_CALCULATOR_SPEC.md §6.
  emi: {
    defaultDownPaymentPct: 20,   // % of system cost paid upfront
    interestRate: 9,             // default annual % (advertised 5.5%–9%)
    tenureYears: 5,              // default loan tenure
    sliders: {
      downPayment: { min: 0,   max: 100, step: 5,   unit: '%'     },
      interest:    { min: 5.5, max: 14,  step: 0.1, unit: '%'     },
      tenure:      { min: 1,   max: 6,   step: 0.5, unit: 'Years' }
    }
  },

  /* ---- Sanity-check targets (from Aerem's own 2026 examples) ---- */
  // Used only to validate our outputs during development.
  _validation: {
    '1kW':  { subsidyApprox: 30000, netCostApprox: [20000, 35000] },
    '5kW':  { netCostApprox: 257000, emiApprox: [5000, 5500], note: 'EMI ≈ monthly savings' }
  }
};
