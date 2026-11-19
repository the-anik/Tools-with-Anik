import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Download, RotateCw, FlipHorizontal, FlipVertical, Sparkles, Wand2, Send } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, FileDropzone, Panel, StatTile, CopyButton } from '../ui/SharedUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  applyChromaKey,
  applyImageFilters,
  autoEnhanceCanvas,
  compressCanvasToTargetKb,
  DEFAULT_FILTERS,
  encodeGifFromCanvases,
  extractDominantPalette,
  fileToCanvas,
  frameImageCanvas,
  ImageFilters,
  inspectTransparency,
  vectorizeCanvasToSvg,
} from '../../utils/imageEngine';
import { canvasToBlob, downloadBlob, downloadText } from '../../utils/download';
import { fmtBytes, safeBase } from '../../utils/formatters';

export function ImageStudioWorkspace({ tool }: { tool: ToolDef }) {
  const { transfer, clearTransfer, navigateToTool } = useWorkspace();
  const [activeTab, setActiveTab] = useState(tool.tab || 'editor');
  const [files, setFiles] = useState<File[]>([]);
  const [srcCanvas, setSrcCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [outBytes, setOutBytes] = useState<number>(0);

  // Convert & Compress
  const [outMime, setOutMime] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/webp');
  const [quality, setQuality] = useState(0.84);
  const [targetKb, setTargetKb] = useState(0);

  // Transform / Resize / Crop
  const [resizeW, setResizeW] = useState(1200);
  const [resizeH, setResizeH] = useState(0);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropPct, setCropPct] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [aspectPreset, setAspectPreset] = useState<'free' | '1:1' | '16:9' | '4:5' | '9:16'>('free');

  // Editor Filters
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);
  const [enhanced, setEnhanced] = useState(false);

  // Frames
  const [frameStyle, setFrameStyle] = useState<'gallery' | 'polaroid' | 'mac' | 'rounded'>('mac');
  const [framePad, setFramePad] = useState(32);
  const [frameBg, setFrameBg] = useState('#ffffff');

  // Watermark / Meme / Blur / Annotate
  const [wmText, setWmText] = useState('© Tools with Anik');
  const [memeTop, setMemeTop] = useState('WHEN THE BUILD');
  const [memeBot, setMemeBot] = useState('PASSES FIRST TRY');
  const [drawMode, setDrawMode] = useState<'none' | 'pen' | 'blur' | 'erase'>('pen');
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(18);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // BG Remove
  const [chromaHex, setChromaHex] = useState('#ffffff');
  const [chromaTol, setChromaTol] = useState(38);

  // Inspect / Palette / Vector
  const [palette, setPalette] = useState<string[]>([]);
  const [alphaInfo, setAlphaInfo] = useState<{ transparentPct: number; transparentPixels: number; opaquePixels: number } | null>(null);
  const [vectorThreshold, setVectorThreshold] = useState(128);
  const [vectorColor, setVectorColor] = useState('#0f172a');
  const [svgOutput, setSvgOutput] = useState('');

  // Grid / Collage / GIF
  const [gridRows, setGridRows] = useState(3);
  const [gifDelay, setGifDelay] = useState(45);

  useEffect(() => {
    setActiveTab(tool.tab || 'editor');
  }, [tool.id, tool.tab]);

  useEffect(() => {
    if (transfer?.files?.length) {
      loadFiles(transfer.files);
      clearTransfer();
    }
  }, [transfer]);

  const loadFiles = async (incoming: File[]) => {
    const imgs = incoming.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setFiles(imgs);
    const canvas = await fileToCanvas(imgs[0]);
    setSrcCanvas(canvas);
    setResizeW(canvas.width);
    setResizeH(canvas.height);
    setPalette(extractDominantPalette(canvas, 6));
    setAlphaInfo(inspectTransparency(canvas));
  };

  // Recompute rendered canvas whenever params change
  const buildProcessedCanvas = (): HTMLCanvasElement | null => {
    if (!srcCanvas) return null;
    let cur = enhanced ? autoEnhanceCanvas(srcCanvas) : srcCanvas;
    cur = applyImageFilters(cur, filters, rotateDeg, flipH, flipV);

    if (activeTab === 'bgremove') {
      cur = applyChromaKey(cur, chromaHex, chromaTol);
    }

    // Crop or Aspect Ratio
    if (activeTab === 'transform') {
      const l = Math.round((cropPct.left / 100) * cur.width);
      const r = Math.round((cropPct.right / 100) * cur.width);
      const t = Math.round((cropPct.top / 100) * cur.height);
      const b = Math.round((cropPct.bottom / 100) * cur.height);
      let cw = Math.max(16, cur.width - l - r);
      let ch = Math.max(16, cur.height - t - b);
      let cx = l;
      let cy = t;
      if (aspectPreset !== 'free') {
        const [aw, ah] = aspectPreset.split(':').map(Number);
        const ratio = aw / ah;
        if (cw / ch > ratio) {
          const nw = Math.round(ch * ratio);
          cx += Math.round((cw - nw) / 2);
          cw = nw;
        } else {
          const nh = Math.round(cw / ratio);
          cy += Math.round((ch - nh) / 2);
          ch = nh;
        }
      }
      const cropped = document.createElement('canvas');
      cropped.width = resizeW > 0 ? resizeW : cw;
      cropped.height = resizeH > 0 ? resizeH : Math.round((cw ? ch / cw : 1) * cropped.width);
      cropped.getContext('2d')!.drawImage(cur, cx, cy, cw, ch, 0, 0, cropped.width, cropped.height);
      cur = cropped;
    }

    if (activeTab === 'frame') {
      cur = frameImageCanvas(cur, frameStyle, framePad, frameBg);
    }

    if (activeTab === 'annotate') {
      const annotated = document.createElement('canvas');
      annotated.width = cur.width;
      annotated.height = cur.height;
      const ctx = annotated.getContext('2d')!;
      ctx.drawImage(cur, 0, 0);
      if (tool.id === 'img-watermark' && wmText.trim()) {
        ctx.save();
        ctx.font = `bold ${Math.max(20, Math.round(cur.width * 0.05))}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.strokeStyle = 'rgba(15,23,42,0.4)';
        ctx.lineWidth = 2;
        ctx.translate(cur.width / 2, cur.height / 2);
        ctx.rotate(-0.45);
        ctx.textAlign = 'center';
        ctx.strokeText(wmText, 0, 0);
        ctx.fillText(wmText, 0, 0);
        ctx.restore();
      }
      if (tool.id === 'img-meme') {
        const fs = Math.max(22, Math.round(cur.width * 0.075));
        ctx.font = `900 ${fs}px Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(3, Math.round(fs * 0.12));
        if (memeTop.trim()) {
          ctx.strokeText(memeTop, cur.width / 2, fs + 12);
          ctx.fillText(memeTop, cur.width / 2, fs + 12);
        }
        if (memeBot.trim()) {
          ctx.strokeText(memeBot, cur.width / 2, cur.height - 18);
          ctx.fillText(memeBot, cur.width / 2, cur.height - 18);
        }
      }
      if (drawCanvasRef.current && drawCanvasRef.current.width === cur.width && drawCanvasRef.current.height === cur.height) {
        ctx.drawImage(drawCanvasRef.current, 0, 0);
      }
      cur = annotated;
    }

    return cur;
  };

  useEffect(() => {
    const out = buildProcessedCanvas();
    if (!out) return;
    if (drawCanvasRef.current && (drawCanvasRef.current.width !== out.width || drawCanvasRef.current.height !== out.height)) {
      drawCanvasRef.current.width = out.width;
      drawCanvasRef.current.height = out.height;
    }
    let cancelled = false;
    (async () => {
      const { blob } = await compressCanvasToTargetKb(out, outMime, targetKb, quality);
      if (cancelled) return;
      setOutBytes(blob.size);
      setPreviewUrl(URL.createObjectURL(blob));
      if (activeTab === 'vector') {
        setSvgOutput(vectorizeCanvasToSvg(out, vectorThreshold, vectorColor));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    srcCanvas,
    activeTab,
    outMime,
    quality,
    targetKb,
    resizeW,
    resizeH,
    rotateDeg,
    flipH,
    flipV,
    cropPct,
    aspectPreset,
    filters,
    enhanced,
    frameStyle,
    framePad,
    frameBg,
    wmText,
    memeTop,
    memeBot,
    chromaHex,
    chromaTol,
    vectorThreshold,
    vectorColor,
  ]);

  const handleDownload = async () => {
    const out = buildProcessedCanvas();
    if (!out || !files[0]) return;
    const base = safeBase(files[0].name);
    if (activeTab === 'vector' && svgOutput) {
      downloadText(svgOutput, `${base}.svg`, 'image/svg+xml');
      return;
    }
    const ext = outMime === 'image/png' ? 'png' : outMime === 'image/webp' ? 'webp' : 'jpg';
    const { blob } = await compressCanvasToTargetKb(out, outMime, targetKb, quality);
    downloadBlob(blob, `${base}_edited.${ext}`);
  };

  const handleExportIconsZip = async () => {
    if (!srcCanvas) return;
    const sizes = tool.id === 'img-favicon' ? [16, 32, 48, 64, 180] : [72, 96, 128, 144, 152, 192, 384, 512];
    const zip = new JSZip();
    for (const sz of sizes) {
      const c = document.createElement('canvas');
      c.width = sz;
      c.height = sz;
      c.getContext('2d')!.drawImage(srcCanvas, 0, 0, sz, sz);
      zip.file(`icon-${sz}x${sz}.png`, await canvasToBlob(c, 'image/png', 1));
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${tool.id}_pack.zip`);
  };

  const handleExportGridZip = async () => {
    if (!srcCanvas) return;
    const cols = 3;
    const cw = Math.floor(srcCanvas.width / cols);
    const ch = Math.floor(srcCanvas.height / gridRows);
    const zip = new JSZip();
    let idx = 1;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = document.createElement('canvas');
        tile.width = cw;
        tile.height = ch;
        tile.getContext('2d')!.drawImage(srcCanvas, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
        zip.file(`ig_tile_${idx++}.png`, await canvasToBlob(tile, 'image/png', 1));
      }
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `ig_${cols}x${gridRows}_grid.zip`);
  };

  const handleExportCollageOrStitch = async (mode: 'collage' | 'stitch') => {
    if (!files.length) return;
    const canvases = await Promise.all(files.map(fileToCanvas));
    const out = document.createElement('canvas');
    if (mode === 'stitch') {
      const maxW = Math.max(...canvases.map((c) => c.width));
      const totalH = canvases.reduce((s, c) => s + c.height, 0);
      out.width = maxW;
      out.height = totalH;
      const ctx = out.getContext('2d')!;
      let y = 0;
      for (const c of canvases) {
        ctx.drawImage(c, 0, y);
        y += c.height;
      }
    } else {
      const cols = canvases.length <= 2 ? canvases.length : canvases.length <= 4 ? 2 : 3;
      const rows = Math.ceil(canvases.length / cols);
      const cellW = 540;
      const cellH = 540;
      const gap = 16;
      out.width = cols * cellW + (cols + 1) * gap;
      out.height = rows * cellH + (rows + 1) * gap;
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      canvases.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.drawImage(c, gap + col * (cellW + gap), gap + row * (cellH + gap), cellW, cellH);
      });
    }
    downloadBlob(await canvasToBlob(out, 'image/png', 0.94), `${mode}_${Date.now()}.png`);
  };

  const handleExportGif = async () => {
    if (!files.length) return;
    const frames = await Promise.all(files.map(fileToCanvas));
    const gifBlob = encodeGifFromCanvases(frames, gifDelay);
    downloadBlob(gifBlob, `animated_${Date.now()}.gif`);
  };

  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawCanvasRef.current || !srcCanvas) return;
    const overlay = drawCanvasRef.current;
    const rect = overlay.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * overlay.width;
    const y = ((e.clientY - rect.top) / rect.height) * overlay.height;
    const ctx = overlay.getContext('2d')!;
    if (drawMode === 'pen') {
      ctx.fillStyle = drawColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (drawMode === 'blur') {
      // Pixelate block stamp
      const s = Math.max(8, Math.round(brushSize / 2));
      ctx.fillStyle = 'rgba(15,23,42,0.75)';
      ctx.fillRect(x - brushSize, y - brushSize, brushSize * 2, brushSize * 2);
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.fillRect(x - s, y - s, s, s);
    } else if (drawMode === 'erase') {
      ctx.clearRect(x - brushSize, y - brushSize, brushSize * 2, brushSize * 2);
    }
  };

  return (
    <div>
      <ToolHeader
        tool={tool}
        extra={
          srcCanvas && (
            <button
              type="button"
              onClick={() => navigateToTool('pdf-convert', { files })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            >
              <Send className="h-3.5 w-3.5" /> Send to PDF
            </button>
          )
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['convert', 'Convert'],
          ['compress', 'Compress / Target KB'],
          ['transform', 'Resize / Crop / Rotate'],
          ['editor', 'Filters & Enhance'],
          ['frame', 'Frames & Mockups'],
          ['annotate', 'Watermark / Meme / Blur'],
          ['bgremove', 'BG Remover'],
          ['inspect', 'Palette & Inspect'],
          ['icons', 'Favicon / PWA'],
          ['collage', 'IG Grid / Collage'],
          ['gif', 'GIF Studio'],
          ['vector', 'SVG Vectorize'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === id
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!srcCanvas ? (
        <FileDropzone
          accept="image/*"
          multiple
          onFiles={loadFiles}
          label="Drop image(s) here (PNG, JPG, WebP, GIF, BMP)"
          hint="Select multiple images for GIF Maker, Collage, or Screenshot Stitcher"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="space-y-4 lg:col-span-5">
            <Panel
              title="Controls"
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setSrcCanvas(null);
                    setPreviewUrl('');
                  }}
                  className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Change Image
                </button>
              }
            >
              <div className="space-y-3 text-xs">
                {(activeTab === 'convert' || activeTab === 'compress') && (
                  <>
                    <div>
                      <label className="mb-1 block font-semibold">Output Format</label>
                      <select
                        value={outMime}
                        onChange={(e) => setOutMime(e.target.value as typeof outMime)}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                      >
                        <option value="image/webp">WebP (Smallest modern web)</option>
                        <option value="image/jpeg">JPG (Universal photo)</option>
                        <option value="image/png">PNG (Lossless transparency)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 flex justify-between font-semibold">
                        <span>Quality</span>
                        <span className="font-mono">{Math.round(quality * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min={0.15}
                        max={1}
                        step={0.05}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold">Target Size KB (0 = manual quality)</label>
                      <input
                        type="number"
                        min={0}
                        value={targetKb}
                        onChange={(e) => setTargetKb(Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'transform' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block font-semibold">Width (px)</label>
                        <input
                          type="number"
                          value={resizeW}
                          onChange={(e) => setResizeW(Math.max(16, Number(e.target.value)))}
                          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold">Height (px, 0=auto)</label>
                        <input
                          type="number"
                          value={resizeH}
                          onChange={(e) => setResizeH(Math.max(0, Number(e.target.value)))}
                          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setRotateDeg((d) => (d + 90) % 360)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold"
                      >
                        <RotateCw className="h-3.5 w-3.5" /> Rotate +90°
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlipH((f) => !f)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold"
                      >
                        <FlipHorizontal className="h-3.5 w-3.5" /> Flip H
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlipV((f) => !f)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold"
                      >
                        <FlipVertical className="h-3.5 w-3.5" /> Flip V
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold">Aspect Ratio Preset</label>
                      <select
                        value={aspectPreset}
                        onChange={(e) => setAspectPreset(e.target.value as typeof aspectPreset)}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                      >
                        <option value="free">Free / Original</option>
                        <option value="1:1">1:1 Square (Avatar / IG)</option>
                        <option value="16:9">16:9 Widescreen (YouTube)</option>
                        <option value="4:5">4:5 Portrait</option>
                        <option value="9:16">9:16 Story / Reel</option>
                      </select>
                    </div>
                    {(['top', 'right', 'bottom', 'left'] as const).map((s) => (
                      <div key={s}>
                        <label className="flex justify-between capitalize font-semibold">
                          <span>Crop {s}</span>
                          <span className="font-mono">{cropPct[s]}%</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={40}
                          value={cropPct[s]}
                          onChange={(e) => setCropPct((c) => ({ ...c, [s]: Number(e.target.value) }))}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                    ))}
                  </>
                )}

                {activeTab === 'editor' && (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEnhanced((v) => !v)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 font-semibold ${
                          enhanced ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'border-[var(--line)]'
                        }`}
                      >
                        <Wand2 className="h-3.5 w-3.5" /> Auto Enhance {enhanced ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters(DEFAULT_FILTERS);
                          setEnhanced(false);
                        }}
                        className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold"
                      >
                        Reset
                      </button>
                    </div>
                    {(
                      [
                        ['brightness', 'Brightness', 30, 200],
                        ['contrast', 'Contrast', 30, 200],
                        ['saturation', 'Saturation', 0, 200],
                        ['sharpen', 'Sharpen', 0, 100],
                        ['grayscale', 'Grayscale', 0, 100],
                        ['sepia', 'Sepia', 0, 100],
                        ['blur', 'Blur (px)', 0, 10],
                      ] as const
                    ).map(([key, label, min, max]) => (
                      <div key={key}>
                        <label className="flex justify-between font-semibold">
                          <span>{label}</span>
                          <span className="font-mono">{filters[key]}</span>
                        </label>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          value={filters[key]}
                          onChange={(e) => setFilters((f) => ({ ...f, [key]: Number(e.target.value) }))}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                    ))}
                  </>
                )}

                {activeTab === 'frame' && (
                  <>
                    <select
                      value={frameStyle}
                      onChange={(e) => setFrameStyle(e.target.value as typeof frameStyle)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <option value="mac">macOS Window Mockup</option>
                      <option value="polaroid">Polaroid Classic Frame</option>
                      <option value="gallery">Gallery Border Padding</option>
                      <option value="rounded">Smooth Rounded Corners</option>
                    </select>
                    <label className="flex justify-between font-semibold">
                      <span>Padding (px)</span>
                      <span className="font-mono">{framePad}px</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={96}
                      value={framePad}
                      onChange={(e) => setFramePad(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Frame Background:</span>
                      <input type="color" value={frameBg} onChange={(e) => setFrameBg(e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'annotate' && (
                  <>
                    <div>
                      <label className="mb-1 block font-semibold">Watermark Text</label>
                      <input
                        value={wmText}
                        onChange={(e) => setWmText(e.target.value)}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                      />
                    </div>
                    {tool.id === 'img-meme' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={memeTop}
                          onChange={(e) => setMemeTop(e.target.value)}
                          placeholder="Top caption"
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2"
                        />
                        <input
                          value={memeBot}
                          onChange={(e) => setMemeBot(e.target.value)}
                          placeholder="Bottom caption"
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(['pen', 'blur', 'erase'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDrawMode(m)}
                          className={`rounded-lg border px-3 py-1.5 font-semibold capitalize ${
                            drawMode === m ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)]'
                          }`}
                        >
                          {m === 'blur' ? 'Redact / Blur' : m}
                        </button>
                      ))}
                      <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'bgremove' && (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">Target Chroma Color:</span>
                      <input type="color" value={chromaHex} onChange={(e) => setChromaHex(e.target.value)} />
                      <span className="font-mono">{chromaHex}</span>
                    </div>
                    <label className="flex justify-between font-semibold">
                      <span>Tolerance</span>
                      <span className="font-mono">{chromaTol}</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={120}
                      value={chromaTol}
                      onChange={(e) => setChromaTol(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <p className="text-[var(--muted)]">Tip: Switch Output Format to PNG to preserve transparent cutouts.</p>
                  </>
                )}

                {activeTab === 'inspect' && (
                  <div className="space-y-3">
                    <div className="font-semibold">Dominant Color Palette</div>
                    <div className="flex flex-wrap gap-2">
                      {palette.map((hex) => (
                        <div key={hex} className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2 py-1">
                          <span className="h-4 w-4 rounded" style={{ backgroundColor: hex }} />
                          <span className="font-mono text-[11px]">{hex}</span>
                        </div>
                      ))}
                    </div>
                    {alphaInfo && (
                      <div className="rounded-lg bg-[var(--surface-2)] p-3 font-mono text-[11px] space-y-1">
                        <div>Transparent coverage: {alphaInfo.transparentPct.toFixed(2)}%</div>
                        <div>Opaque pixels: {alphaInfo.opaquePixels.toLocaleString()}</div>
                        <div>Transparent pixels: {alphaInfo.transparentPixels.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'icons' && (
                  <button
                    type="button"
                    onClick={handleExportIconsZip}
                    className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-bold text-white"
                  >
                    Generate Icon Pack ZIP (16px – 512px)
                  </button>
                )}

                {activeTab === 'collage' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">IG Grid Rows (×3 cols):</span>
                      <select
                        value={gridRows}
                        onChange={(e) => setGridRows(Number(e.target.value))}
                        className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1"
                      >
                        <option value={1}>3×1 Banner</option>
                        <option value={2}>3×2 Grid</option>
                        <option value={3}>3×3 Full Grid</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleExportGridZip}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-bold text-white"
                      >
                        Slice Grid ZIP
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportCollageOrStitch('collage')}
                        className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold"
                      >
                        Build Collage ({files.length} imgs)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportCollageOrStitch('stitch')}
                        className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] py-2 font-semibold"
                      >
                        Stitch Vertically ({files.length})
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'gif' && (
                  <div className="space-y-2">
                    <label className="flex justify-between font-semibold">
                      <span>Frame Delay (centiseconds)</span>
                      <span className="font-mono">{gifDelay * 10} ms</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={150}
                      value={gifDelay}
                      onChange={(e) => setGifDelay(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={handleExportGif}
                      className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-bold text-white"
                    >
                      Compile Animated GIF ({files.length} frame{files.length > 1 ? 's' : ''})
                    </button>
                  </div>
                )}

                {activeTab === 'vector' && (
                  <div className="space-y-2">
                    <label className="flex justify-between font-semibold">
                      <span>Luminance Cutoff</span>
                      <span className="font-mono">{vectorThreshold}</span>
                    </label>
                    <input
                      type="range"
                      min={30}
                      max={230}
                      value={vectorThreshold}
                      onChange={(e) => setVectorThreshold(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">SVG Fill:</span>
                      <input type="color" value={vectorColor} onChange={(e) => setVectorColor(e.target.value)} />
                      <CopyButton text={svgOutput} label="Copy SVG" />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Download className="h-3.5 w-3.5" /> Download Output ({fmtBytes(outBytes)})
                </button>
              </div>
            </Panel>
          </div>

          {/* Live Canvas Preview */}
          <div className="space-y-4 lg:col-span-7">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Dimensions" value={`${srcCanvas.width}×${srcCanvas.height}`} />
              <StatTile label="Original Size" value={fmtBytes(files[0]?.size || 0)} />
              <StatTile
                label="Output Size"
                value={fmtBytes(outBytes)}
                sub={files[0]?.size && outBytes ? `${Math.round((outBytes / files[0].size) * 100)}% of orig` : undefined}
              />
            </div>

            <Panel title="Live Studio Preview">
              <div className="checkerboard relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] p-4">
                {activeTab === 'vector' && svgOutput ? (
                  <div className="max-h-[440px] w-full flex justify-center" dangerouslySetInnerHTML={{ __html: svgOutput }} />
                ) : (
                  previewUrl && (
                    <div className="relative inline-block">
                      <img src={previewUrl} alt="Studio output" className="max-h-[440px] object-contain" />
                      {activeTab === 'annotate' && (
                        <canvas
                          ref={drawCanvasRef}
                          onPointerDown={(e) => {
                            isDrawingRef.current = true;
                            handleCanvasPointer(e);
                          }}
                          onPointerMove={handleCanvasPointer}
                          onPointerUp={() => {
                            isDrawingRef.current = false;
                          }}
                          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                        />
                      )}
                    </div>
                  )
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
