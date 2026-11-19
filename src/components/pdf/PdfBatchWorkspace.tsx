import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { PDFDocument, degrees } from 'pdf-lib';
import { Play, Pause, XCircle, RotateCcw, FolderUp, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, FileDropzone, Panel, StatTile } from '../ui/SharedUi';
import {
  compressPdf,
  convertPdfToOutputs,
  extractPdfTextAndSearch,
  imagesToPdf,
  layoutPdf,
  splitPdfToZip,
  stampPdf,
} from '../../utils/pdfEngine';
import { downloadBlob, readFileAsBytes } from '../../utils/download';
import { fmtBytes, parsePageRanges, safeBase } from '../../utils/formatters';
import { useWorkspace } from '../../context/WorkspaceContext';

type BatchEngineId =
  | 'compress'
  | 'merge'
  | 'split'
  | 'rotate'
  | 'watermark'
  | 'img2pdf'
  | 'pdf2img'
  | 'rename'
  | 'extract'
  | 'metadata'
  | 'numbers'
  | 'stamp'
  | 'grayscale'
  | 'flatten'
  | 'resize'
  | 'text';

const BATCH_ENGINES: { id: BatchEngineId; label: string; sub: string; accept: string }[] = [
  { id: 'compress', label: '1. Batch PDF Compressor', sub: 'Smart, Raster & Target-KB shrink', accept: '.pdf' },
  { id: 'merge', label: '2. Batch PDF Merger', sub: 'Combine all queued PDFs cleanly', accept: '.pdf' },
  { id: 'split', label: '3. Batch PDF Splitter', sub: 'Every N or single pages -> ZIP', accept: '.pdf' },
  { id: 'rotate', label: '4. Batch PDF Rotation', sub: 'Rotate 90°/180°/270° in bulk', accept: '.pdf' },
  { id: 'watermark', label: '5. Batch PDF Watermark', sub: 'Diagonal watermark stamp', accept: '.pdf' },
  { id: 'img2pdf', label: '6. Batch Image-to-PDF', sub: 'A4/Letter PDF per image or merged', accept: 'image/*' },
  { id: 'pdf2img', label: '7. Batch PDF-to-Image', sub: 'PNG/JPG renders in ZIP', accept: '.pdf' },
  { id: 'rename', label: '8. Batch PDF Renamer', sub: 'Pattern rules + find/replace', accept: '.pdf' },
  { id: 'extract', label: '9. Batch Page Extraction', sub: 'Extract ranges (e.g. 1-2) per PDF', accept: '.pdf' },
  { id: 'metadata', label: '10. Batch Metadata Studio', sub: 'Strip or stamp Title/Author', accept: '.pdf' },
  { id: 'numbers', label: '11. Batch Page & Bates #', sub: 'Page X of Y or Legal Bates', accept: '.pdf' },
  { id: 'stamp', label: '12. Batch Header & Footer', sub: 'Dynamic header/footer tokens', accept: '.pdf' },
  { id: 'grayscale', label: '13. Batch Grayscale & Scan', sub: 'Ink-saving grayscale/B&W render', accept: '.pdf' },
  { id: 'flatten', label: '14. Batch Flatten & Sanitize', sub: 'Flatten forms & strip metadata', accept: '.pdf' },
  { id: 'resize', label: '15. Batch Page Standardizer', sub: 'Normalize all pages to A4/Letter', accept: '.pdf' },
  { id: 'text', label: '16. Batch Text & Markdown', sub: 'Extract .txt or .md per PDF', accept: '.pdf' },
];

interface QueueItem {
  id: string;
  file: File;
  relPath: string;
  origSize: number;
  outSize?: number;
  status: 'queued' | 'running' | 'done' | 'error';
  error?: string;
  outputs?: { name: string; blob: Blob }[];
}

