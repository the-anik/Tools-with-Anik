/**
 * Pure domain math, finance, scientific calculus, travel, gold/zakat,
 * education, and statistical calculator engines.
 */

// Safe recursive-descent mathematical expression evaluator (no eval/Function)
export function evaluateMath(expr: string, xVal = 0, ansVal = 0): number {
  const src = expr.replace(/\s+/g, '');
  let pos = 0;

  const peek = () => src[pos] ?? '';
  const consume = () => src[pos++] ?? '';

  function parseExpression(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseTerm();
      val = op === '+' ? val + rhs : val - rhs;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const rhs = parsePower();
      if (op === '*') val *= rhs;
      else if (op === '/') val /= rhs;
      else val %= rhs;
    }
    return val;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    return parsePostfix();
  }

  function parsePostfix(): number {
    let val = parsePrimary();
    while (peek() === '!') {
      consume();
      const n = Math.floor(val);
      if (n < 0 || n > 170) return NaN;
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      val = f;
    }
    return val;
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      consume();
      const val = parseExpression();
      if (peek() === ')') consume();
      return val;
    }
    if (/[0-9.]/.test(peek())) {
      let numStr = '';
      while (/[0-9.]/.test(peek())) numStr += consume();
      if (peek() === 'e' || peek() === 'E') {
        numStr += consume();
        if (peek() === '+' || peek() === '-') numStr += consume();
        while (/[0-9]/.test(peek())) numStr += consume();
      }
      return parseFloat(numStr);
    }
    if (/[a-zA-Z]/.test(peek())) {
      let ident = '';
      while (/[a-zA-Z0-9_]/.test(peek())) ident += consume();
      const low = ident.toLowerCase();
      if (peek() === '(') {
        consume();
        const arg = parseExpression();
        if (peek() === ')') consume();
        switch (low) {
          case 'sin': return Math.sin(arg);
          case 'cos': return Math.cos(arg);
          case 'tan': return Math.tan(arg);
          case 'asin': return Math.asin(arg);
          case 'acos': return Math.acos(arg);
          case 'atan': return Math.atan(arg);
          case 'sinh': return Math.sinh(arg);
          case 'cosh': return Math.cosh(arg);
          case 'tanh': return Math.tanh(arg);
          case 'ln': return Math.log(arg);
          case 'log': return Math.log10(arg);
          case 'log2': return Math.log2(arg);
          case 'sqrt': return Math.sqrt(arg);
          case 'cbrt': return Math.cbrt(arg);
          case 'abs': return Math.abs(arg);
          case 'floor': return Math.floor(arg);
          case 'ceil': return Math.ceil(arg);
          case 'round': return Math.round(arg);
          case 'exp': return Math.exp(arg);
          default: return NaN;
        }
      }
      if (low === 'pi') return Math.PI;
      if (low === 'e') return Math.E;
      if (low === 'x') return xVal;
      if (low === 'ans') return ansVal;
      return NaN;
    }
    return NaN;
  }

  if (!src) return 0;
  const result = parseExpression();
  return pos < src.length ? NaN : result;
}

export function numericalDerivative(expr: string, x: number): number {
  const h = 1e-5;
  return (evaluateMath(expr, x + h) - evaluateMath(expr, x - h)) / (2 * h);
}

export function simpsonIntegral(expr: string, a: number, b: number, n = 200): number {
  const steps = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / steps;
  let sum = evaluateMath(expr, a) + evaluateMath(expr, b);
  for (let i = 1; i < steps; i++) {
    const coef = i % 2 === 0 ? 2 : 4;
    sum += coef * evaluateMath(expr, a + i * h);
  }
  return (h / 3) * sum;
}

export interface EmiResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  schedule: { month: number; principal: number; interest: number; balance: number }[];
}

export function calcLoanEmi(principal: number, annualRatePct: number, months: number): EmiResult {
  if (principal <= 0 || months <= 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0, schedule: [] };
  }
  const r = annualRatePct / 12 / 100;
  const emi =
    r === 0
      ? principal / months
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);

  const schedule: EmiResult['schedule'] = [];
  let balance = principal;
  let totalInterest = 0;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const princ = Math.min(balance, emi - interest);
    balance = Math.max(0, balance - princ);
    totalInterest += interest;
    schedule.push({ month: m, principal: princ, interest, balance });
  }
  return {
    emi,
    totalPayment: principal + totalInterest,
    totalInterest,
    schedule,
  };
}

export function calcCompoundInterest(
  principal: number,
  annualRatePct: number,
  years: number,
  compoundsPerYear = 12
): { finalAmount: number; interestEarned: number } {
  const r = annualRatePct / 100;
  const n = Math.max(1, compoundsPerYear);
  const finalAmount = principal * Math.pow(1 + r / n, n * years);
  return { finalAmount, interestEarned: finalAmount - principal };
}

export function calcDpsMaturity(
  monthlyDeposit: number,
  annualRatePct: number,
  months: number
): { totalDeposited: number; maturityValue: number; profit: number } {
  const i = annualRatePct / 12 / 100;
  const totalDeposited = monthlyDeposit * months;
  if (i === 0) return { totalDeposited, maturityValue: totalDeposited, profit: 0 };
  const maturityValue = monthlyDeposit * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
  return { totalDeposited, maturityValue, profit: maturityValue - totalDeposited };
}

