import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, Panel, StatTile } from '../ui/SharedUi';
import {
  calcCompoundInterest,
  calcDpsMaturity,
  calcExactAge,
  calcLoanEmi,
  calcStats,
  evaluateMath,
  numericalDerivative,
  simpsonIntegral,
} from '../../utils/calculators';
import { jsonToCsv, numToWordsEnBD } from '../../utils/formatters';
import { downloadText } from '../../utils/download';

export function CalculatorWorkspace({ tool }: { tool: ToolDef }) {
  const [tab, setTab] = useState(tool.tab || 'sci');

  // Scientific & Calculus Grapher
  const [expr, setExpr] = useState('sin(x) + 0.3*x');
  const [exprG, setExprG] = useState('cos(x)');
  const [calcExpr, setCalcExpr] = useState('25 * (1 + 0.15)^3');
  const [calcAns, setCalcAns] = useState(0);
  const [evalX, setEvalX] = useState(1.5);
  const [intA, setIntA] = useState(0);
  const [intB, setIntB] = useState(3.1416);
  const graphRef = useRef<HTMLCanvasElement>(null);

  // Percentage / Discount / VAT / Tip
  const [pctA, setPctA] = useState(15);
  const [pctB, setPctB] = useState(12000);
  const [tipPeople, setTipPeople] = useState(4);

  // Finance / Profit / Break-even
  const [rev, setRev] = useState(250000);
  const [cost, setCost] = useState(165000);
  const [fixedCost, setFixedCost] = useState(50000);
  const [unitPrice, setUnitPrice] = useState(500);
  const [unitVarCost, setUnitVarCost] = useState(280);
  const [commRate, setCommRate] = useState(8);

  // Loans / EMI / DPS
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(10.5);
  const [months, setMonths] = useState(36);
  const [dpsMonthly, setDpsMonthly] = useState(5000);

  // Date / Age / Salary
  const [dob, setDob] = useState('1998-06-15');
  const [dateAddDays, setDateAddDays] = useState(45);
  const [hourlyPay, setHourlyPay] = useState(450);
  const [regHours, setRegHours] = useState(40);
  const [otHours, setOtHours] = useState(8);

  // Education & Stats
  const [gpaScale, setGpaScale] = useState<'5' | '4'>('5');
  const [courses, setCourses] = useState([
    { name: 'Mathematics', credits: 3, gpa: 5.0 },
    { name: 'Physics', credits: 3, gpa: 4.5 },
    { name: 'English', credits: 2, gpa: 4.0 },
  ]);
  const [attendedCls, setAttendedCls] = useState(38);
  const [totalCls, setTotalCls] = useState(48);
  const [statsInput, setStatsInput] = useState('12, 18, 22, 22, 29, 34, 41');

  // Tech & Health
  const [storageMb, setStorageMb] = useState(2048);
  const [mbps, setMbps] = useState(50);
  const [weightKg, setWeightKg] = useState(70);
  const [heightCm, setHeightCm] = useState(173);
  const [ageYrs, setAgeYrs] = useState(26);
  const [wakeTime, setWakeTime] = useState('06:30');

  useEffect(() => {
    setTab(tool.tab || 'sci');
  }, [tool.id, tool.tab]);

  // Draw f(x)/g(x) graph + shaded integral
  useEffect(() => {
    if (tab !== 'sci' || !graphRef.current) return;
    const c = graphRef.current;
    const ctx = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const xMin = -6;
    const xMax = 6;
    const yMin = -4;
    const yMax = 4;
    const toPxX = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const toPxY = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      ctx.beginPath();
      ctx.moveTo(toPxX(x), 0);
      ctx.lineTo(toPxX(x), H);
      ctx.stroke();
    }
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
      ctx.beginPath();
      ctx.moveTo(0, toPxY(y));
      ctx.lineTo(W, toPxY(y));
      ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, toPxY(0));
    ctx.lineTo(W, toPxY(0));
    ctx.moveTo(toPxX(0), 0);
    ctx.lineTo(toPxX(0), H);
    ctx.stroke();

    // Shaded integral area
    ctx.fillStyle = 'rgba(79, 70, 229, 0.14)';
    ctx.beginPath();
    const lo = Math.min(intA, intB);
    const hi = Math.max(intA, intB);
    ctx.moveTo(toPxX(lo), toPxY(0));
    for (let i = 0; i <= 80; i++) {
      const x = lo + (i / 80) * (hi - lo);
      const y = evaluateMath(expr, x);
      if (Number.isFinite(y)) ctx.lineTo(toPxX(x), toPxY(y));
    }
    ctx.lineTo(toPxX(hi), toPxY(0));
    ctx.closePath();
    ctx.fill();

    const plotFn = (fnExpr: string, color: string) => {
      if (!fnExpr.trim()) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let started = false;
      for (let px = 0; px <= W; px += 2) {
        const x = xMin + (px / W) * (xMax - xMin);
        const y = evaluateMath(fnExpr, x);
        if (Number.isFinite(y) && Math.abs(y) < 50) {
          const py = toPxY(y);
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    };

    plotFn(exprG, '#0ea5e9');
    plotFn(expr, '#4f46e5');
  }, [tab, expr, exprG, intA, intB]);

  const sciEvalVal = useMemo(() => evaluateMath(calcExpr, evalX, calcAns), [calcExpr, evalX, calcAns]);
  const fxVal = useMemo(() => evaluateMath(expr, evalX), [expr, evalX]);
  const dfVal = useMemo(() => numericalDerivative(expr, evalX), [expr, evalX]);
  const intVal = useMemo(() => simpsonIntegral(expr, intA, intB), [expr, intA, intB]);

  const emiData = useMemo(() => calcLoanEmi(principal, rate, months), [principal, rate, months]);
  const compData = useMemo(() => calcCompoundInterest(principal, rate, months / 12, 12), [principal, rate, months]);
  const dpsData = useMemo(() => calcDpsMaturity(dpsMonthly, rate, months), [dpsMonthly, rate, months]);
  const ageData = useMemo(() => calcExactAge(dob), [dob]);

  const statsData = useMemo(() => {
    const nums = statsInput
      .split(/[\s,;]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    return calcStats(nums);
  }, [statsInput]);

  const gpaResult = useMemo(() => {
    const totCred = courses.reduce((s, c) => s + c.credits, 0);
    const weighted = courses.reduce((s, c) => s + c.credits * Math.min(Number(gpaScale), c.gpa), 0);
    return totCred > 0 ? weighted / totCred : 0;
  }, [courses, gpaScale]);

  return (
    <div>
      <ToolHeader tool={tool} />

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['sci', 'Scientific & Calculus'],
          ['pct', 'Percentage / VAT / Tip'],
          ['finance', 'Profit / Margin / Break-even'],
          ['loan', 'EMI / Compound / DPS'],
          ['date-time', 'Age / Work Hours / Salary'],
          ['edu-stats', 'GPA / Attendance / Stats'],
          ['tech-health', 'Storage / Bandwidth / Health'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sci' && (
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel title="Scientific Expression Evaluator" className="lg:col-span-5">
            <input
              value={calcExpr}
              onChange={(e) => setCalcExpr(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 font-mono text-sm font-semibold"
            />
            <div className="mt-2 rounded-lg bg-[var(--accent-soft)] p-3 font-mono">
              <div className="text-[11px] text-[var(--accent-ink)]">Result</div>
              <div className="num text-xl font-bold text-[var(--accent-ink)]">
                {Number.isFinite(sciEvalVal) ? sciEvalVal.toLocaleString(undefined, { maximumFractionDigits: 8 }) : 'Syntax Error'}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5 font-mono text-xs">
              {['7','8','9','/','sqrt(', '4','5','6','*','^', '1','2','3','-','sin(', '0','.','(',')','+', 'pi','e','ln(','log(','!'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCalcExpr((p) => p + k)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold hover:border-[var(--accent)]"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (Number.isFinite(sciEvalVal)) setCalcAns(sciEvalVal);
                }}
                className="flex-1 rounded-lg border border-[var(--line)] py-1.5 font-semibold"
              >
                Store Ans ({calcAns.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => setCalcExpr('')}
                className="rounded-lg border border-[var(--line)] px-4 py-1.5 font-semibold text-[var(--danger)]"
              >
                Clear
              </button>
            </div>
          </Panel>

          <Panel title="Dual-Function f(x)/g(x) Grapher & Calculus" className="lg:col-span-7">
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-indigo-600">f(x) (Primary Indigo)</label>
                <input
                  value={expr}
                  onChange={(e) => setExpr(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-sky-600">g(x) (Secondary Sky)</label>
                <input
                  value={exprG}
                  onChange={(e) => setExprG(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
            <canvas ref={graphRef} width={560} height={240} className="w-full rounded-lg border border-[var(--line)]" />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-[var(--muted)]">Evaluate at x =</label>
                <input
                  type="number"
                  step={0.1}
                  value={evalX}
                  onChange={(e) => setEvalX(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono"
                />
              </div>
              <StatTile label="f(x) & f'(x)" value={fxVal.toFixed(4)} sub={`df/dx = ${dfVal.toFixed(4)}`} />
              <StatTile label={`∫ f(x)dx [${intA}..${intB}]`} value={intVal.toFixed(4)} />
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <label className="flex items-center gap-1">
                a: <input type="number" step={0.5} value={intA} onChange={(e) => setIntA(Number(e.target.value))} className="w-20 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                b: <input type="number" step={0.5} value={intB} onChange={(e) => setIntB(Number(e.target.value))} className="w-20 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
              </label>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'pct' && (
        <Panel title="Percentage, Change, Discount, 15% VAT & Tip Splitter">
          <div className="grid gap-4 sm:grid-cols-3 text-xs mb-4">
            <div>
              <label className="mb-1 block font-semibold">Rate / Percentage (X %)</label>
              <input type="number" value={pctA} onChange={(e) => setPctA(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Base Amount (Y)</label>
              <input type="number" value={pctB} onChange={(e) => setPctB(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">People Splitting Bill</label>
              <input type="number" min={1} value={tipPeople} onChange={(e) => setTipPeople(Math.max(1, Number(e.target.value)))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label={`${pctA}% of ${pctB}`} value={((pctA / 100) * pctB).toLocaleString()} />
            <StatTile label={`After ${pctA}% Discount`} value={(pctB * (1 - pctA / 100)).toLocaleString()} sub={`Saved ${((pctA / 100) * pctB).toLocaleString()}`} />
            <StatTile label={`+ ${pctA}% VAT / Tax`} value={(pctB * (1 + pctA / 100)).toLocaleString()} sub={`Per person: ${((pctB * (1 + pctA / 100)) / tipPeople).toFixed(2)}`} />
            <StatTile label="BD 15% VAT Total" value={(pctB * 1.15).toLocaleString()} sub={`VAT: ${(pctB * 0.15).toLocaleString()}`} />
          </div>
          <div className="mt-3 text-xs text-[var(--muted)]">In Words (BD): {numToWordsEnBD(Math.round(pctB * (1 + pctA / 100)))}</div>
        </Panel>
      )}

      {tab === 'finance' && (
        <Panel title="Profit, Margin, Markup, Break-Even & Commission">
          <div className="grid gap-3 sm:grid-cols-3 text-xs mb-4">
            <div>
              <label className="mb-1 block font-semibold">Revenue / Sales</label>
              <input type="number" value={rev} onChange={(e) => setRev(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Total Cost</label>
              <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Commission %</label>
              <input type="number" value={commRate} onChange={(e) => setCommRate(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Fixed Costs (Break-Even)</label>
              <input type="number" value={fixedCost} onChange={(e) => setFixedCost(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Unit Selling Price</label>
              <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Unit Variable Cost</label>
              <input type="number" value={unitVarCost} onChange={(e) => setUnitVarCost(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="Net Profit" value={(rev - cost).toLocaleString()} />
            <StatTile label="Profit Margin" value={rev > 0 ? `${(((rev - cost) / rev) * 100).toFixed(2)}%` : '0%'} sub={`Markup ${cost > 0 ? (((rev - cost) / cost) * 100).toFixed(1) : 0}%`} />
            <StatTile label="Break-Even Units" value={unitPrice > unitVarCost ? Math.ceil(fixedCost / (unitPrice - unitVarCost)).toLocaleString() : 'N/A'} />
            <StatTile label="Sales Commission" value={((rev * commRate) / 100).toLocaleString()} />
          </div>
        </Panel>
      )}

      {tab === 'loan' && (
        <div className="space-y-4">
          <Panel title="Loan EMI, Compound Interest & DPS/SIP Savings">
            <div className="grid gap-3 sm:grid-cols-4 text-xs mb-4">
              <div>
                <label className="mb-1 block font-semibold">Loan / Principal</label>
                <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Annual Interest (%)</label>
                <input type="number" step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Tenure (Months)</label>
                <input type="number" min={1} value={months} onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Monthly DPS Deposit</label>
                <input type="number" value={dpsMonthly} onChange={(e) => setDpsMonthly(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <StatTile label="Monthly Loan EMI" value={Math.round(emiData.emi).toLocaleString()} />
              <StatTile label="Total Loan Interest" value={Math.round(emiData.totalInterest).toLocaleString()} sub={`Total ${Math.round(emiData.totalPayment).toLocaleString()}`} />
              <StatTile label="Compound Maturity" value={Math.round(compData.finalAmount).toLocaleString()} sub={`+${Math.round(compData.interestEarned).toLocaleString()} interest`} />
              <StatTile label="DPS Maturity" value={Math.round(dpsData.maturityValue).toLocaleString()} sub={`Profit ${Math.round(dpsData.profit).toLocaleString()}`} />
            </div>
          </Panel>
          <Panel
            title="Amortization Schedule (First 12 Months)"
            actions={
              <button
                type="button"
                onClick={() => downloadText(jsonToCsv(emiData.schedule), 'amortization_schedule.csv', 'text/csv')}
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold"
              >
                Export Full CSV
              </button>
            }
          >
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                    <th className="py-1.5">Month</th>
                    <th className="py-1.5 text-right">Principal</th>
                    <th className="py-1.5 text-right">Interest</th>
                    <th className="py-1.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] font-mono">
                  {emiData.schedule.slice(0, 12).map((r) => (
                    <tr key={r.month}>
                      <td className="py-1.5">{r.month}</td>
                      <td className="py-1.5 text-right">{r.principal.toFixed(0)}</td>
                      <td className="py-1.5 text-right">{r.interest.toFixed(0)}</td>
                      <td className="py-1.5 text-right">{r.balance.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'date-time' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Age, Birthday Countdown & Date Add/Subtract">
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Exact Age" value={`${ageData.years}y ${ageData.months}m ${ageData.days}d`} sub={`${ageData.totalDays.toLocaleString()} days lived`} />
                <StatTile label="Next Birthday" value={`${ageData.daysUntilNextBirthday} days`} />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Add/Subtract Days from Today</label>
                <div className="flex gap-2 items-center">
                  <input type="number" value={dateAddDays} onChange={(e) => setDateAddDays(Number(e.target.value))} className="w-28 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
                  <span className="font-mono font-bold">
                    → {new Date(Date.now() + dateAddDays * 86_400_000).toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Work Hours, Overtime & Salary Breakdown">
            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              <div>
                <label className="mb-1 block font-semibold">Hourly Rate</label>
                <input type="number" value={hourlyPay} onChange={(e) => setHourlyPay(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Regular Hrs</label>
                <input type="number" value={regHours} onChange={(e) => setRegHours(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">1.5x OT Hrs</label>
                <input type="number" value={otHours} onChange={(e) => setOtHours(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Weekly Pay" value={Math.round(hourlyPay * (regHours + otHours * 1.5)).toLocaleString()} sub={`OT bonus: ${Math.round(hourlyPay * otHours * 1.5)}`} />
              <StatTile label="Annualized (52w)" value={Math.round(hourlyPay * (regHours + otHours * 1.5) * 52).toLocaleString()} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'edu-stats' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="GPA / CGPA & Attendance (75% Rule)">
            <div className="mb-3 flex items-center justify-between text-xs">
              <select value={gpaScale} onChange={(e) => setGpaScale(e.target.value as '5' | '4')} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 font-semibold">
                <option value="5">Bangladesh 5.0 GPA Scale</option>
                <option value="4">University 4.0 CGPA Scale</option>
              </select>
              <button
                type="button"
                onClick={() => setCourses((c) => [...c, { name: `Course ${c.length + 1}`, credits: 3, gpa: Number(gpaScale) }])}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-bold text-white"
              >
                + Add Course
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {courses.map((c, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input value={c.name} onChange={(e) => setCourses((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} className="col-span-6 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1" />
                  <input type="number" min={0.5} step={0.5} value={c.credits} onChange={(e) => setCourses((prev) => prev.map((x, i) => (i === idx ? { ...x, credits: Number(e.target.value) } : x)))} className="col-span-3 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                  <input type="number" min={0} max={Number(gpaScale)} step={0.1} value={c.gpa} onChange={(e) => setCourses((prev) => prev.map((x, i) => (i === idx ? { ...x, gpa: Number(e.target.value) } : x)))} className="col-span-3 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatTile label="Cumulative GPA" value={gpaResult.toFixed(2)} sub={`Out of ${gpaScale}.00`} />
              <StatTile
                label="Attendance %"
                value={`${totalCls > 0 ? ((attendedCls / totalCls) * 100).toFixed(1) : 0}%`}
                sub={attendedCls / Math.max(1, totalCls) >= 0.75 ? 'Eligible (>=75%)' : 'Need more classes'}
              />
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <label className="flex-1">Attended: <input type="number" value={attendedCls} onChange={(e) => setAttendedCls(Number(e.target.value))} className="w-20 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" /></label>
              <label className="flex-1">Total: <input type="number" value={totalCls} onChange={(e) => setTotalCls(Number(e.target.value))} className="w-20 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" /></label>
            </div>
          </Panel>

          <Panel title="Mean, Median, Mode & StdDev Calculator">
            <label className="mb-1 block text-xs font-semibold">Numbers (comma or space separated)</label>
            <textarea
              rows={3}
              value={statsInput}
              onChange={(e) => setStatsInput(e.target.value)}
              className="mb-4 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-2.5 font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Mean" value={statsData.mean.toFixed(3)} />
              <StatTile label="Median" value={statsData.median.toFixed(3)} />
              <StatTile label="Mode" value={statsData.mode.length ? statsData.mode.join(', ') : 'None'} />
              <StatTile label="Std Dev" value={statsData.stdDev.toFixed(3)} />
              <StatTile label="Sum" value={statsData.sum.toFixed(2)} />
              <StatTile label="Min / Max" value={`${statsData.min} / ${statsData.max}`} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'tech-health' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Data Storage & Bandwidth Transfer Estimator">
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div>
                <label className="mb-1 block font-semibold">File Size (MB)</label>
                <input type="number" value={storageMb} onChange={(e) => setStorageMb(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Connection Speed (Mbps)</label>
                <input type="number" min={0.1} value={mbps} onChange={(e) => setMbps(Math.max(0.1, Number(e.target.value)))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Binary (GiB)" value={(storageMb / 1024).toFixed(3)} sub={`${(storageMb * 1024).toLocaleString()} KB`} />
              <StatTile label="Transfer Time" value={`${((storageMb * 8) / mbps).toFixed(1)} sec`} sub={`${((storageMb * 8) / mbps / 60).toFixed(2)} min`} />
            </div>
          </Panel>
          <Panel title="BMI, BMR (Mifflin-St Jeor) & REM Sleep Cycles">
            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              <div>
                <label className="mb-1 block font-semibold">Weight (kg)</label>
                <input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Height (cm)</label>
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Age / Wake</label>
                <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="BMI"
                value={(weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)}
                sub={`BMR ~${Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYrs + 5)} kcal`}
              />
              <StatTile
                label="Optimal Bedtime (7.5h)"
                value={(() => {
                  const [hh, mm] = wakeTime.split(':').map(Number);
                  let mins = hh * 60 + mm - 450;
                  if (mins < 0) mins += 1440;
                  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
                })()}
                sub="5 × 90-min sleep cycles"
              />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
