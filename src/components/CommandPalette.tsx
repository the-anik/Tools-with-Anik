import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { TOOLS_CATALOG } from '../data/toolsCatalog';
import { useWorkspace } from '../context/WorkspaceContext';
import { CategoryIcon } from './ui/CategoryIcon';

export function CommandPalette() {
  const { commandOpen, setCommandOpen, navigateToTool } = useWorkspace();
  const [q, setQ] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandOpen) {
      setQ('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandOpen]);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return TOOLS_CATALOG.slice(0, 12);
    const scored: { tool: (typeof TOOLS_CATALOG)[number]; score: number }[] = [];
    for (const t of TOOLS_CATALOG) {
      const name = t.name.toLowerCase();
      const desc = t.desc.toLowerCase();
      const cat = t.cat.toLowerCase();
      const kw = t.keywords?.toLowerCase() ?? '';
      let score = 0;
      if (name === term) score = 100;
      else if (name.startsWith(term)) score = 85;
      else if (name.split(/[\s/&+-]+/).some((w) => w.startsWith(term))) score = 70;
      else if (name.includes(term)) score = 55;
      else if (kw.includes(term)) score = 35;
      else if (cat.includes(term)) score = 20;
      else if (desc.includes(term)) score = 10;
      if (score > 0) scored.push({ tool: t, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 16).map((s) => s.tool);
  }, [q]);

  if (!commandOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick tool launcher"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 px-4 pt-20 backdrop-blur-[2px]"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3.5">
          <Search className="h-4 w-4 text-[var(--muted)] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(matches.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && matches[selectedIdx]) {
                navigateToTool(matches[selectedIdx].id);
                setCommandOpen(false);
              }
            }}
            placeholder="Jump to any tool (Compress PDF, QR, Loan EMI, BAJUS Gold, Regex)..."
            className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setCommandOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {matches.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--muted)]">
              No tools match "{q}"
            </div>
          ) : (
            matches.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => {
                  navigateToTool(t.id);
                  setCommandOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                  idx === selectedIdx
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                    : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${t.color}18`, color: t.color }}
                  >
                    <CategoryIcon category={t.cat} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--ink)] truncate">{t.name}</div>
                    <div className="truncate text-[11px] text-[var(--muted)]">{t.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-[var(--muted)]">{t.cat}</span>
                  {idx === selectedIdx && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--accent)]" />}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface-2)]/60 px-4 py-2 text-[11px] text-[var(--muted)]">
          <span>↑↓ Navigate · ↵ Open tool · Esc Close</span>
          <span className="font-semibold text-[var(--ink-2)]">Tools with Anik</span>
        </div>
      </div>
    </div>
  );
}
