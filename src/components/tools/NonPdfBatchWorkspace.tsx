import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { Download, Play, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, FileDropzone, Panel, StatTile } from '../ui/SharedUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { applyImageFilters, DEFAULT_FILTERS, fileToCanvas, frameImageCanvas } from '../../utils/imageEngine';
import { crc32, detectMagicMime, shannonEntropy } from '../../utils/barcodeQr';
import { csvToJson, fmtBytes, safeBase } from '../../utils/formatters';
import { canvasToBlob, downloadBlob, readFileAsBytes } from '../../utils/download';

type BatchOp =
  | 'img-convert'
  | 'img-compress'
  | 'img-resize'
  | 'img-rename'
  | 'img-watermark'
  | 'img-crop'
  | 'img-rotate'
  | 'img-border'
  | 'img-strip'
  | 'img-opt'
  | 'file-rename'
  | 'zip-create'
  | 'zip-extract'
  | 'file-org'
  | 'csv-conv'
  | 'json-fmt'
  | 'checksum'
  | 'fmt-conv'
  | 'file-meta';

const OPS: { id: BatchOp; label: string; kind: 'Image' | 'File/Data' }[] = [
  { id: 'img-convert', label: '1. Batch Image Convert', kind: 'Image' },
  { id: 'img-compress', label: '2. Batch Image Compress', kind: 'Image' },
  { id: 'img-resize', label: '3. Batch Image Resize', kind: 'Image' },
  { id: 'img-rename', label: '4. Batch Image Rename', kind: 'Image' },
  { id: 'img-watermark', label: '5. Batch Image Watermark', kind: 'Image' },
  { id: 'img-crop', label: '6. Batch Image Crop (1:1/16:9)', kind: 'Image' },
  { id: 'img-rotate', label: '7. Batch Image Rotate', kind: 'Image' },
  { id: 'img-border', label: '8. Batch Image Border', kind: 'Image' },
  { id: 'img-strip', label: '9. Batch Strip EXIF Metadata', kind: 'Image' },
  { id: 'img-opt', label: '10. Batch Format Optimizer', kind: 'Image' },
  { id: 'file-rename', label: '11. Batch File Renamer', kind: 'File/Data' },
  { id: 'zip-create', label: '12. Batch ZIP Creator', kind: 'File/Data' },
  { id: 'zip-extract', label: '13. Batch ZIP Extractor', kind: 'File/Data' },
  { id: 'file-org', label: '14. Batch Folder Organizer', kind: 'File/Data' },
  { id: 'csv-conv', label: '15. Batch CSV -> JSON', kind: 'File/Data' },
  { id: 'json-fmt', label: '16. Batch JSON Formatter', kind: 'File/Data' },
  { id: 'checksum', label: '17. Batch SHA-256 & CRC-32', kind: 'File/Data' },
  { id: 'fmt-conv', label: '18. Batch Smart Converter', kind: 'File/Data' },
  { id: 'file-meta', label: '19. Batch Metadata Audit', kind: 'File/Data' },
];

