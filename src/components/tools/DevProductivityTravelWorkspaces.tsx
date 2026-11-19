import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, Panel, StatTile, CopyButton } from '../ui/SharedUi';
import { countBusinessDays, calcHaversineDistance, simplifyGroupDebts } from '../../utils/calculators';

// ==================== DEVELOPER TOOLS (15) ====================
export function DevToolsWorkspace({ tool }: { tool: ToolDef }) {
  const [tab, setTab] = useState(tool.tab || 'encode');
  const [rawInput, setRawInput] = useState('https://anik.studio/workspace?mode=light&tools=230');
  const [encodedOut, setEncodedOut] = useState('');
  const [uuids, setUuids] = useState<string[]>([crypto.randomUUID()]);
  const [epochSec, setEpochSec] = useState(Math.floor(Date.now() / 1000));

  // Color & WCAG Contrast
  const [fgHex, setFgHex] = useState('#0f172a');
  const [bgHex, setBgHex] = useState('#f8fafc');

  // Regex Tester
  const [regexPat, setRegexPat] = useState('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-z]{2,})');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexText, setRegexText] = useState('Contact team@anik.studio or support@dhaka.dev for notes.');

  // Code Format / Sandbox
  const [codeSnippet, setCodeSnippet] = useState('<div style="padding:20px;font-family:sans-serif">\n  <h2 style="color:#4f46e5">Live HTML Preview</h2>\n  <p>Sandboxed local iframe output.</p>\n</div>');

  useEffect(() => {
    setTab(tool.tab || 'encode');
  }, [tool.id, tool.tab]);

  const queryParams = useMemo(() => {
    try {
      const u = new URL(rawInput.startsWith('http') ? rawInput : `https://example.com/?${rawInput}`);
      return Array.from(u.searchParams.entries());
    } catch {
      return [];
    }
  }, [rawInput]);

  const contrastRatio = useMemo(() => {
    const lum = (hex: string) => {
      const n = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
    };
    const l1 = lum(fgHex);
    const l2 = lum(bgHex);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, [fgHex, bgHex]);

  const shades = useMemo(() => {
    const r = parseInt(fgHex.slice(1, 3), 16) || 0;
    const g = parseInt(fgHex.slice(3, 5), 16) || 0;
    const b = parseInt(fgHex.slice(5, 7), 16) || 0;
    return [90, 75, 55, 35, 15, 0, -15, -35, -55, -75].map((shift, i) => {
      const mix = (c: number) =>
        shift >= 0 ? Math.round(c + ((255 - c) * shift) / 100) : Math.round((c * (100 + shift)) / 100);
      const hx = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
      return { stop: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900][i], hex: `#${hx(mix(r))}${hx(mix(g))}${hx(mix(b))}` };
    });
  }, [fgHex]);

  const regexMatches = useMemo(() => {
    try {
      const re = new RegExp(regexPat, regexFlags.includes('g') ? regexFlags : regexFlags + 'g');
      return Array.from(regexText.matchAll(re)).map((m) => ({
        full: m[0],
        index: m.index ?? 0,
        groups: m.slice(1),
      }));
    } catch {
      return [];
    }
  }, [regexPat, regexFlags, regexText]);

  const formatSql = (sql: string) =>
    sql
      .replace(/\s+/g, ' ')
      .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|INNER JOIN|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, '\n$1')
      .trim();

  return (
    <div>
      <ToolHeader tool={tool} />
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['encode', 'Base64 / URL / Entities'],
          ['time-id', 'UUID v4 & Epoch Time'],
          ['color', 'Color Shades & WCAG'],
          ['format', 'HTML Sandbox & Formatters'],
          ['regex', 'Regex & Capture Groups'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'encode' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Input & Controls">
            <textarea
              rows={6}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEncodedOut(btoa(unescape(encodeURIComponent(rawInput))))}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-bold text-white"
              >
                Base64 Encode
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    setEncodedOut(decodeURIComponent(escape(atob(rawInput.trim()))));
                  } catch {
                    setEncodedOut('Invalid Base64 string');
                  }
                }}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-semibold"
              >
                Base64 Decode
              </button>
              <button
                type="button"
                onClick={() => setEncodedOut(encodeURIComponent(rawInput))}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-semibold"
              >
                URL Encode
              </button>
              <button
                type="button"
                onClick={() => setEncodedOut(decodeURIComponent(rawInput))}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-semibold"
              >
                URL Decode
              </button>
              <button
                type="button"
                onClick={() =>
                  setEncodedOut(
                    rawInput.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                  )
                }
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-semibold"
              >
                HTML Entities
              </button>
            </div>
          </Panel>
          <Panel title="Output & Parsed Query Params" actions={<CopyButton text={encodedOut} />}>
            <textarea
              readOnly
              rows={5}
              value={encodedOut}
              className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
            {queryParams.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 font-semibold">URL Query Parameters ({queryParams.length})</div>
                <div className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
                  {queryParams.map(([k, v], i) => (
                    <div key={i} className="flex justify-between px-3 py-1.5 font-mono">
                      <span className="font-bold">{k}</span>
                      <span className="text-[var(--muted)]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'time-id' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="UUID v4 Cryptographic Generator">
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setUuids(Array.from({ length: 5 }, () => crypto.randomUUID()))}
                className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-bold text-white"
              >
                Generate 5 UUID v4s
              </button>
              <CopyButton text={uuids.join('\n')} label="Copy All" />
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {uuids.map((u) => (
                <div key={u} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
                  <span>{u}</span>
                  <CopyButton text={u} label="Copy" />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Unix Epoch & ISO-8601 Converter">
            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={epochSec}
                  onChange={(e) => setEpochSec(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setEpochSec(Math.floor(Date.now() / 1000))}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold"
                >
                  Now
                </button>
              </div>
              <StatTile label="ISO 8601 (UTC)" value={new Date(epochSec * 1000).toISOString()} />
              <StatTile label="Local Time" value={new Date(epochSec * 1000).toLocaleString()} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'color' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Color Picker & WCAG 2.1 Contrast Checker">
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold">Foreground Text</label>
                <div className="flex gap-2">
                  <input type="color" value={fgHex} onChange={(e) => setFgHex(e.target.value)} />
                  <input value={fgHex} onChange={(e) => setFgHex(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Background</label>
                <div className="flex gap-2">
                  <input type="color" value={bgHex} onChange={(e) => setBgHex(e.target.value)} />
                  <input value={bgHex} onChange={(e) => setBgHex(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-5 text-center" style={{ backgroundColor: bgHex, color: fgHex }}>
              <div className="text-lg font-bold">Contrast Sample Typography</div>
              <div className="text-xs opacity-90">Body text at 14px comparing foreground against surface</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatTile label="Ratio" value={`${contrastRatio.toFixed(2)}:1`} />
              <StatTile label="WCAG AA" value={contrastRatio >= 4.5 ? 'PASS' : contrastRatio >= 3 ? 'Large Only' : 'FAIL'} />
              <StatTile label="WCAG AAA" value={contrastRatio >= 7 ? 'PASS' : 'FAIL'} />
            </div>
          </Panel>
          <Panel title="50–900 Shade Ramp">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {shades.map((s) => (
                <div key={s.stop} className="flex items-center justify-between rounded-lg border border-[var(--line)] p-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded border border-black/10" style={{ backgroundColor: s.hex }} />
                    <span className="font-mono font-bold">{s.stop}</span>
                  </div>
                  <span className="font-mono text-[var(--muted)]">{s.hex}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'format' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="HTML / CSS / JS / SQL Editor & Formatters">
            <textarea
              rows={11}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => setCodeSnippet(formatSql(codeSnippet))} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-bold text-white">
                Format SQL
              </button>
              <button
                type="button"
                onClick={() => setCodeSnippet(codeSnippet.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim())}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-semibold"
              >
                Minify Code
              </button>
            </div>
          </Panel>
          <Panel title="Sandboxed Live Preview">
            <iframe
              title="HTML Sandbox"
              sandbox=""
              srcDoc={codeSnippet}
              className="h-64 w-full rounded-lg border border-[var(--line)] bg-white"
            />
          </Panel>
        </div>
      )}

      {tab === 'regex' && (
        <Panel title="Regular Expression Tester & Capture Groups">
          <div className="mb-3 flex gap-2 text-xs">
            <input
              value={regexPat}
              onChange={(e) => setRegexPat(e.target.value)}
              placeholder="Regex pattern"
              className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
            />
            <input
              value={regexFlags}
              onChange={(e) => setRegexFlags(e.target.value)}
              className="w-20 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
            />
          </div>
          <textarea
            rows={4}
            value={regexText}
            onChange={(e) => setRegexText(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
          />
          <div className="space-y-2 text-xs">
            <div className="font-bold">Matches ({regexMatches.length})</div>
            {regexMatches.map((m, idx) => (
              <div key={idx} className="rounded-lg bg-[var(--surface-2)] px-3 py-2 font-mono">
                <span className="font-bold text-[var(--accent)]">Match #{idx + 1}:</span> {m.full}{' '}
                {m.groups.length > 0 && <span className="text-[var(--muted)]">| Groups: {JSON.stringify(m.groups)}</span>}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ==================== PRODUCTIVITY (14) ====================
export function ProductivityWorkspace({ tool }: { tool: ToolDef }) {
  const [tab, setTab] = useState(tool.tab || 'timers');

  // Timer / Pomodoro / Stopwatch / Interval
  const [pomoSec, setPomoSec] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [swMs, setSwMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  // Tasks / Notes / Habit Tracker
  const [tasks, setTasks] = useState<{ id: number; text: string; done: boolean }[]>([
    { id: 1, text: 'Review PDF merge & compression outputs', done: true },
    { id: 2, text: 'Push unified Tools with Anik repo to GitHub', done: false },
  ]);
  const [newTask, setNewTask] = useState('');
  const [notes, setNotes] = useState(() => localStorage.getItem('anik_notes_v1') || 'Quick workspace notes...');
  const [habits, setHabits] = useState<{ name: string; days: boolean[] }[]>([
    { name: 'Deep Work (90m)', days: [true, true, true, false, false, false, false] },
    { name: 'Exercise / Walk', days: [true, false, true, true, false, false, false] },
  ]);

  // Business Days & Budget
  const [startIso, setStartIso] = useState('2025-05-01');
  const [endIso, setEndIso] = useState('2025-05-31');
  const [bdWeekend, setBdWeekend] = useState(true);
  const [income, setIncome] = useState(65000);
  const [expenses, setExpenses] = useState<{ name: string; amt: number }[]>([
    { name: 'Housing & Utilities', amt: 22000 },
    { name: 'Groceries & Dining', amt: 12000 },
    { name: 'Transport & Internet', amt: 5500 },
  ]);

  // Typing Speed Test (EN & BN)
  const [typingLang, setTypingLang] = useState<'en' | 'bn'>(tool.id === 'prod-typing-bn' ? 'bn' : 'en');
  const promptEn = 'Fast local tools eliminate unnecessary uploads and keep every workflow private and crisp.';
  const promptBn = 'পরিচ্ছন্ন বাংলা টাইপিং অনুশীলন আপনার গতি ও নির্ভুলতা দ্রুত বৃদ্ধি করে।';
  const targetPrompt = typingLang === 'bn' ? promptBn : promptEn;
  const [typedText, setTypedText] = useState('');
  const typingStartRef = useRef<number | null>(null);

  useEffect(() => {
    setTab(tool.tab || 'timers');
  }, [tool.id, tool.tab]);

  useEffect(() => {
    if (!pomoRunning) return;
    const id = setInterval(() => setPomoSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [pomoRunning]);

  useEffect(() => {
    if (!swRunning) return;
    const id = setInterval(() => setSwMs((m) => m + 50), 50);
    return () => clearInterval(id);
  }, [swRunning]);

  const bizRes = useMemo(
    () => countBusinessDays(startIso, endIso, bdWeekend ? [5, 6] : [0, 6]),
    [startIso, endIso, bdWeekend]
  );

  const typingMetrics = useMemo(() => {
    if (!typedText.length || !typingStartRef.current) return { wpm: 0, accuracy: 100 };
    const elapsedMin = Math.max(0.05, (Date.now() - typingStartRef.current) / 60000);
    let correct = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === targetPrompt[i]) correct++;
    }
    const accuracy = Math.round((correct / typedText.length) * 100);
    const wpm = Math.round(typedText.length / 5 / elapsedMin);
    return { wpm, accuracy };
  }, [typedText, targetPrompt]);

  const totalSpent = expenses.reduce((s, e) => s + e.amt, 0);

  return (
    <div>
      <ToolHeader tool={tool} />
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['timers', 'Pomodoro / Stopwatch'],
          ['workspace', 'To-Do / Habits / Notes'],
          ['dates-money', 'Business Days & Budget'],
          ['typing', 'Typing Speed (EN & বাংলা)'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'timers' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Pomodoro & Countdown Focus Timer">
            <div className="flex flex-col items-center py-4">
              <div className="num font-mono text-5xl font-extrabold text-[var(--ink)]">
                {String(Math.floor(pomoSec / 60)).padStart(2, '0')}:{String(pomoSec % 60).padStart(2, '0')}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPomoRunning((r) => !r)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
                >
                  {pomoRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {pomoRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button type="button" onClick={() => { setPomoRunning(false); setPomoSec(25 * 60); }} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">
                  25m Focus
                </button>
                <button type="button" onClick={() => { setPomoRunning(false); setPomoSec(5 * 60); }} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">
                  5m Break
                </button>
              </div>
            </div>
          </Panel>
          <Panel title="Precision Stopwatch & Laps">
            <div className="flex flex-col items-center py-4">
              <div className="num font-mono text-4xl font-extrabold">
                {(swMs / 1000).toFixed(2)}s
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSwRunning((r) => !r)}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
                >
                  {swRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  type="button"
                  onClick={() => setLaps((l) => [swMs, ...l])}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold"
                >
                  Lap
                </button>
                <button
                  type="button"
                  onClick={() => { setSwRunning(false); setSwMs(0); setLaps([]); }}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
              {laps.length > 0 && (
                <div className="mt-3 w-full max-h-32 overflow-y-auto divide-y divide-[var(--line)] font-mono text-xs">
                  {laps.map((l, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span>Lap {laps.length - idx}</span>
                      <span>{(l / 1000).toFixed(2)}s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'workspace' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="To-Do Tasks & 7-Day Habits">
            <div className="mb-3 flex gap-2 text-xs">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTask.trim()) {
                    setTasks((t) => [...t, { id: Date.now(), text: newTask.trim(), done: false }]);
                    setNewTask('');
                  }
                }}
                placeholder="Add new task..."
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTask.trim()) return;
                  setTasks((t) => [...t, { id: Date.now(), text: newTask.trim(), done: false }]);
                  setNewTask('');
                }}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 font-bold text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs mb-5">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                    />
                    <span className={t.done ? 'line-through text-[var(--muted)]' : ''}>{t.text}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                    className="text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="text-xs font-bold mb-2">7-Day Habit Matrix</div>
            {habits.map((h, hi) => (
              <div key={hi} className="mb-2 flex items-center justify-between text-xs">
                <span>{h.name}</span>
                <div className="flex gap-1">
                  {h.days.map((d, di) => (
                    <button
                      key={di}
                      type="button"
                      onClick={() =>
                        setHabits((prev) =>
                          prev.map((x, idx) =>
                            idx === hi ? { ...x, days: x.days.map((v, k) => (k === di ? !v : v)) } : x
                          )
                        )
                      }
                      className={`h-6 w-6 rounded border text-[10px] font-bold ${
                        d ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--line)] bg-[var(--surface-2)]'
                      }`}
                    >
                      {'SMTWTFS'[di]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Quick Notes (Auto-Saved Locally)">
            <textarea
              rows={13}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                try {
                  localStorage.setItem('anik_notes_v1', e.target.value);
                } catch {
                  // ignore
                }
              }}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm"
            />
          </Panel>
        </div>
      )}

      {tab === 'dates-money' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="BD & International Business Days">
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <input type="date" value={startIso} onChange={(e) => setStartIso(e.target.value)} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              <input type="date" value={endIso} onChange={(e) => setEndIso(e.target.value)} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <label className="mb-3 inline-flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={bdWeekend} onChange={(e) => setBdWeekend(e.target.checked)} />
              Bangladesh Weekend (Fri–Sat) instead of Sat–Sun
            </label>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Total Days" value={bizRes.totalDays} />
              <StatTile label="Business Days" value={bizRes.businessDays} />
              <StatTile label="Weekends" value={bizRes.weekendCount} />
            </div>
          </Panel>
          <Panel title="Monthly Budget & Expense Balance">
            <div className="mb-3 text-xs">
              <label className="mb-1 block font-semibold">Monthly Income</label>
              <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div className="space-y-1.5 text-xs mb-3">
              {expenses.map((ex, i) => (
                <div key={i} className="flex gap-2">
                  <input value={ex.name} onChange={(e) => setExpenses((p) => p.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className="flex-1 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1" />
                  <input type="number" value={ex.amt} onChange={(e) => setExpenses((p) => p.map((x, k) => (k === i ? { ...x, amt: Number(e.target.value) } : x)))} className="w-28 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Total Expenses" value={totalSpent.toLocaleString()} />
              <StatTile label="Remaining Savings" value={(income - totalSpent).toLocaleString()} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'typing' && (
        <Panel title="Typing Speed Test (English & বাংলা)">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setTypingLang('en'); setTypedText(''); typingStartRef.current = null; }}
              className={`rounded-lg px-3 py-1.5 font-semibold ${typingLang === 'en' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--line)]'}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => { setTypingLang('bn'); setTypedText(''); typingStartRef.current = null; }}
              className={`rounded-lg px-3 py-1.5 font-semibold ${typingLang === 'bn' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--line)]'}`}
            >
              বাংলা
            </button>
          </div>
          <div className="mb-3 rounded-lg bg-[var(--surface-2)] p-4 text-base font-medium leading-relaxed">
            {targetPrompt}
          </div>
          <textarea
            rows={3}
            value={typedText}
            onChange={(e) => {
              if (!typingStartRef.current) typingStartRef.current = Date.now();
              setTypedText(e.target.value);
            }}
            placeholder="Start typing the sentence above..."
            className="mb-4 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Typing Speed" value={`${typingMetrics.wpm} WPM`} />
            <StatTile label="Accuracy" value={`${typingMetrics.accuracy}%`} />
          </div>
        </Panel>
      )}
    </div>
  );
}

// ==================== TRAVEL TOOLS (12) ====================
export function TravelToolsWorkspace({ tool }: { tool: ToolDef }) {
  const [tab, setTab] = useState(tool.tab || 'budget');
  const [participants, setParticipants] = useState('Anik, Nadia, Tariq');
  const [tripExpenses, setTripExpenses] = useState([
    { paidBy: 'Anik', amount: 4500, label: 'Hotel Booking' },
    { paidBy: 'Nadia', amount: 1800, label: 'Dinner & Transport' },
  ]);
  const [newExp, setNewExp] = useState({ paidBy: 'Anik', amount: 600, label: 'Tickets' });

  // World Time Zone Slider
  const [utcHour, setUtcHour] = useState(9);
  const cities = [
    { name: 'New York', offset: -4 },
    { name: 'London', offset: 1 },
    { name: 'Dubai', offset: 4 },
    { name: 'Dhaka', offset: 6 },
    { name: 'Singapore', offset: 8 },
    { name: 'Tokyo', offset: 9 },
  ];

  // Distance & Weather & Fuel
  const [lat1, setLat1] = useState(23.8103); // Dhaka
  const [lon1, setLon1] = useState(90.4125);
  const [lat2, setLat2] = useState(22.3569); // Chattogram
  const [lon2, setLon2] = useState(91.7832);
  const [kmPerLiter, setKmPerLiter] = useState(14);
  const [fuelPrice, setFuelPrice] = useState(125);
  const [weatherInfo, setWeatherInfo] = useState('');

  // Packing / Shopping / Itinerary
  const [packItems, setPackItems] = useState([
    { item: 'Passport / NID & Tickets', packed: true },
    { item: 'Power bank & Type-C Cable', packed: true },
    { item: 'Umbrella / Light Jacket', packed: false },
    { item: 'First Aid & Sunglasses', packed: false },
  ]);

  useEffect(() => {
    setTab(tool.tab || 'budget');
  }, [tool.id, tool.tab]);

  const memberList = useMemo(
    () => participants.split(',').map((s) => s.trim()).filter(Boolean),
    [participants]
  );
  const debtData = useMemo(
    () => simplifyGroupDebts(tripExpenses, memberList),
    [tripExpenses, memberList]
  );
  const distKm = useMemo(() => calcHaversineDistance(lat1, lon1, lat2, lon2), [lat1, lon1, lat2, lon2]);

  const fetchOpenMeteo = async () => {
    try {
      setWeatherInfo('Fetching destination weather...');
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat2}&longitude=${lon2}&current_weather=true&daily=sunrise,sunset&timezone=auto`
      );
      const data = await res.json();
      const cur = data.current_weather;
      const sr = data.daily?.sunrise?.[0]?.slice(11) ?? '';
      const ss = data.daily?.sunset?.[0]?.slice(11) ?? '';
      setWeatherInfo(`${cur.temperature}°C, Wind ${cur.windspeed} km/h · Sunrise ${sr} / Sunset ${ss}`);
    } catch {
      setWeatherInfo('Offline fallback: clear sky estimate available.');
    }
  };

  return (
    <div>
      <ToolHeader tool={tool} />
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['budget', 'Group Split & Fuel Budget'],
          ['lists', 'Packing & Itinerary Checklists'],
          ['time-geo', '24h Time Zone / Distance / Solar'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'budget' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Group Expense Debt Simplifier">
            <label className="mb-1 block text-xs font-semibold">Participants (comma separated)</label>
            <input
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs"
            />
            <div className="mb-3 flex gap-2 text-xs">
              <select
                value={newExp.paidBy}
                onChange={(e) => setNewExp((x) => ({ ...x, paidBy: e.target.value }))}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5"
              >
                {memberList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                value={newExp.label}
                onChange={(e) => setNewExp((x) => ({ ...x, label: e.target.value }))}
                placeholder="Description"
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5"
              />
              <input
                type="number"
                value={newExp.amount}
                onChange={(e) => setNewExp((x) => ({ ...x, amount: Number(e.target.value) }))}
                className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono"
              />
              <button
                type="button"
                onClick={() => setTripExpenses((p) => [...p, newExp])}
                className="rounded-lg bg-[var(--accent)] px-3 font-bold text-white"
              >
                Add
              </button>
            </div>
            <div className="space-y-1 text-xs mb-4">
              {tripExpenses.map((e, i) => (
                <div key={i} className="flex justify-between rounded bg-[var(--surface-2)] px-3 py-1.5">
                  <span><strong>{e.paidBy}</strong> paid for {e.label}</span>
                  <span className="font-mono font-bold">{e.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">Simplified Settlements</div>
              {debtData.settlements.length === 0 ? (
                <div>All settled!</div>
              ) : (
                debtData.settlements.map((s, idx) => (
                  <div key={idx} className="font-mono">
                    {s.from} → {s.to}: <strong>{s.amount.toLocaleString()}</strong>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Road Trip Distance & Fuel Cost">
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div>
                <label className="mb-1 block font-semibold">Fuel Efficiency (km/L)</label>
                <input type="number" value={kmPerLiter} onChange={(e) => setKmPerLiter(Math.max(1, Number(e.target.value)))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Fuel Price (/Liter)</label>
                <input type="number" value={fuelPrice} onChange={(e) => setFuelPrice(Number(e.target.value))} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Straight Distance" value={`${distKm.toFixed(1)} km`} sub={`${(distKm * 0.62137).toFixed(1)} miles`} />
              <StatTile label="Est. Fuel Cost" value={Math.round((distKm / kmPerLiter) * fuelPrice).toLocaleString()} sub={`${(distKm / kmPerLiter).toFixed(1)} Liters`} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'lists' && (
        <Panel title="Interactive Travel Packing & Shopping Checklist">
          <div className="space-y-2 text-xs">
            {packItems.map((p, idx) => (
              <label key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.packed}
                  onChange={() => setPackItems((prev) => prev.map((x, k) => (k === idx ? { ...x, packed: !x.packed } : x)))}
                />
                <span className={p.packed ? 'line-through text-[var(--muted)]' : 'font-medium'}>{p.item}</span>
              </label>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'time-geo' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="24h World Time Zone & Meeting Overlap Slider">
            <label className="mb-2 flex justify-between text-xs font-semibold">
              <span>UTC Reference Hour</span>
              <span className="font-mono">{String(utcHour).padStart(2, '0')}:00 UTC</span>
            </label>
            <input
              type="range"
              min={0}
              max={23}
              value={utcHour}
              onChange={(e) => setUtcHour(Number(e.target.value))}
              className="mb-4 w-full accent-[var(--accent)]"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {cities.map((c) => {
                const h = (utcHour + c.offset + 24) % 24;
                const polite = h >= 9 && h <= 18;
                return (
                  <div key={c.name} className={`rounded-lg border p-2.5 ${polite ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-[var(--line)]'}`}>
                    <div className="font-bold">{c.name}</div>
                    <div className="font-mono text-sm font-bold">{String(h).padStart(2, '0')}:00</div>
                    <div className="text-[11px] text-[var(--muted)]">{polite ? 'Work hours (9–6)' : 'Off-hours'}</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Coordinates Distance & Live Open-Meteo Destination Weather">
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <input type="number" step="0.01" value={lat1} onChange={(e) => setLat1(Number(e.target.value))} placeholder="Origin Lat" className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" />
              <input type="number" step="0.01" value={lon1} onChange={(e) => setLon1(Number(e.target.value))} placeholder="Origin Lon" className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" />
              <input type="number" step="0.01" value={lat2} onChange={(e) => setLat2(Number(e.target.value))} placeholder="Dest Lat" className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" />
              <input type="number" step="0.01" value={lon2} onChange={(e) => setLon2(Number(e.target.value))} placeholder="Dest Lon" className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" />
            </div>
            <button type="button" onClick={fetchOpenMeteo} className="mb-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white">
              Sync Live Destination Weather & Solar
            </button>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Distance" value={`${distKm.toFixed(1)} km`} />
              <StatTile label="Destination Info" value={weatherInfo ? 'Synced' : 'Ready'} sub={weatherInfo || 'Click Sync'} />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
