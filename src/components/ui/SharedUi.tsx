import React, { useRef, useState } from 'react';
import { Upload, Star, ArrowLeft, Check, Copy } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CategoryIcon } from './CategoryIcon';

export function ToolHeader({
  tool,
  extra,
}: {
  tool: ToolDef;
  extra?: React.ReactNode;
}) {
  const { navigateToTool, favorites, toggleFavorite } = useWorkspace();
  const isFav = favorites.includes(tool.id);

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)]"
          style={{
            backgroundColor: `${tool.color}14`,
            color: tool.color,
          }}
        >
          <CategoryIcon category={tool.cat} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
            <button
              type="button"
              onClick={() => navigateToTool('home')}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -ml-1.5 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Tools
            </button>
            <span aria-hidden="true">/</span>
            <span className="truncate">{tool.cat}</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-[26px]">
            {tool.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{tool.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {extra}
        <button
          type="button"
          onClick={() => toggleFavorite(tool.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            isFav
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-300'
              : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
          }`}
          title={isFav ? 'Remove from Favorites' : 'Pin to Favorites'}
        >
          <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
          {isFav ? 'Pinned' : 'Pin'}
        </button>
      </div>
    </div>
  );
}

export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  label = 'Drop files here or click to browse',
  hint,
  compact = false,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleList = (list: FileList | null) => {
    if (!list || !list.length) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleList(e.dataTransfer.files);
      }}
      className={`surface-dots group cursor-pointer rounded-2xl border-2 border-dashed text-center transition-all duration-150 ${
        compact ? 'px-5 py-6' : 'px-6 py-10'
      } ${
        dragging
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--line-strong)] bg-[var(--surface)] hover:border-[var(--accent)]/80 hover:bg-[var(--surface-2)]/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleList(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent)]/15 bg-[var(--accent-soft)] text-[var(--accent)] transition-transform duration-150 group-hover:-translate-y-0.5">
        <Upload className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // ignore
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3.5">
          {title && (
            <h2 className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">
              {title}
            </h2>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/65 px-4 py-3">
      <div className="text-[11px] font-semibold text-[var(--muted)]">{label}</div>
      <div className="num mt-0.5 font-mono text-lg font-bold tracking-tight text-[var(--ink)]">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}