export function NonPdfBatchWorkspace({ tool }: { tool: ToolDef }) {
  const { navigateToTool, transfer, clearTransfer } = useWorkspace();
  const [op, setOp] = useState<BatchOp>((tool.tab as BatchOp) || 'img-convert');
  const [files, setFiles] = useState<File[]>([]);
  const [running, setRunning] = useState(false);

  // Shared parameters
  const [targetMime, setTargetMime] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [quality, setQuality] = useState(0.8);
  const [maxWidth, setMaxWidth] = useState(1280);
  const [pattern, setPattern] = useState('{index}_{name}');
  const [wmText, setWmText] = useState('© Tools with Anik');
  const [rotDeg, setRotDeg] = useState(90);

  const [results, setResults] = useState<{ name: string; origSize: number; outSize: number; note: string; blob: Blob }[]>([]);

  useEffect(() => {
    if (tool.tab) setOp(tool.tab as BatchOp);
  }, [tool.id, tool.tab]);

  useEffect(() => {
    if (transfer?.files?.length) {
      setFiles((prev) => [...prev, ...transfer.files!]);
      clearTransfer();
    }
  }, [transfer]);

  const runBatch = async () => {
    if (!files.length) return;
    setRunning(true);
    const out: typeof results = [];

    try {
      if (op === 'zip-create' || op === 'file-org') {
        const zip = new JSZip();
        files.forEach((f) => {
          const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : 'other';
          const path = op === 'file-org' ? `${ext}/${f.name}` : f.name;
          zip.file(path, f);
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        out.push({
          name: op === 'file-org' ? 'organized_by_type.zip' : 'bundle.zip',
          origSize: files.reduce((s, f) => s + f.size, 0),
          outSize: blob.size,
          note: `Packaged ${files.length} files`,
          blob,
        });
        setResults(out);
        setRunning(false);
        return;
      }

      if (op === 'checksum' || op === 'file-meta') {
        const report: Record<string, unknown>[] = [];
        for (const f of files) {
          const b = await readFileAsBytes(f);
          const digest = await crypto.subtle.digest('SHA-256', b.slice());
          const sha256 = Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('');
          const mimeInfo = detectMagicMime(b, f.name);
          report.push({
            file: f.name,
            bytes: f.size,
            sha256,
            crc32: crc32(b),
            magicMime: mimeInfo.mime,
            entropy: Number(shannonEntropy(b).toFixed(3)),
          });
        }
        const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        out.push({
          name: 'batch_audit_manifest.json',
          origSize: files.reduce((s, f) => s + f.size, 0),
          outSize: jsonBlob.size,
          note: `Audited ${files.length} file(s)`,
          blob: jsonBlob,
        });
        setResults(out);
        setRunning(false);
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const base = safeBase(f.name);
        const renamed = pattern
          .replace(/\{index\}/gi, String(i + 1).padStart(3, '0'))
          .replace(/\{name\}/gi, base)
          .replace(/\{date\}/gi, new Date().toISOString().slice(0, 10));

        if (op === 'zip-extract' && f.name.toLowerCase().endsWith('.zip')) {
          const z = await JSZip.loadAsync(await f.arrayBuffer());
          for (const [k, entry] of Object.entries(z.files)) {
            if (entry.dir) continue;
            const b = await entry.async('blob');
            out.push({ name: k, origSize: f.size, outSize: b.size, note: 'Extracted from ZIP', blob: b });
          }
          continue;
        }

        if (op === 'csv-conv' || (op === 'fmt-conv' && f.name.toLowerCase().endsWith('.csv'))) {
          const txt = await f.text();
          const jsonStr = JSON.stringify(csvToJson(txt), null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          out.push({ name: `${base}.json`, origSize: f.size, outSize: blob.size, note: 'CSV -> JSON', blob });
          continue;
        }

        if (op === 'json-fmt') {
          const txt = await f.text();
          const pretty = JSON.stringify(JSON.parse(txt), null, 2);
          const blob = new Blob([pretty], { type: 'application/json' });
          out.push({ name: `${base}_formatted.json`, origSize: f.size, outSize: blob.size, note: 'Prettified', blob });
          continue;
        }

        if (op === 'file-rename' || op === 'img-rename') {
          const ext = f.name.includes('.') ? f.name.split('.').pop() : 'bin';
          out.push({ name: `${renamed}.${ext}`, origSize: f.size, outSize: f.size, note: 'Renamed', blob: f });
          continue;
        }

        // Image batch operations
        if (f.type.startsWith('image/')) {
          let c = await fileToCanvas(f);
          if (op === 'img-resize') {
            const scale = Math.min(1, maxWidth / c.width);
            const r = document.createElement('canvas');
            r.width = Math.max(1, Math.round(c.width * scale));
            r.height = Math.max(1, Math.round(c.height * scale));
            r.getContext('2d')!.drawImage(c, 0, 0, r.width, r.height);
            c = r;
          } else if (op === 'img-crop') {
            const side = Math.min(c.width, c.height);
            const r = document.createElement('canvas');
            r.width = side;
            r.height = side;
            r.getContext('2d')!.drawImage(c, (c.width - side) / 2, (c.height - side) / 2, side, side, 0, 0, side, side);
            c = r;
          } else if (op === 'img-rotate') {
            c = applyImageFilters(c, DEFAULT_FILTERS, rotDeg, false, false);
          } else if (op === 'img-border') {
            c = frameImageCanvas(c, 'gallery', 28, '#ffffff');
          } else if (op === 'img-watermark') {
            const ctx = c.getContext('2d')!;
            ctx.font = `bold ${Math.max(18, Math.round(c.width * 0.045))}px sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 2;
            ctx.fillText(wmText, 24, c.height - 28);
          }
          const mime = op === 'img-opt' ? 'image/webp' : targetMime;
          const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
          const blob = await canvasToBlob(c, mime, quality);
          out.push({ name: `${renamed}.${ext}`, origSize: f.size, outSize: blob.size, note: `Canvas -> ${ext.toUpperCase()}`, blob });
        }
      }
      setResults(out);
    } finally {
      setRunning(false);
    }
  };

  const downloadZip = async () => {
    if (!results.length) return;
    const zip = new JSZip();
    results.forEach((r) => zip.file(r.name, r.blob));
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `anik_batch_${op}.zip`);
  };

  return (
    <div>
      <ToolHeader
        tool={tool}
        extra={
          <button
            type="button"
            onClick={() => navigateToTool('pdf-batch')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]"
          >
            Switch to 16-Engine PDF Batch <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {OPS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOp(o.id)}
            className={`rounded-xl border p-2 text-left text-xs transition-all ${
              op === o.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-bold' : 'border-[var(--line)] bg-[var(--surface)]'
            }`}
          >
            <div className="truncate">{o.label}</div>
            <div className="text-[10px] text-[var(--muted)]">{o.kind}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Panel title="Input Files">
            <FileDropzone
              multiple
              compact
              onFiles={(fs) => setFiles((prev) => [...prev, ...fs])}
              label={`Drop files (${files.length} queued)`}
            />
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setResults([]);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Queue
            </button>
          </Panel>

          <Panel title="Batch Options">
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold">Output Name Pattern</label>
                <input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                />
              </div>
              {op.startsWith('img') && (
                <>
                  <div>
                    <label className="mb-1 block font-semibold">Target Format</label>
                    <select
                      value={targetMime}
                      onChange={(e) => setTargetMime(e.target.value as typeof targetMime)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <option value="image/webp">WebP</option>
                      <option value="image/jpeg">JPG</option>
                      <option value="image/png">PNG</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex justify-between font-semibold">
                      <span>Quality</span>
                      <span className="font-mono">{Math.round(quality * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0.2}
                      max={1}
                      step={0.05}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>
                </>
              )}
              {op === 'img-resize' && (
                <input
                  type="number"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(Number(e.target.value))}
                  placeholder="Max width px"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                />
              )}
              {op === 'img-watermark' && (
                <input
                  value={wmText}
                  onChange={(e) => setWmText(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                />
              )}
              {op === 'img-rotate' && (
                <select
                  value={rotDeg}
                  onChange={(e) => setRotDeg(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                >
                  <option value={90}>90° Clockwise</option>
                  <option value={180}>180° Flip</option>
                  <option value={270}>270° Counter-Clockwise</option>
                </select>
              )}
              <button
                type="button"
                disabled={!files.length || running}
                onClick={runBatch}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2.5 font-bold text-white disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" /> {running ? 'Running...' : `Process ${files.length} File(s)`}
              </button>
            </div>
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-8">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Queued" value={files.length} />
            <StatTile label="Processed" value={results.length} />
            <StatTile label="Output Total" value={fmtBytes(results.reduce((s, r) => s + r.outSize, 0))} />
          </div>

          <Panel
            title="Processed Outputs"
            actions={
              results.length > 0 && (
                <button
                  type="button"
                  onClick={downloadZip}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download All ZIP
                </button>
              )
            }
          >
            {results.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--muted)]">
                Queue files and click Process to view generated outputs here.
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)] text-xs">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-[var(--ink)]">{r.name}</div>
                      <div className="text-[var(--muted)]">{r.note}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[var(--muted)]">{fmtBytes(r.outSize)}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadBlob(r.blob, r.name)}
                        className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent-ink)]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
