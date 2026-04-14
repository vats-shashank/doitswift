/**
 * Sanity tests for calculator math (mirrors inline scripts in src/pages/calculator/*.astro).
 * Run: node scripts/test-calculators.mjs
 */

const CM_PER_IN = 2.54;

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    passed++;
  }
}

function assertApprox(a, b, eps, msg) {
  const ok = Math.abs(a - b) <= eps;
  assert(ok, `${msg}: expected ~${b}, got ${a} (eps ${eps})`);
}

// --- SIP (annuity due) ---
function sipFV(P, annualPct, years) {
  const r = annualPct / 100 / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  if (r === 0) return P * n;
  return P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}
{
  const v = sipFV(5000, 12, 10);
  assertApprox(v, 1161695, 1, 'SIP 5k/mo 12% 10y maturity');
  const v0 = sipFV(1000, 0, 5);
  assert(v0 === 60000, 'SIP zero rate = principal only');
}

// --- EMI ---
function emiAmount(P, annual, months) {
  const r = annual / 100 / 12;
  if (months <= 0) return 0;
  if (r === 0) return P / months;
  return (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}
{
  const e = emiAmount(1000000, 12, 12);
  assertApprox(e, 88849, 1, 'EMI 10L 12% 12mo');
  const e0 = emiAmount(120000, 0, 12);
  assert(e0 === 10000, 'EMI zero interest');
}

// --- FD ---
function fdMaturity(P, annualPct, years, periodsPerYear) {
  const r = annualPct / 100;
  const n = periodsPerYear;
  return P * Math.pow(1 + r / n, n * years);
}
{
  const a = fdMaturity(100000, 7, 3, 4);
  assertApprox(a, 123144, 1, 'FD 1L 7% 3y quarterly');
}

// --- GST ---
function gstCalc(mode, amt, ratePct, inter) {
  const r = ratePct / 100;
  let base, tax, total;
  if (mode === 'add') {
    base = amt;
    tax = base * r;
    total = base + tax;
  } else {
    total = amt;
    base = total / (1 + r);
    tax = total - base;
  }
  return { base, tax, total: mode === 'add' ? total : amt, half: tax / 2 };
}
{
  const a = gstCalc('add', 10000, 18, false);
  assertApprox(a.tax, 1800, 0.01, 'GST add 18%');
  assertApprox(a.base, 10000, 0.01, 'GST add base');
  const r = gstCalc('remove', 11800, 18, false);
  assertApprox(r.base, 10000, 0.02, 'GST remove ex');
  assertApprox(r.tax, 1800, 0.02, 'GST remove tax');
}

// --- Lumpsum ---
{
  const A = 100000 * Math.pow(1.12, 10);
  assertApprox(A, 310584.8, 1, 'Lumpsum 1L 12% 10y');
}

// --- PPF (yearly loop as in page) ---
function ppfSim(P, years, ar) {
  const r = ar / 100;
  let bal = 0;
  for (let y = 1; y <= years; y++) {
    bal += P;
    const intY = bal * r;
    bal += intY;
  }
  return bal;
}
{
  const m = ppfSim(150000, 1, 7.1);
  assertApprox(m, 160650, 1, 'PPF 1y 1.5L 7.1%');
}

// --- HRA ---
function hraExempt(basic, hra, rent, metro) {
  const pct = metro ? 0.5 : 0.4;
  const c1 = hra;
  const c2 = basic * pct;
  const c3 = Math.max(0, rent - 0.1 * basic);
  return Math.min(c1, c2, c3);
}
{
  const ex = hraExempt(60000, 30000, 25000, true);
  assert(ex === 19000, 'HRA metro example');
}

// --- Income tax (new / old) ---
function taxNewRaw(TI) {
  if (TI <= 0) return 0;
  let t = 0;
  if (TI > 300000) t += (Math.min(TI, 700000) - 300000) * 0.05;
  if (TI > 700000) t += (Math.min(TI, 1000000) - 700000) * 0.1;
  if (TI > 1000000) t += (Math.min(TI, 1200000) - 1000000) * 0.15;
  if (TI > 1200000) t += (Math.min(TI, 1500000) - 1200000) * 0.2;
  if (TI > 1500000) t += (TI - 1500000) * 0.3;
  return Math.round(t);
}
function taxNewFinal(TI) {
  if (TI <= 700000) return 0;
  return taxNewRaw(TI);
}
function cessOn(tax) {
  return Math.round(tax * 1.04);
}
{
  assert(taxNewFinal(500000) === 0, 'New regime TI<=7L rebate');
  const t = taxNewFinal(800000);
  assert(t === taxNewRaw(800000), 'New regime TI>7L');
  assertApprox(cessOn(t), Math.round(t * 1.04), 0, 'Cess 4%');
}

// --- BMI ---
{
  const bmi = 70 / (1.75 * 1.75);
  assertApprox(bmi, 22.857, 0.01, 'BMI 70kg 175cm');
}

// --- Age parts ---
function ageParts(dob, end) {
  let y = end.y - dob.y;
  let m = end.m - dob.m;
  let d = end.d - dob.d;
  if (d < 0) {
    m -= 1;
    const prevMonth = new Date(end.y, end.m - 1, 0);
    d += prevMonth.getDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}
function dayDiff(dob, end) {
  const a = new Date(dob.y, dob.m - 1, dob.d);
  const b = new Date(end.y, end.m - 1, end.d);
  return Math.round((b - a) / 86400000);
}
{
  const p = ageParts({ y: 2000, m: 1, d: 15 }, { y: 2010, m: 6, d: 20 });
  assert(p.y === 10 && p.m === 5 && p.d === 5, 'Age YMD');
  const days = dayDiff({ y: 2000, m: 1, d: 15 }, { y: 2000, m: 1, d: 16 });
  assert(days === 1, 'Day diff adjacent');
}

// --- Percentage modes ---
{
  const pctOf = (x, y) => y * (x / 100);
  assert(pctOf(20, 500) === 100, '% of');
  const ratio = (x, y) => (x / y) * 100;
  assertApprox(ratio(25, 200), 12.5, 0.001, 'is what %');
  const chg = ((120 - 100) / 100) * 100;
  assert(chg === 20, '% change');
}

// --- Discount stack ---
{
  const orig = 100;
  const final = orig * (1 - 20 / 100) * (1 - 10 / 100);
  assertApprox(final, 72, 0.001, 'Stack 20%+10%');
  const pct = ((orig - final) / orig) * 100;
  assertApprox(pct, 28, 0.001, 'Stack effective %');
}

// --- Tip ---
{
  const bill = 1000;
  const tip = bill * 0.15;
  const tot = bill + tip;
  assert(tip === 150 && tot === 1150, 'Tip 15%');
  assertApprox(tot / 2, 575, 0.001, 'Split 2');
}

// --- Calorie Mifflin ---
{
  const wkg = 70;
  const h = 175;
  const age = 32;
  const bmr = 10 * wkg + 6.25 * h - 5 * age + 5;
  assertApprox(bmr, 1638.75, 0.01, 'BMR male (Mifflin–St Jeor)');
  const adj = (-0.5 * 7700) / 7;
  assertApprox(adj, -550, 0.01, 'Goal -0.5 kg/wk delta');
}

// --- Ideal weight Devine (same as page: result is kg, not lb) ---
{
  const inh = 175 / CM_PER_IN;
  const over = Math.max(0, inh - 60);
  const devKg = 50 + 2.3 * over;
  assertApprox(devKg, 70.464567, 0.02, 'Devine male 175cm (kg)');
}

// --- Height / weight unit sync (2.54 cm per inch) ---
{
  const cm = 173.73;
  const totalIn = cm / CM_PER_IN;
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  const back = (ft * 12 + inch) * CM_PER_IN;
  assertApprox(back, cm, 0.001, 'cm ↔ ft/in round-trip');
  assertApprox(70 * 2.2046226218, 154.323583526, 0.001, 'kg → lb');
  assertApprox(154.323583526 * 0.45359237, 70, 0.001, 'lb → kg');
}

// --- Home loan simulate (no prep) ---
function simulate(P, annual, months, prep, freq, startAfter) {
  const r = annual / 100 / 12;
  const emi = emiAmount(P, annual, months);
  let bal = P;
  let m = 0;
  let totalInt = 0;
  let onceDone = false;
  while (bal > 0.02 && m < 600) {
    m++;
    const intP = bal * r;
    let prin = emi - intP;
    if (prin > bal) prin = bal;
    bal -= prin;
    totalInt += intP;
    let doPre = false;
    if (prep > 0 && m > startAfter) {
      if (freq === 'monthly') doPre = true;
      else if (freq === 'yearly' && (m - startAfter - 1) % 12 === 0) doPre = true;
      else if (freq === 'once' && !onceDone) {
        doPre = true;
        onceDone = true;
      }
    }
    if (doPre) {
      const pay = Math.min(prep, bal);
      bal -= pay;
    }
  }
  return { emi, months: m, totalInt };
}
{
  const P = 5_000_000;
  const n = 20 * 12;
  const baseInt = emiAmount(P, 8.5, n) * n - P;
  const sim = simulate(P, 8.5, n, 0, 'none', 12);
  assert(sim.months === n, 'No prep: full tenure');
  assertApprox(sim.totalInt, baseInt, 2, 'No prep: interest matches EMI formula');
}

// --- Discount reverse: sale = orig * (1 - d/100) ---
{
  const sale = 800;
  const d = 20;
  const orig = sale / (1 - d / 100);
  assertApprox(orig, 1000, 0.01, 'Discount reverse original');
}

// --- Old regime tax (below 60, sample) ---
function taxOldRaw(TI, ageKey) {
  if (ageKey === 'below60') {
    if (TI <= 250000) return 0;
    if (TI <= 500000) return Math.round((TI - 250000) * 0.05);
    if (TI <= 1000000) return Math.round(12500 + (TI - 500000) * 0.2);
    return Math.round(12500 + 100000 + (TI - 1000000) * 0.3);
  }
  return 0;
}
{
  assert(taxOldRaw(400000, 'below60') === 7500, 'Old regime 2.5L-5L slab');
}

console.log(`\nCalculator sanity tests: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