export function PdfBatchWorkspace({ tool }: { tool: ToolDef }) {
  const { transfer, clearTransfer } = useWorkspace();
  const [engine, setEngine] = useState<BatchEngineId>('compress');
  const [activeQueue, setActiveQueue] = useState<'A' | 'B' | 'C'>('A');
  const [queues, setQueues] = useState<Record<'A' | 'B' | 'C', QueueItem[]>>({
    A: [],
    B: [],
    C: [],
  });

  // Parameters
  const [compressQuality, setCompressQuality] = useState(0.66);
  const [splitN, setSplitN] = useState(1);
  const [rotateDeg, setRotateDeg] = useState(90);
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [headerText, setHeaderText] = useState('{filename} • {date}');
  const [footerText, setFooterText] = useState('Page {page} of {pages}');
  const [batesPrefix, setBatesPrefix] = useState('BATES-');
  const [extractRange, setExtractRange] = useState('1-2');
  const [renamePattern, setRenamePattern] = useState('{index}_{name}');
  const [authorOverride, setAuthorOverride] = useState('');
  const [targetPageSize, setTargetPageSize] = useState<'a4' | 'letter'>('a4');
  const [imgOutFormat, setImgOutFormat] = useState<'png' | 'jpg'>('png');
  const [textFormat, setTextFormat] = useState<'txt' | 'md'>('txt');

  const [running, setRunning] = useState(false);
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const items = queues[activeQueue];
  const engineMeta = BATCH_ENGINES.find((e) => e.id === engine)!;

  useEffect(() => {
    if (transfer?.files?.length) {
      addFiles(transfer.files);
      clearTransfer();
    }
  }, [transfer]);

  const addFiles = (files: File[]) => {
    const newItems: QueueItem[] = files.map((f, idx) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}_${idx}`,
      file: f,
      relPath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      origSize: f.size,
      status: 'queued',
    }));
    setQueues((prev) => ({
      ...prev,
      [activeQueue]: [...prev[activeQueue], ...newItems],
    }));
  };

  const updateItem = (qKey: 'A' | 'B' | 'C', id: string, patch: Partial<QueueItem>) => {
    setQueues((prev) => ({
      ...prev,
      [qKey]: prev[qKey].map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const formatOutName = (origName: string, idx: number, suffix: string, ext = 'pdf') => {
    const base = safeBase(origName);
    const date = new Date().toISOString().slice(0, 10);
    const formatted = renamePattern
      .replace(/\{index\}/gi, String(idx + 1).padStart(3, '0'))
      .replace(/\{name\}/gi, base)
      .replace(/\{op\}/gi, suffix)
      .replace(/\{date\}/gi, date);
    return `${formatted || base}.${ext}`;
  };

  const processSingle = async (it: QueueItem, idx: number): Promise<{ name: string; blob: Blob }[]> => {
    const bytes = await readFileAsBytes(it.file);
    const base = safeBase(it.file.name);

    switch (engine) {
      case 'compress': {
        const res = await compressPdf(bytes, { mode: 'auto', quality: compressQuality });
        return [{ name: `${base}_compressed.pdf`, blob: new Blob([res.bytes as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'split': {
        const { zipBlob } = await splitPdfToZip(bytes, it.file.name, splitN <= 1 ? 'single' : 'every-n', splitN);
        return [{ name: `${base}_split.zip`, blob: zipBlob }];
      }
      case 'rotate': {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + rotateDeg) % 360)));
        const out = await doc.save({ useObjectStreams: true });
        return [{ name: `${base}_rot${rotateDeg}.pdf`, blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'watermark': {
        const out = await stampPdf(bytes, { filename: it.file.name, watermarkText: wmText });
        return [{ name: `${base}_wm.pdf`, blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'numbers': {
        const out = await stampPdf(bytes, {
          filename: it.file.name,
          pageNumberFormat: 'bates',
          batesPrefix,
          batesStart: idx * 100 + 1,
        });
        return [{ name: `${base}_numbered.pdf`, blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'stamp': {
        const out = await stampPdf(bytes, {
          filename: it.file.name,
          headerText,
          footerText,
        });
        return [{ name: `${base}_stamped.pdf`, blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'grayscale': {
        const res = await compressPdf(bytes, { mode: 'raster', colorMode: 'grayscale', quality: 0.78 });
        return [{ name: `${base}_grayscale.pdf`, blob: new Blob([res.bytes as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'flatten': {
        const res = await compressPdf(bytes, { mode: 'lossless', flattenForms: true, stripMetadata: true });
        return [{ name: `${base}_flattened.pdf`, blob: new Blob([res.bytes as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'resize': {
        const out = await layoutPdf(bytes, { mode: 'resize', targetSize: targetPageSize });
        return [{ name: `${base}_${targetPageSize}.pdf`, blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'extract': {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const keep = parsePageRanges(extractRange, src.getPageCount());
        const out = await PDFDocument.create();
        const copied = await out.copyPages(src, keep.map((p) => p - 1));
        copied.forEach((p) => out.addPage(p));
        const res = await out.save({ useObjectStreams: true });
        return [{ name: `${base}_extracted.pdf`, blob: new Blob([res as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'metadata': {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        doc.setAuthor(authorOverride);
        doc.setTitle(authorOverride ? `${base}` : '');
        doc.setSubject('');
        doc.setKeywords([]);
        const out = await doc.save({ useObjectStreams: true });
        return [{ name: `${base}_meta.pdf`, blob: new Blob([out as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'rename': {
        return [{ name: formatOutName(it.file.name, idx, 'pdf'), blob: it.file }];
      }
      case 'img2pdf': {
        const pdfBytes = await imagesToPdf([it.file], { pageSize: targetPageSize });
        return [{ name: `${base}.pdf`, blob: new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }) }];
      }
      case 'pdf2img': {
        const res = await convertPdfToOutputs(bytes, it.file.name, imgOutFormat, 1.5);
        return [{ name: res.downloadName, blob: res.blob }];
      }
      case 'text': {
        const { pages } = await extractPdfTextAndSearch(bytes);
        const content =
          textFormat === 'md'
            ? pages.map((p) => `## Page ${p.page}\n\n${p.text}`).join('\n\n')
            : pages.map((p) => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
        return [{ name: `${base}.${textFormat}`, blob: new Blob([content], { type: 'text/plain' }) }];
      }
      default:
        return [];
    }
  };

  const runBatch = async () => {
    const qKey = activeQueue;
    const list = queues[qKey];
    if (!list.length) return;
    setRunning(true);
    setPaused(false);
    pausedRef.current = false;
    cancelledRef.current = false;

    if (engine === 'merge') {
      try {
        const out = await PDFDocument.create();
        for (let i = 0; i < list.length; i++) {
          if (cancelledRef.current) break;
          updateItem(qKey, list[i].id, { status: 'running' });
          const bytes = await readFileAsBytes(list[i].file);
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const copied = await out.copyPages(src, src.getPageIndices());
          copied.forEach((p) => out.addPage(p));
          updateItem(qKey, list[i].id, { status: 'done', outSize: list[i].origSize });
        }
        if (!cancelledRef.current) {
          const merged = await out.save({ useObjectStreams: true });
          const blob = new Blob([merged as unknown as BlobPart], { type: 'application/pdf' });
          updateItem(qKey, list[0].id, {
            outputs: [{ name: `merged_queue_${qKey}.pdf`, blob }],
            outSize: merged.byteLength,
          });
          downloadBlob(blob, `merged_queue_${qKey}.pdf`);
        }
      } catch (e) {
        updateItem(qKey, list[0].id, { status: 'error', error: (e as Error).message });
      } finally {
        setRunning(false);
      }
      return;
    }

    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (cancelledRef.current) break;
      while (pausedRef.current && !cancelledRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelledRef.current) break;
      if (it.status === 'done' && it.outputs?.length) continue;
      updateItem(qKey, it.id, { status: 'running', error: undefined });
      try {
        const outputs = await processSingle(it, i);
        const totalOut = outputs.reduce((s, o) => s + o.blob.size, 0);
        updateItem(qKey, it.id, { status: 'done', outputs, outSize: totalOut });
      } catch (err) {
        updateItem(qKey, it.id, { status: 'error', error: (err as Error).message });
      }
    }
    setRunning(false);
  };

  const downloadAllZip = async () => {
    const done = items.filter((i) => i.status === 'done' && i.outputs?.length);
    if (!done.length) return;
    const zip = new JSZip();
    done.forEach((it) => {
      it.outputs!.forEach((o) => zip.file(o.name, o.blob));
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `anik_pdf_batch_${engine}_queue_${activeQueue}.zip`);
  };

  const totalOrig = items.reduce((s, i) => s + i.origSize, 0);
  const doneCount = items.filter((i) => i.status === 'done').length;
  const totalOut = items.reduce((s, i) => s + (i.outSize ?? 0), 0);

  return (
    <div>
      <ToolHeader
        tool={tool}
        extra={
          <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">
            {(['A', 'B', 'C'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setActiveQueue(q)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  activeQueue === q
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--ink-2)] hover:bg-[var(--surface)]'
                }`}
              >
                Queue {q} ({queues[q].length})
              </button>
            ))}
          </div>
        }
      />

      {/* 16 Engine Selector Grid */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
        {BATCH_ENGINES.map((eng) => {
          const active = engine === eng.id;
          return (
            <button
              key={eng.id}
              type="button"
              onClick={() => setEngine(eng.id)}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]'
              }`}
            >
              <div className="text-xs font-bold text-[var(--ink)]">{eng.label}</div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)]">{eng.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Panel title="Add Files to Queue">
            <FileDropzone
              accept={engineMeta.accept}
              multiple
              compact
              onFiles={addFiles}
              label={`Drop ${engine === 'img2pdf' ? 'Images' : 'PDFs'} into Queue ${activeQueue}`}
              hint="Supports multi-file select or folder upload"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-3)]"
              >
                <FolderUp className="h-3.5 w-3.5" /> Upload Folder
              </button>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error webkitdirectory is non-standard but supported in Chromium/Firefox
                webkitdirectory=""
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => setQueues((p) => ({ ...p, [activeQueue]: [] }))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </Panel>

          <Panel title="Engine Parameters">
            <div className="space-y-3 text-xs">
              {engine === 'compress' && (
                <div>
                  <label className="mb-1 flex justify-between font-semibold">
                    <span>Render Quality</span>
                    <span className="font-mono">{Math.round(compressQuality * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.25}
                    max={0.95}
                    step={0.05}
                    value={compressQuality}
                    onChange={(e) => setCompressQuality(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              )}
              {engine === 'split' && (
                <div>
                  <label className="mb-1 block font-semibold">Pages per split chunk</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={splitN}
                    onChange={(e) => setSplitN(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                  />
                </div>
              )}
              {engine === 'rotate' && (
                <div>
                  <label className="mb-1 block font-semibold">Rotation Angle</label>
                  <select
                    value={rotateDeg}
                    onChange={(e) => setRotateDeg(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <option value={90}>90° Clockwise</option>
                    <option value={180}>180° Flip</option>
                    <option value={270}>270° Counter-Clockwise</option>
                  </select>
                </div>
              )}
              {engine === 'watermark' && (
                <div>
                  <label className="mb-1 block font-semibold">Diagonal Watermark Text</label>
                  <input
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
              )}
              {engine === 'numbers' && (
                <div>
                  <label className="mb-1 block font-semibold">Bates Prefix</label>
                  <input
                    value={batesPrefix}
                    onChange={(e) => setBatesPrefix(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                  />
                </div>
              )}
              {engine === 'stamp' && (
                <>
                  <div>
                    <label className="mb-1 block font-semibold">Header ({`{filename}, {date}, {page}`})</label>
                    <input
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Footer</label>
                    <input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    />
                  </div>
                </>
              )}
              {engine === 'extract' && (
                <div>
                  <label className="mb-1 block font-semibold">Page Ranges (e.g. 1-2, last)</label>
                  <input
                    value={extractRange}
                    onChange={(e) => setExtractRange(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                  />
                </div>
              )}
              {engine === 'rename' && (
                <div>
                  <label className="mb-1 block font-semibold">Naming Pattern</label>
                  <input
                    value={renamePattern}
                    onChange={(e) => setRenamePattern(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                  />
                  <div className="mt-1 text-[11px] text-[var(--muted)]">
                    Tokens: {`{index}`}, {`{name}`}, {`{date}`}
                  </div>
                </div>
              )}
              {engine === 'metadata' && (
                <div>
                  <label className="mb-1 block font-semibold">Author Override (blank to strip)</label>
                  <input
                    value={authorOverride}
                    onChange={(e) => setAuthorOverride(e.target.value)}
                    placeholder="Leave empty to strip Title/Subject/Author"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
              )}
              {(engine === 'resize' || engine === 'img2pdf') && (
                <div>
                  <label className="mb-1 block font-semibold">Target Page Size</label>
                  <select
                    value={targetPageSize}
                    onChange={(e) => setTargetPageSize(e.target.value as 'a4' | 'letter')}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <option value="a4">A4 (595 x 842 pt)</option>
                    <option value="letter">US Letter (612 x 792 pt)</option>
                  </select>
                </div>
              )}
              {engine === 'pdf2img' && (
                <div>
                  <label className="mb-1 block font-semibold">Image Format</label>
                  <select
                    value={imgOutFormat}
                    onChange={(e) => setImgOutFormat(e.target.value as 'png' | 'jpg')}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <option value="png">PNG (Sharp text)</option>
                    <option value="jpg">JPG (Compact)</option>
                  </select>
                </div>
              )}
              {engine === 'text' && (
                <div>
                  <label className="mb-1 block font-semibold">Export Format</label>
                  <select
                    value={textFormat}
                    onChange={(e) => setTextFormat(e.target.value as 'txt' | 'md')}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <option value="txt">Plain Text (.txt)</option>
                    <option value="md">Markdown (.md)</option>
                  </select>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={!items.length || running}
                  onClick={runBatch}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
                >
                  <Play className="h-3.5 w-3.5" /> {running ? 'Processing...' : `Run Batch (${items.length})`}
                </button>
                {running && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        pausedRef.current = !pausedRef.current;
                        setPaused(pausedRef.current);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold"
                    >
                      <Pause className="h-3.5 w-3.5" /> {paused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        cancelledRef.current = true;
                        pausedRef.current = false;
                        setPaused(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--danger)] px-3 py-2 text-xs font-semibold text-[var(--danger)]"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-8">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Queued Files" value={items.length} sub={`Queue ${activeQueue}`} />
            <StatTile label="Completed" value={`${doneCount} / ${items.length}`} />
            <StatTile
              label="Total Bytes"
              value={totalOut > 0 ? fmtBytes(totalOut) : fmtBytes(totalOrig)}
              sub={totalOrig > 0 && totalOut > 0 ? `Input ${fmtBytes(totalOrig)}` : undefined}
            />
          </div>

          <Panel
            title={`Queue ${activeQueue} Files`}
            actions={
              <button
                type="button"
                disabled={!doneCount}
                onClick={downloadAllZip}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> Download All ZIP ({doneCount})
              </button>
            }
          >
            {items.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--muted)]">
                Add multiple PDFs or images on the left to start Queue {activeQueue}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                      <th className="py-2 pr-3 font-medium">File</th>
                      <th className="py-2 pr-3 text-right font-medium">Input</th>
                      <th className="py-2 pr-3 text-right font-medium">Output</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-[var(--surface-2)]/60">
                        <td className="py-2.5 pr-3 font-medium text-[var(--ink)]">{it.relPath}</td>
                        <td className="num py-2.5 pr-3 text-right font-mono text-[var(--muted)]">
                          {fmtBytes(it.origSize)}
                        </td>
                        <td className="num py-2.5 pr-3 text-right font-mono text-[var(--ink)]">
                          {it.outSize ? fmtBytes(it.outSize) : '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          {it.status === 'done' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                            </span>
                          )}
                          {it.status === 'running' && (
                            <span className="font-semibold text-[var(--accent)]">Processing...</span>
                          )}
                          {it.status === 'queued' && <span className="text-[var(--muted)]">Queued</span>}
                          {it.status === 'error' && (
                            <span className="text-[var(--danger)]" title={it.error}>
                              Error: {it.error}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {it.outputs?.[0] && (
                              <button
                                type="button"
                                onClick={() => downloadBlob(it.outputs![0].blob, it.outputs![0].name)}
                                className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--accent-ink)]"
                              >
                                Save
                              </button>
                            )}
                            {it.status === 'error' && (
                              <button
                                type="button"
                                onClick={() => updateItem(activeQueue, it.id, { status: 'queued' })}
                                className="rounded-md border border-[var(--line)] p-1 text-[var(--ink-2)]"
                                title="Retry"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setQueues((p) => ({
                                  ...p,
                                  [activeQueue]: p[activeQueue].filter((x) => x.id !== it.id),
                                }))
                              }
                              className="rounded-md p-1 text-[var(--muted)] hover:text-[var(--danger)]"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
