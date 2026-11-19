import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Send } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, Panel, StatTile, CopyButton } from '../ui/SharedUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  CaseStyle,
  computeLineDiff,
  fancyTextTransform,
  slugify,
  transformCase,
} from '../../utils/formatters';
import { canvasToBlob, downloadBlob, downloadText } from '../../utils/download';
import { textOrMarkdownToPdf } from '../../utils/pdfEngine';

export function TextStudioWorkspace({ tool }: { tool: ToolDef }) {
  const { transfer, clearTransfer, navigateToTool } = useWorkspace();
  const [tab, setTab] = useState(tool.tab || 'stats');
  const [text, setText] = useState(
    'Tools with Anik brings together 230+ private PDF and daily utility tools in one clean browser workspace.\n\nNo telemetry, no uploads, fast client-side execution.'
  );
  const [textB, setTextB] = useState(
    'Tools with Anik unifies 230+ private PDF and productivity tools in one modern browser workspace.\n\nFast client-side execution with Light Mode by default.'
  );

  // Clean & Find/Replace & Join/Split
  const [findStr, setFindStr] = useState('private');
  const [replaceStr, setReplaceStr] = useState('local-first');
  const [useRegex, setUseRegex] = useState(false);
  const [joinDelim, setJoinDelim] = useState(', ');

  // Lorem / Unicode / Fancy
  const [loremCount, setLoremCount] = useState(3);
  const [loremLang, setLoremLang] = useState<'en' | 'bn'>('en');
  const [utf8Hex, setUtf8Hex] = useState('');

  // Handwriting Canvas
  const hwCanvasRef = useRef<HTMLCanvasElement>(null);
  const [inkColor, setInkColor] = useState<'#1e3a8a' | '#0f172a' | '#b91c1c'>('#1e3a8a');
  const [paperType, setPaperType] = useState<'ruled' | 'plain' | 'grid'>('ruled');
  const [fontSize, setFontSize] = useState(22);

  useEffect(() => {
    setTab(tool.tab || 'stats');
  }, [tool.id, tool.tab]);

  useEffect(() => {
    if (transfer?.text) {
      setText(transfer.text);
      clearTransfer();
    }
  }, [transfer]);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sents = text.trim() ? text.split(/[.!?।\n]+/).filter((s) => s.trim().length > 0).length : 0;
    const paras = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length : 0;
    const readMin = Math.max(1, Math.ceil(words / 220));
    const speakMin = Math.max(1, Math.ceil(words / 135));
    const lines = text ? text.split(/\r?\n/).length : 0;
    return { words, chars, charsNoSpace, sents, paras, readMin, speakMin, lines };
  }, [text]);

  const diffRows = useMemo(() => computeLineDiff(text, textB), [text, textB]);

  useEffect(() => {
    if (tab !== 'handwriting' || !hwCanvasRef.current) return;
    const c = hwCanvasRef.current;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, c.width, c.height);

    const lineStep = 34;
    if (paperType === 'ruled') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      for (let y = 70; y < c.height - 20; y += lineStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(c.width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(64, 0);
      ctx.lineTo(64, c.height);
      ctx.stroke();
    } else if (paperType === 'grid') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = 24; x < c.width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, c.height);
        ctx.stroke();
      }
      for (let y = 24; y < c.height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(c.width, y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = inkColor;
    ctx.font = `italic ${fontSize}px "Segoe Script", "Brush Script MT", cursive, serif`;
    let y = 64;
    const maxW = c.width - 96;
    for (const para of text.split(/\r?\n/)) {
      const words = para.split(/\s+/);
      let line = '';
      for (const w of words) {
        const cand = line ? `${line} ${w}` : w;
        if (ctx.measureText(cand).width > maxW && line) {
          ctx.fillText(line, 76, y);
          y += lineStep;
          line = w;
        } else {
          line = cand;
        }
      }
      if (line) {
        ctx.fillText(line, 76, y);
        y += lineStep;
      } else {
        y += lineStep * 0.6;
      }
    }
  }, [tab, text, inkColor, paperType, fontSize]);

  const generateLorem = () => {
    const enBank =
      'Clear workflows empower teams to focus on meaningful decisions without wrestling with bloated software. Every document and calculation happens locally inside your browser for speed and privacy.';
    const bnBank =
      'পরিচ্ছন্ন ও সহজলভ্য কর্মপ্রবাহ ব্যবহারকারীদের দৈনন্দিন কাজ দ্রুত সম্পন্ন করতে সাহায্য করে। সম্পূর্ণ ব্রাউজার-ভিত্তিক প্রযুক্তি আপনার তথ্য নিরাপদ ও দ্রুত রাখে।';
    const bank = loremLang === 'bn' ? bnBank : enBank;
    setText(Array.from({ length: loremCount }, () => bank).join('\n\n'));
  };

  const applyFindReplace = () => {
    if (!findStr) return;
    if (useRegex) {
      try {
        const re = new RegExp(findStr, 'g');
        setText(text.replace(re, replaceStr));
      } catch {
        // invalid regex ignored
      }
    } else {
      setText(text.split(findStr).join(replaceStr));
    }
  };

  return (
    <div>
      <ToolHeader
        tool={tool}
        extra={
          <div className="flex gap-2">
            <CopyButton text={text} />
            <button
              type="button"
              onClick={() => navigateToTool('pdf-md2pdf', { text })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-2)]"
            >
              <Send className="h-3.5 w-3.5" /> Export via PDF
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['stats', 'Word & Stats'],
          ['case', 'Case Converter'],
          ['clean', 'Cleaner & Polish'],
          ['lines', 'Sort / Dedup / Join'],
          ['diff', 'Find / Regex / Diff'],
          ['markdown', 'Markdown Editor'],
          ['unicode', 'Slug / Lorem / Unicode'],
          ['handwriting', 'Text to Handwriting'],
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

      {/* Live Metrics */}
      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        <StatTile label="Words" value={stats.words} />
        <StatTile label="Characters" value={stats.chars} />
        <StatTile label="No Spaces" value={stats.charsNoSpace} />
        <StatTile label="Sentences" value={stats.sents} />
        <StatTile label="Lines" value={stats.lines} />
        <StatTile label="Read Time" value={`${stats.readMin}m`} sub={`Speak ${stats.speakMin}m`} />
      </div>

      {tab === 'diff' ? (
        <div className="space-y-4">
          <Panel title="Find & Replace">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                value={findStr}
                onChange={(e) => setFindStr(e.target.value)}
                placeholder="Find..."
                className="flex-1 min-w-[140px] rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
              />
              <input
                value={replaceStr}
                onChange={(e) => setReplaceStr(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 min-w-[140px] rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
              />
              <label className="inline-flex items-center gap-1.5 font-semibold">
                <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />
                Regex
              </label>
              <button
                type="button"
                onClick={applyFindReplace}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-white"
              >
                Replace All
              </button>
            </div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Original Text (A)">
              <textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
              />
            </Panel>
            <Panel title="Modified Text (B)">
              <textarea
                rows={8}
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
              />
            </Panel>
          </div>
          <Panel title="Line-by-Line Diff View">
            <div className="space-y-1 font-mono text-xs">
              {diffRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`rounded px-2.5 py-1 ${
                    row.type === 'add'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : row.type === 'del'
                      ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'text-[var(--ink-2)]'
                  }`}
                >
                  <span className="mr-2 font-bold">
                    {row.type === 'add' ? '+' : row.type === 'del' ? '−' : ' '}
                  </span>
                  {row.text || ' '}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : tab === 'markdown' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Markdown Editor">
            <textarea
              rows={15}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
          </Panel>
          <Panel
            title="Live Formatted Preview"
            actions={
              <button
                type="button"
                onClick={async () => {
                  const pdf = await textOrMarkdownToPdf(text, 'Markdown Export', true);
                  downloadBlob(new Blob([pdf as unknown as BlobPart], { type: 'application/pdf' }), 'markdown_export.pdf');
                }}
                className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
              >
                Export PDF
              </button>
            }
          >
            <div className="space-y-2 text-sm leading-relaxed">
              {text.split(/\r?\n/).map((line, idx) => {
                if (line.startsWith('# ')) return <h1 key={idx} className="text-xl font-bold">{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={idx} className="text-lg font-bold">{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={idx} className="text-base font-bold">{line.slice(4)}</h3>;
                if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx} className="ml-4">{line.slice(2)}</li>;
                if (line.startsWith('> ')) return <blockquote key={idx} className="border-l-2 border-[var(--line-strong)] pl-3 italic text-[var(--muted)]">{line.slice(2)}</blockquote>;
                return line.trim() ? <p key={idx}>{line}</p> : <div key={idx} className="h-2" />;
              })}
            </div>
          </Panel>
        </div>
      ) : tab === 'handwriting' ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel title="Handwriting Text & Style" className="lg:col-span-5">
            <textarea
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs"
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <select
                value={inkColor}
                onChange={(e) => setInkColor(e.target.value as typeof inkColor)}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5"
              >
                <option value="#1e3a8a">Blue Ink</option>
                <option value="#0f172a">Black Ink</option>
                <option value="#b91c1c">Red Ink</option>
              </select>
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value as typeof paperType)}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5"
              >
                <option value="ruled">Ruled Sheet</option>
                <option value="grid">Grid Sheet</option>
                <option value="plain">Plain Paper</option>
              </select>
              <input
                type="number"
                min={14}
                max={34}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!hwCanvasRef.current) return;
                downloadBlob(await canvasToBlob(hwCanvasRef.current, 'image/png', 1), 'handwriting_page.png');
              }}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" /> Download Notebook Page PNG
            </button>
          </Panel>
          <Panel title="Rendered Notebook Sheet" className="lg:col-span-7">
            <canvas ref={hwCanvasRef} width={720} height={880} className="w-full rounded-lg border border-[var(--line)]" />
          </Panel>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Panel
              title="Editor"
              actions={
                <button
                  type="button"
                  onClick={() => downloadText(text, 'text_output.txt')}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-semibold"
                >
                  <Download className="h-3 w-3" /> .TXT
                </button>
              }
            >
              <textarea
                rows={13}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm leading-relaxed"
              />
            </Panel>
          </div>
          <div className="space-y-4 lg:col-span-5">
            {tab === 'case' && (
              <Panel title="Transform Case">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ['upper', 'UPPERCASE'],
                      ['lower', 'lowercase'],
                      ['title', 'Title Case'],
                      ['sentence', 'Sentence case'],
                      ['camel', 'camelCase'],
                      ['pascal', 'PascalCase'],
                      ['snake', 'snake_case'],
                      ['kebab', 'kebab-case'],
                      ['constant', 'CONSTANT_CASE'],
                      ['alternating', 'aLtErNaTiNg'],
                      ['inverse', 'iNVERSE cASE'],
                    ] as [CaseStyle, string][]
                  ).map(([st, lbl]) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setText(transformCase(text, st))}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left font-semibold hover:border-[var(--accent)]"
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {(tab === 'clean' || tab === 'stats') && (
              <Panel title="Text Cleaners & Polish">
                <div className="space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setText(text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim())}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left font-semibold"
                  >
                    Remove Extra Spaces & Blank Lines
                  </button>
                  <button
                    type="button"
                    onClick={() => setText(text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left font-semibold"
                  >
                    Strip Zero-Width Chars & Smart Quotes
                  </button>
                  <button
                    type="button"
                    onClick={() => setText(text.replace(/\r?\n(?!\n)/g, ' ').replace(/ +/g, ' '))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left font-semibold"
                  >
                    Normalize Hard Line Breaks (PDF Paste Fix)
                  </button>
                </div>
              </Panel>
            )}

            {tab === 'lines' && (
              <Panel title="Line Operations">
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setText(text.split(/\r?\n/).sort((a, b) => a.localeCompare(b)).join('\n'))}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold"
                    >
                      Sort A → Z
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(text.split(/\r?\n/).sort((a, b) => b.localeCompare(a)).join('\n'))}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold"
                    >
                      Sort Z → A
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(Array.from(new Set(text.split(/\r?\n/))).join('\n'))}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold"
                    >
                      Remove Duplicates
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(text.split(/\r?\n/).filter((l) => l.trim()).join('\n'))}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold"
                    >
                      Remove Empty Lines
                    </button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <input
                      value={joinDelim}
                      onChange={(e) => setJoinDelim(e.target.value)}
                      className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setText(text.split(/\r?\n/).filter(Boolean).join(joinDelim))}
                      className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 font-bold text-white"
                    >
                      Join Lines
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(text.split(joinDelim).join('\n'))}
                      className="flex-1 rounded-lg border border-[var(--line)] py-1.5 font-semibold"
                    >
                      Split to Lines
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {tab === 'unicode' && (
              <Panel title="Slug, Lorem, UTF-8 & Fancy Unicode">
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="mb-1 font-semibold">URL Slug:</div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 font-mono">
                      <span className="truncate flex-1">{slugify(text)}</span>
                      <CopyButton text={slugify(text)} label="Copy" />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={loremLang}
                      onChange={(e) => setLoremLang(e.target.value as 'en' | 'bn')}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5"
                    >
                      <option value="en">English Lorem</option>
                      <option value="bn">বাংলা টেক্সট</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={loremCount}
                      onChange={(e) => setLoremCount(Number(e.target.value))}
                      className="w-16 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono"
                    />
                    <button
                      type="button"
                      onClick={generateLorem}
                      className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 font-bold text-white"
                    >
                      Generate Lorem
                    </button>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold">Fancy Unicode Fonts:</div>
                    <div className="space-y-1.5">
                      {(['bold', 'italic', 'script', 'mono', 'bubbles'] as const).map((v) => {
                        const out = fancyTextTransform(text.slice(0, 60), v);
                        return (
                          <div key={v} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5">
                            <span className="truncate">{out}</span>
                            <CopyButton text={fancyTextTransform(text, v)} label="Copy" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold">UTF-8 Hex Bytes (first 32 chars):</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setUtf8Hex(
                            Array.from(new TextEncoder().encode(text))
                              .map((b) => b.toString(16).padStart(2, '0'))
                              .join(' ')
                          )
                        }
                        className="rounded-lg border border-[var(--line)] px-2.5 py-1 font-semibold"
                      >
                        Encode Hex
                      </button>
                      <span className="truncate font-mono text-[11px] text-[var(--muted)]">{utf8Hex}</span>
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