export function calcExactAge(dobIso: string, refDate = new Date()): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  daysUntilNextBirthday: number;
} {
  const dob = new Date(dobIso + 'T00:00:00');
  if (Number.isNaN(dob.getTime())) {
    return { years: 0, months: 0, days: 0, totalDays: 0, daysUntilNextBirthday: 0 };
  }
  const ref = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  let years = ref.getFullYear() - dob.getFullYear();
  let months = ref.getMonth() - dob.getMonth();
  let days = ref.getDate() - dob.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalDays = Math.max(0, Math.floor((ref.getTime() - dob.getTime()) / 86_400_000));
  let nextBday = new Date(ref.getFullYear(), dob.getMonth(), dob.getDate());
  if (nextBday < ref) nextBday = new Date(ref.getFullYear() + 1, dob.getMonth(), dob.getDate());
  const daysUntilNextBirthday = Math.round((nextBday.getTime() - ref.getTime()) / 86_400_000);
  return { years, months, days, totalDays, daysUntilNextBirthday };
}

export function countBusinessDays(startIso: string, endIso: string, weekendDays: number[] = [5, 6]): {
  totalDays: number;
  businessDays: number;
  weekendCount: number;
} {
  const s = new Date(startIso + 'T00:00:00');
  const e = new Date(endIso + 'T00:00:00');
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return { totalDays: 0, businessDays: 0, weekendCount: 0 };
  }
  const lo = s <= e ? s : e;
  const hi = s <= e ? e : s;
  let totalDays = 0;
  let businessDays = 0;
  let weekendCount = 0;
  const cur = new Date(lo);
  while (cur <= hi) {
    totalDays++;
    if (weekendDays.includes(cur.getDay())) weekendCount++;
    else businessDays++;
    cur.setDate(cur.getDate() + 1);
  }
  return { totalDays, businessDays, weekendCount };
}

export function calcStats(nums: number[]): {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  stdDev: number;
} {
  if (!nums.length) {
    return { count: 0, sum: 0, mean: 0, median: 0, mode: [], min: 0, max: 0, stdDev: 0 };
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const freq = new Map<number, number>();
  let maxF = 0;
  for (const n of sorted) {
    const f = (freq.get(n) ?? 0) + 1;
    freq.set(n, f);
    if (f > maxF) maxF = f;
  }
  const mode = maxF > 1 ? Array.from(freq.entries()).filter(([, f]) => f === maxF).map(([k]) => k) : [];
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  return {
    count,
    sum,
    mean,
    median,
    mode,
    min: sorted[0],
    max: sorted[count - 1],
    stdDev: Math.sqrt(variance),
  };
}

export function calcHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function simplifyGroupDebts(
  expenses: { paidBy: string; amount: number; splitBetween?: string[] }[],
  participants: string[]
): { balances: Record<string, number>; settlements: Settlement[] } {
  const balances: Record<string, number> = {};
  participants.forEach((p) => (balances[p] = 0));

  for (const exp of expenses) {
    const members = exp.splitBetween && exp.splitBetween.length ? exp.splitBetween : participants;
    if (!members.length || exp.amount <= 0) continue;
    balances[exp.paidBy] = (balances[exp.paidBy] ?? 0) + exp.amount;
    const share = exp.amount / members.length;
    for (const m of members) {
      balances[m] = (balances[m] ?? 0) - share;
    }
  }

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.01)
    .map(([name, b]) => ({ name, amt: -b }))
    .sort((a, b) => b.amt - a.amt);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.01)
    .map(([name, b]) => ({ name, amt: b }))
    .sort((a, b) => b.amt - a.amt);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0.01) {
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Math.round(pay * 100) / 100,
      });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return { balances, settlements };
}

export function calcBajusGoldPrice(params: {
  vori: number;
  ana: number;
  roti: number;
  point: number;
  pricePerVori: number;
  makingPerGram?: number;
  includeVat5Pct?: boolean;
}): {
  totalGrams: number;
  totalVori: number;
  goldCost: number;
  makingCost: number;
  vat: number;
  grandTotal: number;
} {
  // 1 Vori = 16 Ana = 96 Roti = 960 Point = 11.664 grams
  const totalVori =
    params.vori + params.ana / 16 + params.roti / 96 + params.point / 960;
  const totalGrams = totalVori * 11.664;
  const goldCost = totalVori * params.pricePerVori;
  const makingCost = totalGrams * (params.makingPerGram ?? 0);
  const sub = goldCost + makingCost;
  const vat = params.includeVat5Pct ? sub * 0.05 : 0;
  return {
    totalGrams,
    totalVori,
    goldCost,
    makingCost,
    vat,
    grandTotal: sub + vat,
  };
}

export function calcZakat(params: {
  cashBank: number;
  goldSilverValue: number;
  investments: number;
  businessStock: number;
  liabilities: number;
  nisabThreshold: number;
}): { netWealth: number; eligible: boolean; zakatDue: number } {
  const gross = params.cashBank + params.goldSilverValue + params.investments + params.businessStock;
  const netWealth = Math.max(0, gross - params.liabilities);
  const eligible = netWealth >= params.nisabThreshold;
  return {
    netWealth,
    eligible,
    zakatDue: eligible ? netWealth * 0.025 : 0,
  };
}
