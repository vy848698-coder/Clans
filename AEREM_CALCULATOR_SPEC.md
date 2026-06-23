# Aerem Solar Loan / Savings Calculator — Reverse-Engineered Spec

Source: https://www.aerem.co/calculator
The visible page embeds an iframe: `https://webform.aerem.co/calculator`
(a Next.js app). Heavy calculations are done by a backend API:
`https://installer-api.aerem.co/api/solar-calculator`.

This document captures everything needed to rebuild a similar calculator.

---

## 1. Purpose

A two-part tool:
1. **Solar Savings Estimator** — given a location, roof area and electricity
   bill, it estimates system size, generation, cost, savings and CO₂ reduced.
2. **Solar Loan EMI Calculator** — interactive sliders to tune loan amount /
   down payment / tenure / interest and see the monthly EMI.

It also generates a downloadable PDF "solar savings document" (gated behind a
lead-capture form).

---

## 2. Input fields (estimator form)

| Label (verbatim)                  | name                | type            | notes |
|-----------------------------------|---------------------|-----------------|-------|
| Search your location              | `locationName`      | text + autocomplete | maxLength 50, uses geolocation → lat/lng |
| Enter available roof area         | `areaRequired`      | number          | paired with a **unit dropdown** (`areaUnits`) |
| Enter monthly electricity details | `averageMonthlyBill`| number          | paired with a **unit dropdown** (`billCalculation`) — bill ₹ vs units kWh |
| Consumer category                 | (tabs)              | enum            | `RESIDENTIAL` / `COMMERCIAL` / `INDUSTRIAL` |

Validation: *"All the above fields are mandatory to estimate your solar savings."*

### Lead-capture form (for PDF download)
| Label                  | name        |
|------------------------|-------------|
| Name                   | `leadName`  |
| Contact Number         | `leadPhone` |
| Email ID (Optional)    | `email`     |

Plus a "How did you hear about us" enum: Google / Instagram / Facebook / Email /
Referred by Installer / Referred by Business / Other.

---

## 3. API call

`POST https://installer-api.aerem.co/api/solar-calculator`
with location/area/bill/category. **Two requests are fired and the response
with the higher `systemCapacity` is kept** (picks the better-fitting plan).

### Response fields (per plan)
- `tenure` (years)
- `interest` (annual %)
- `loanAmount`
- `downPayment`
- `currentElectricityBill`
- `potentialElectricityBill`
- `totalNoOfSolarPanelsRequired`
- `sideBenefits` → `{ co2: ... }`
- `totalYearlySavings`
- `dailyGeneration`
- `systemCapacity` (kW)
- `systemCost`
- `emi`

`POST .../solar-calculator/generate-pdf` → returns a PDF blob (responseType blob).

---

## 4. Result / output fields (displayed)

The UI state object (`savingsValue`):

| Field                       | Meaning / label                  |
|-----------------------------|----------------------------------|
| `savings25years`            | "Estimated 25 years Savings" (₹) |
| `systemCapacity`            | "System Capacity" (kW, 2 dp)     |
| `monthlyGeneration`         | Monthly solar generation (units) |
| `electricityBillReductionRate` | % reduction in bill           |
| `currentElectricityBill`    | Current monthly bill (₹)         |
| `potentialElectricityBill`  | Bill after solar (₹)             |
| `solarPanelsRequired`       | No. of panels                    |
| `co2EmissionReduced`        | CO₂ reduced                      |
| `loanAmount` / `tenure` / `interest` | Loan summary            |
| `systemCost`                | Project cost (₹)                 |
| `emiValue`                  | Monthly EMI (₹)                  |
| `interestAmount`            | Total interest (₹)               |
| `principleAmount`           | Principal (₹)                    |

### Derived client-side
```
months          = 12 * tenure
totalAmount ($) = emi * months
monthlyGeneration (aa) = dailyGeneration * <factor al>   // ~ daily * 30
billReductionRate (ac) = (currentBill - potentialBill) / currentBill * 100
interestAmount (ab)    = totalAmount - loanAmount
```
A bar-graph visualises current vs potential bill using
`100 - electricityBillReductionRate` bucketed into 10ths.

---

## 5. EMI Calculator sliders

| Slider        | unitType     | min | max | step | notes |
|---------------|--------------|-----|-----|------|-------|
| Loan Amount   | currency     | —   | systemCost | — | inverse-linked to Down Payment |
| Down Payment  | percentage   | 0   | 100 | —    | inverse-linked to Loan Amount |
| Tenure        | years        | 1*  | 6   | 0.5  | label "Years"; min 0 when disabled |
| Interest Rate | percentage   | —   | —   | —    | annual % |

Linking logic:
```js
// move loan amount  -> downPayment% = 100 - loanAmount/systemCost*100
// move downPayment% -> loanAmount   = floor((100 - dp) * systemCost / 100)
```

---

## 6. The EMI formula (exact, from the bundle)

```js
function emi(P, years, annualRatePct) {
  const months = 12 * years;
  const r = months >= 12 ? annualRatePct / 100 / 12 : 0;   // monthly rate
  const emi = r > 0
    ? Math.floor( P * r * Math.pow(1 + r, months)
                  / (Math.pow(1 + r, months) - 1) )
    : 0;
  const totalAmount   = emi * months;
  const totalInterest = totalAmount - P;
  return { emi, totalAmount, totalInterest };
}
```
- `P` = loan amount (principal)
- standard reducing-balance EMI; result floored to whole rupees
- if tenure < 1 year (months < 12), rate forced to 0 → EMI = P split flat

---

## 7. Subsidy (PM Surya Ghar: Muft Bijli Yojana — residential)

Applied server-side; for reference when rebuilding:
- ₹30,000 per kW for first 2 kW
- ₹18,000 for the next 1 kW
- **capped at ₹78,000** (i.e. systems ≥ 3 kW)

Subsidy reduces system cost → reduces loan amount → lowers EMI.

---

## 8. Suggested rebuild approach (for our own calculator)

Since we likely won't have Aerem's backend, the solar-sizing part needs local
assumptions. Reasonable Indian-market defaults to derive results locally:

```
systemCapacity (kW)  = monthlyUnits / (perKwDailyGen * 30)   // perKwDailyGen ≈ 4
   or from bill:  monthlyUnits = monthlyBill / tariffPerUnit  (tariff ≈ ₹8)
systemCost           = systemCapacity * costPerKw             // ≈ ₹55,000–65,000/kW
panelsRequired       = ceil(systemCapacity / panelKw)         // panelKw ≈ 0.54
monthlyGeneration    = systemCapacity * perKwDailyGen * 30
co2Reduced (kg/yr)   = monthlyGeneration * 12 * 0.82
savings25years       = monthlyBillSavings * 12 * 25 (with ~3% tariff escalation)
```
The **EMI block (§6) is exact and can be reused verbatim.**

All ₹ assumptions above are placeholders — confirm desired values with the user
before building.

---

## 9. Investigation log — 2026-06-23

### Method & limitations (important)
The live calculator could **not** be driven interactively from this environment:
- `www.aerem.co/calculator` and `webform.aerem.co/calculator` are client-side
  rendered (Next.js). A plain HTML fetch returns only the shell — the form
  fields, sliders and results are injected by JS at runtime, so fetching the
  page does not reveal computed numbers.
- The real math runs server-side at `POST installer-api.aerem.co/api/solar-calculator`.
  A bare `GET` on that path returns **HTTP 404** (it only answers authed POSTs
  with a JSON body), so we cannot replay inputs and read outputs through it.
- Therefore §§1–7 (reverse-engineered from the JS bundle) remain our source of
  truth for *structure & formulas*; the numeric constants below are corroborated
  from Aerem's own 2026 blog posts + general Indian-market sources, not from a
  live run.

### Confirmed Indian-market constants (use these as our defaults)
| Constant            | Value to use            | Source / range observed |
|---------------------|-------------------------|-------------------------|
| Generation per kW   | **4 kWh/day** (~120 units/kW/month) | 100–140 units/kW/mo depending on location |
| Cost per kW         | **₹67,000/kW ≤ 5 kW**, **₹55,000/kW for 5–10 kW** | market ₹45k–80k/kW before subsidy |
| Panel wattage       | **0.54 kW/panel** (540 Wp) | current mono-PERC/TOPCon standard |
| Tariff (₹/unit)     | **₹8** default (editable) | residential slab avg |
| Tariff escalation   | **~3%/yr** over 25 yr | bill-rise assumption |
| CO₂ factor          | **0.82 kg/kWh** | Indian grid emission factor |
| Subsidy (residential)| ₹30k/kW first 2 kW + ₹18k for 3rd kW, **cap ₹78,000** | PM Surya Ghar (§7) |

### Cross-checks from Aerem's published examples
- "**1 kW → ~₹30,000 subsidy**, effective price ≈ ₹20k–35k after subsidy."
- "**5 kW system: post-subsidy project cost ≈ ₹2.57 lakh, EMI ≈ ₹5,000–5,500/mo**,
  with monthly electricity savings ≈ the EMI amount." → good sanity-check target:
  our 5 kW output should land near these numbers.
- Design principle they advertise: **monthly EMI ≈ monthly bill savings** (so the
  system pays for itself out of saved electricity), with payback ~3–4 yr.

### Open questions to confirm with the user before coding
1. Cost-per-kW tiers — use the table above, or our own pricing?
2. Default tariff ₹8/unit and 3% escalation — OK?
3. Subsidy: residential only (cap ₹78k) or also surface the Odisha ₹60k state
   subsidy already shown on the homepage (would change net cost)?
4. Commercial/Industrial: no subsidy + different cost/kW + accelerated-depreciation
   benefit — do we model that, or keep v1 residential-only?

### Build plan (v1, fully client-side — no backend needed)
1. Inputs: location (optional text), monthly bill **or** units, roof area (optional),
   consumer category tabs.
2. Derive `monthlyUnits` → `systemCapacity` → clamp by roof area if given.
3. `systemCost` from tiered cost/kW; subtract subsidy → `netCost`.
4. Generation, new bill, monthly + 25-yr savings, CO₂, panels.
5. EMI sliders (loan/down-payment/tenure/interest) using the **exact §6 formula**.
6. Show savings-vs-bill bar like §4; optional lead form (skip PDF for v1).
