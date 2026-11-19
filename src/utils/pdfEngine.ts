import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { parsePageRanges, parseSplitSpec, safeBase } from './formatters';
import { canvasToBlob, loadImageFile } from './download';

// Configure bundled PDF.js worker (zero external CDN dependency)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PdfInspection {
  pageCount: number;
  sizeBytes: number;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  hasFormFields: boolean;
  formFieldCount: number;
  pageDimensions: { page: number; widthPt: number; heightPt: number }[];
}

export async function openPdfJs(bytes: Uint8Array) {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  return await loadingTask.promise;
}

export async function inspectPdf(bytes: Uint8Array): Promise<PdfInspection> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  let formFieldCount = 0;
  try {
    formFieldCount = doc.getForm().getFields().length;
  } catch {
    formFieldCount = 0;
  }
  const pages = doc.getPages();
  return {
    pageCount: pages.length,
    sizeBytes: bytes.byteLength,
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    hasFormFields: formFieldCount > 0,
    formFieldCount,
    pageDimensions: pages.map((p, idx) => {
      const { width, height } = p.getSize();
      return { page: idx + 1, widthPt: Math.round(width), heightPt: Math.round(height) };
    }),
  };
}

export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.25
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

export function isCanvasMostlyBlank(canvas: HTMLCanvasElement, whiteThreshold = 0.992): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let nearWhite = 0;
  const total = canvas.width * canvas.height;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 246 && data[i + 1] > 246 && data[i + 2] > 246) nearWhite++;
  }
  return nearWhite / total >= whiteThreshold;
}

export async function detectWhitespaceMargins(canvas: HTMLCanvasElement): Promise<{
  topPct: number;
  rightPct: number;
  bottomPct: number;
  leftPct: number;
}> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { topPct: 0, rightPct: 0, bottomPct: 0, leftPct: 0 };
  const w = canvas.width;
  const h = canvas.height;
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = 0, maxY = 0;
  let foundInk = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx] < 245 || data[idx + 1] < 245 || data[idx + 2] < 245) {
        foundInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!foundInk) return { topPct: 0, rightPct: 0, bottomPct: 0, leftPct: 0 };
  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  return {
    leftPct: Math.round((minX / w) * 100),
    topPct: Math.round((minY / h) * 100),
    rightPct: Math.round(((w - 1 - maxX) / w) * 100),
    bottomPct: Math.round(((h - 1 - maxY) / h) * 100),
  };
}

function applyCanvasPostProcess(
  srcCanvas: HTMLCanvasElement,
  mode: 'color' | 'grayscale' | 'bw-scan'
): HTMLCanvasElement {
  if (mode === 'color') return srcCanvas;
  const out = document.createElement('canvas');
  out.width = srcCanvas.width;
  out.height = srcCanvas.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(srcCanvas, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = mode === 'bw-scan' ? (lum > 165 ? 255 : 0) : lum;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export async function compressPdf(
  bytes: Uint8Array,
  options: {
    mode: 'auto' | 'smart' | 'raster' | 'lossless';
    quality?: number; // 0.25 .. 0.95
    dpiScale?: number; // 1.0 .. 2.2
    targetKb?: number;
    colorMode?: 'color' | 'grayscale' | 'bw-scan';
    stripMetadata?: boolean;
    flattenForms?: boolean;
    pageRange?: string;
  },
  onProgress?: (pct: number, note: string) => void
): Promise<{ bytes: Uint8Array; modeUsed: string; note: string }> {
  const {
    mode = 'auto',
    quality = 0.68,
    dpiScale = 1.4,
    targetKb = 0,
    colorMode = 'color',
    stripMetadata = true,
    flattenForms = true,
    pageRange = '',
  } = options;

  const runLossless = async () => {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    if (flattenForms) {
      try {
        src.getForm().flatten();
      } catch {
        // Ignore if no interactive form
      }
    }
    const total = src.getPageCount();
    const keep = parsePageRanges(pageRange, total);
    const outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(
      src,
      keep.map((p) => p - 1)
    );
    copied.forEach((p) => outDoc.addPage(p));
    if (stripMetadata) {
      outDoc.setTitle('');
      outDoc.setAuthor('');
      outDoc.setSubject('');
      outDoc.setKeywords([]);
      outDoc.setCreator('Tools with Anik');
      outDoc.setProducer('Tools with Anik');
    }
    return new Uint8Array(await outDoc.save({ useObjectStreams: true }));
  };

  const runRaster = async (q: number, scale: number) => {
    const pdfJs = await openPdfJs(bytes);
    const keep = parsePageRanges(pageRange, pdfJs.numPages);
    const outDoc = await PDFDocument.create();
    for (let idx = 0; idx < keep.length; idx++) {
      const pNum = keep[idx];
      onProgress?.(
        Math.round(((idx + 1) / keep.length) * 90),
        `Compressing page ${pNum} (${idx + 1}/${keep.length})...`
      );
      const page = await pdfJs.getPage(pNum);
      const origVp = page.getViewport({ scale: 1 });
      const rawCanvas = await renderPdfPageToCanvas(pdfJs, pNum, scale);
      const proc = applyCanvasPostProcess(rawCanvas, colorMode);
      const jpgBlob = await canvasToBlob(proc, 'image/jpeg', q);
      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const embedded = await outDoc.embedJpg(jpgBytes);
      const pdfPage = outDoc.addPage([origVp.width, origVp.height]);
      pdfPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: origVp.width,
        height: origVp.height,
      });
    }
    return new Uint8Array(await outDoc.save({ useObjectStreams: true }));
  };

  if (mode === 'lossless') {
    onProgress?.(50, 'Rebuilding object streams & pruning unused objects...');
    const res = await runLossless();
    return {
      bytes: res,
      modeUsed: 'Lossless Structure Cleanup',
      note: 'Vector text & fonts preserved cleanly.',
    };
  }

  if (targetKb > 0) {
    // Binary search quality/scale to hit target KB
    let lo = 0.22;
    let hi = 0.92;
    let bestBytes = await runRaster(0.55, Math.min(1.3, dpiScale));
    for (let iter = 0; iter < 5; iter++) {
      const mid = (lo + hi) / 2;
      const scale = mid < 0.4 ? Math.min(1.15, dpiScale) : dpiScale;
      onProgress?.(15 + iter * 16, `Target ${targetKb} KB tuning pass ${iter + 1}/5...`);
      const attempt = await runRaster(mid, scale);
      bestBytes = attempt;
      if (attempt.byteLength / 1024 > targetKb) hi = mid - 0.03;
      else lo = mid + 0.03;
      if (Math.abs(attempt.byteLength / 1024 - targetKb) < Math.max(12, targetKb * 0.07)) break;
    }
    return {
      bytes: bestBytes,
      modeUsed: `Target Size (${targetKb} KB)`,
      note: `Tuned to ${(bestBytes.byteLength / 1024).toFixed(1)} KB`,
    };
  }

  if (mode === 'raster' || colorMode !== 'color') {
    const out = await runRaster(quality, dpiScale);
    return {
      bytes: out,
      modeUsed: colorMode === 'bw-scan' ? 'B&W Document Scan' : 'Raster Recompression',
      note: `Rendered at ${Math.round(dpiScale * 72)} DPI, JPG q=${Math.round(quality * 100)}%`,
    };
  }

  // 'auto' or 'smart': compare lossless vs compressed raster, pick best reduction
  onProgress?.(20, 'Analyzing PDF structure...');
  const losslessRes = await runLossless();
  if (mode === 'auto' && losslessRes.byteLength < bytes.byteLength * 0.85) {
    return {
      bytes: losslessRes,
      modeUsed: 'Auto (Lossless Structural Pass)',
      note: 'Structural cleanup achieved strong reduction while keeping sharp vector text.',
    };
  }
  const rasterRes = await runRaster(quality, dpiScale);
  if (rasterRes.byteLength < losslessRes.byteLength) {
    return {
      bytes: rasterRes,
      modeUsed: mode === 'smart' ? 'Smart Image Recompression' : 'Auto (Compressed Render)',
      note: 'Compact size optimized for email & web sharing.',
    };
  }
  return {
    bytes: losslessRes,
    modeUsed: 'Lossless Object Cleanup',
    note: 'Retained crisp vector PDF streams as rasterization would increase size.',
  };
}

export interface PageAssemblySpec {
  sourceIndex: number; // -1 for blank page
  pageNumber?: number; // 1-based
  rotation: number; // 0, 90, 180, 270
}

export async function assemblePdfFromPages(
  sources: Uint8Array[],
  specs: PageAssemblySpec[]
): Promise<Uint8Array> {
  const loaded = await Promise.all(sources.map((b) => PDFDocument.load(b, { ignoreEncryption: true })));
  const out = await PDFDocument.create();
  for (const spec of specs) {
    if (spec.sourceIndex < 0 || !spec.pageNumber) {
      const p = out.addPage([595.28, 841.89]);
      p.setRotation(degrees(spec.rotation));
    } else {
      const srcDoc = loaded[spec.sourceIndex];
      const [copied] = await out.copyPages(srcDoc, [spec.pageNumber - 1]);
      const existingRot = copied.getRotation().angle;
      copied.setRotation(degrees((existingRot + spec.rotation) % 360));
      out.addPage(copied);
    }
  }
  return new Uint8Array(await out.save({ useObjectStreams: true }));
}

export async function splitPdfToZip(
  bytes: Uint8Array,
  filename: string,
  mode: 'single' | 'every-n' | 'odd-even' | 'halves' | 'custom',
  everyN = 2,
  customExpr = '1-2, 3-last'
): Promise<{ zipBlob: Blob; filesCount: number }> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const specs = parseSplitSpec(mode, src.getPageCount(), everyN, customExpr);
  const zip = new JSZip();
  const base = safeBase(filename);

  for (const grp of specs) {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(
      src,
      grp.pages.map((p) => p - 1)
    );
    copied.forEach((p) => out.addPage(p));
    const pdfBytes = await out.save({ useObjectStreams: true });
    zip.file(`${base}_${grp.label}.pdf`, pdfBytes);
  }
  return { zipBlob: await zip.generateAsync({ type: 'blob' }), filesCount: specs.length };
}

export async function imagesToPdf(
  files: File[],
  options: {
    pageSize?: 'fit' | 'a4' | 'letter';
    marginPt?: number;
    orientation?: 'auto' | 'portrait' | 'landscape';
  } = {}
): Promise<Uint8Array> {
  const { pageSize = 'a4', marginPt = 24, orientation = 'auto' } = options;
  const doc = await PDFDocument.create();

  for (const file of files) {
    const imgEl = await loadImageFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imgEl, 0, 0);

    const isPng = file.type === 'image/png';
    const blob = await canvasToBlob(canvas, isPng ? 'image/png' : 'image/jpeg', 0.92);
    const imgBytes = new Uint8Array(await blob.arrayBuffer());
    const embedded = isPng ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
    const iw = embedded.width;
    const ih = embedded.height;

    let pw = iw + marginPt * 2;
    let ph = ih + marginPt * 2;
    if (pageSize === 'a4') {
      pw = 595.28;
      ph = 841.89;
    } else if (pageSize === 'letter') {
      pw = 612;
      ph = 792;
    }

    if (pageSize !== 'fit') {
      const isImgLandscape = iw > ih;
      const wantLandscape =
        orientation === 'landscape' || (orientation === 'auto' && isImgLandscape);
      if (wantLandscape && pw < ph) [pw, ph] = [ph, pw];
      if (!wantLandscape && pw > ph) [pw, ph] = [ph, pw];
    }

    const page = doc.addPage([pw, ph]);
    const availW = Math.max(10, pw - marginPt * 2);
    const availH = Math.max(10, ph - marginPt * 2);
    const ratio = Math.min(availW / iw, availH / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    page.drawImage(embedded, {
      x: (pw - dw) / 2,
      y: (ph - dh) / 2,
      width: dw,
      height: dh,
    });
  }
  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function textOrMarkdownToPdf(
  content: string,
  title = 'Document',
  isMarkdown = true
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await doc.embedFont(StandardFonts.Courier);

  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 52;
  const maxWidth = pageW - margin * 2;

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  const wrapText = (txt: string, f: typeof font, size: number) => {
    const words = txt.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(candidate, size) <= maxWidth) {
        cur = candidate;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  const safeStr = (s: string) => s.replace(/[^\x20-\x7e]/g, ' ');

  if (title.trim()) {
    doc.setTitle(title.trim());
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = safeStr(rawLine);
    if (!line.trim()) {
      y -= 10;
      continue;
    }
    let f = font;
    let size = 11;
    let color = rgb(0.12, 0.16, 0.25);
    let text = line;

    if (isMarkdown) {
      if (line.startsWith('# ')) {
        f = boldFont;
        size = 20;
        text = line.slice(2);
        y -= 6;
      } else if (line.startsWith('## ')) {
        f = boldFont;
        size = 15;
        text = line.slice(3);
        y -= 4;
      } else if (line.startsWith('### ')) {
        f = boldFont;
        size = 12.5;
        text = line.slice(4);
      } else if (line.startsWith('> ')) {
        text = '│ ' + line.slice(2);
        color = rgb(0.35, 0.4, 0.5);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        text = '• ' + line.slice(2);
      } else if (line.startsWith('```')) {
        continue;
      } else if (line.startsWith('    ') || line.startsWith('\t')) {
        f = monoFont;
        size = 10;
      }
    }

    const wrapped = wrapText(text, f, size);
    for (const wLine of wrapped) {
      ensureSpace(size + 8);
      page.drawText(wLine, { x: margin, y, size, font: f, color });
      y -= size + 5;
    }
  }
  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function stampPdf(
  bytes: Uint8Array,
  options: {
    filename?: string;
    headerText?: string;
    footerText?: string;
    watermarkText?: string;
    watermarkOpacity?: number;
    watermarkSize?: number;
    pageNumberFormat?: 'none' | 'x-of-y' | 'page-x' | 'bates';
    batesPrefix?: string;
    batesStart?: number;
    logoFile?: File | null;
    logoScale?: number;
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const total = pages.length;
  const dateStr = new Date().toISOString().slice(0, 10);

  let embeddedLogo: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null;
  if (options.logoFile) {
    const imgEl = await loadImageFile(options.logoFile);
    const c = document.createElement('canvas');
    c.width = imgEl.naturalWidth;
    c.height = imgEl.naturalHeight;
    c.getContext('2d')!.drawImage(imgEl, 0, 0);
    const b = await canvasToBlob(c, 'image/png', 1);
    embeddedLogo = await doc.embedPng(new Uint8Array(await b.arrayBuffer()));
  }

  const expand = (tpl: string, pageNum: number) =>
    tpl
      .replace(/\{page\}/gi, String(pageNum))
      .replace(/\{pages\}/gi, String(total))
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{filename\}/gi, options.filename || 'document.pdf');

  pages.forEach((p, idx) => {
    const pNum = idx + 1;
    const { width, height } = p.getSize();

    if (options.headerText?.trim()) {
      const txt = expand(options.headerText.trim(), pNum);
      p.drawText(txt, {
        x: 36,
        y: height - 26,
        size: 9.5,
        font,
        color: rgb(0.32, 0.37, 0.46),
      });
    }

    if (options.footerText?.trim()) {
      const txt = expand(options.footerText.trim(), pNum);
      p.drawText(txt, {
        x: 36,
        y: 20,
        size: 9.5,
        font,
        color: rgb(0.32, 0.37, 0.46),
      });
    }

    if (options.pageNumberFormat && options.pageNumberFormat !== 'none') {
      let label = `${pNum} / ${total}`;
      if (options.pageNumberFormat === 'page-x') label = `Page ${pNum}`;
      else if (options.pageNumberFormat === 'bates') {
        const seq = String((options.batesStart ?? 1) + idx).padStart(5, '0');
        label = `${options.batesPrefix || 'BATES-'}${seq}`;
      }
      const w = font.widthOfTextAtSize(label, 9.5);
      p.drawText(label, {
        x: width - w - 36,
        y: 20,
        size: 9.5,
        font: bold,
        color: rgb(0.2, 0.25, 0.35),
      });
    }

    if (options.watermarkText?.trim()) {
      const wm = expand(options.watermarkText.trim(), pNum);
      const sz = options.watermarkSize ?? 44;
      const w = bold.widthOfTextAtSize(wm, sz);
      p.drawText(wm, {
        x: Math.max(24, (width - w * 0.72) / 2),
        y: height * 0.44,
        size: sz,
        font: bold,
        color: rgb(0.35, 0.38, 0.55),
        opacity: options.watermarkOpacity ?? 0.22,
        rotate: degrees(38),
      });
    }

    if (embeddedLogo) {
      const s = options.logoScale ?? 0.16;
      const lw = Math.min(140, width * s);
      const lh = (embeddedLogo.height / embeddedLogo.width) * lw;
      p.drawImage(embeddedLogo, {
        x: width - lw - 32,
        y: height - lh - 22,
        width: lw,
        height: lh,
      });
    }
  });

  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function extractPdfTextAndSearch(bytes: Uint8Array): Promise<{
  fullText: string;
  pages: { page: number; text: string; items: { str: string; x: number; y: number; w: number; h: number }[] }[];
}> {
  const pdfJs = await openPdfJs(bytes);
  const pages: {
    page: number;
    text: string;
    items: { str: string; x: number; y: number; w: number; h: number }[];
  }[] = [];

  for (let i = 1; i <= pdfJs.numPages; i++) {
    const page = await pdfJs.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: { str: string; x: number; y: number; w: number; h: number }[] = [];
    const lines: string[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const s = raw.str;
      if (!s) continue;
      lines.push(s);
      const tx = raw.transform;
      items.push({
        str: s,
        x: tx[4],
        y: vp.height - tx[5] - (raw.height || 10),
        w: raw.width || s.length * 5,
        h: raw.height || 12,
      });
    }
    pages.push({ page: i, text: lines.join(' '), items });
  }

  const fullText = pages.map((p) => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
  return { fullText, pages };
}

export async function extractPdfImagesToZip(bytes: Uint8Array, baseName: string): Promise<{
  zipBlob: Blob;
  count: number;
}> {
  // Scan JPEG SOI..EOI & render fallback embedded image crops via PDF.js OPS or clean page fallback
  const zip = new JSZip();
  const safe = safeBase(baseName);
  let count = 0;

  // 1) Carve embedded JPEG streams directly from raw PDF bytes
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      let end = -1;
      for (let j = i + 4; j < Math.min(bytes.length - 1, i + 12_000_000); j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          end = j + 2;
          break;
        }
      }
      if (end > i + 1024) {
        count++;
        zip.file(`${safe}_img_${String(count).padStart(3, '0')}.jpg`, bytes.subarray(i, end));
        i = end;
      }
    }
  }

  // 2) If zero raw JPEG streams found (e.g., FlateDecode PNG/vector PDF), render pages at crisp PNG so user always gets usable visuals
  if (count === 0) {
    const pdfJs = await openPdfJs(bytes);
    for (let p = 1; p <= pdfJs.numPages; p++) {
      const c = await renderPdfPageToCanvas(pdfJs, p, 1.8);
      const blob = await canvasToBlob(c, 'image/png', 1);
      count++;
      zip.file(`${safe}_page_${String(p).padStart(3, '0')}.png`, blob);
    }
  }

  return { zipBlob: await zip.generateAsync({ type: 'blob' }), count };
}

export async function layoutPdf(
  bytes: Uint8Array,
  options: {
    mode: 'resize' | 'nup' | 'booklet' | 'reverse';
    targetSize?: 'a4' | 'letter' | 'legal' | 'a3' | 'a5';
    nup?: 2 | 4 | 6 | 9;
  }
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const sizes: Record<string, [number, number]> = {
    a4: [595.28, 841.89],
    letter: [612, 792],
    legal: [612, 1008],
    a3: [841.89, 1190.55],
    a5: [419.53, 595.28],
  };

  if (options.mode === 'reverse') {
    const out = await PDFDocument.create();
    const idxs = Array.from({ length: total }, (_, i) => total - 1 - i);
    const copied = await out.copyPages(src, idxs);
    copied.forEach((p) => out.addPage(p));
    return new Uint8Array(await out.save({ useObjectStreams: true }));
  }

  if (options.mode === 'resize') {
    const [tw, th] = sizes[options.targetSize || 'a4'];
    const out = await PDFDocument.create();
    const embeddedPages = await out.embedPages(src.getPages());
    for (const ep of embeddedPages) {
      const page = out.addPage([tw, th]);
      const ratio = Math.min(tw / ep.width, th / ep.height);
      const w = ep.width * ratio;
      const h = ep.height * ratio;
      page.drawPage(ep, { x: (tw - w) / 2, y: (th - h) / 2, width: w, height: h });
    }
    return new Uint8Array(await out.save({ useObjectStreams: true }));
  }

  // N-up or Booklet imposition
  const out = await PDFDocument.create();
  const embeddedPages = await out.embedPages(src.getPages());

  if (options.mode === 'booklet') {
    // Pad to multiple of 4
    const paddedCount = Math.ceil(embeddedPages.length / 4) * 4;
    const sheetW = 841.89; // Landscape A4
    const sheetH = 595.28;
    const halfW = sheetW / 2;
    let lo = 0;
    let hi = paddedCount - 1;
    let sheetIdx = 0;
    while (lo < hi) {
      const leftIdx = sheetIdx % 2 === 0 ? hi : lo;
      const rightIdx = sheetIdx % 2 === 0 ? lo : hi;
      lo++;
      hi--;
      sheetIdx++;
      const sheet = out.addPage([sheetW, sheetH]);
      const drawHalf = (epIdx: number, xOffset: number) => {
        if (epIdx >= embeddedPages.length) return;
        const ep = embeddedPages[epIdx];
        const r = Math.min((halfW - 16) / ep.width, (sheetH - 16) / ep.height);
        const w = ep.width * r;
        const h = ep.height * r;
        sheet.drawPage(ep, {
          x: xOffset + (halfW - w) / 2,
          y: (sheetH - h) / 2,
          width: w,
          height: h,
        });
      };
      drawHalf(leftIdx, 0);
      drawHalf(rightIdx, halfW);
    }
    return new Uint8Array(await out.save({ useObjectStreams: true }));
  }

  const nup = options.nup || 2;
  const cols = nup === 2 ? 2 : nup === 4 ? 2 : 3;
  const rows = nup === 2 ? 1 : nup === 4 ? 2 : nup === 6 ? 2 : 3;
  const sheetW = nup === 2 || nup === 6 ? 841.89 : 595.28;
  const sheetH = nup === 2 || nup === 6 ? 595.28 : 841.89;
  const cellW = sheetW / cols;
  const cellH = sheetH / rows;

  for (let i = 0; i < embeddedPages.length; i += nup) {
    const sheet = out.addPage([sheetW, sheetH]);
    for (let k = 0; k < nup && i + k < embeddedPages.length; k++) {
      const col = k % cols;
      const row = Math.floor(k / cols);
      const ep = embeddedPages[i + k];
      const r = Math.min((cellW - 16) / ep.width, (cellH - 16) / ep.height);
      const w = ep.width * r;
      const h = ep.height * r;
      const x = col * cellW + (cellW - w) / 2;
      const y = sheetH - (row + 1) * cellH + (cellH - h) / 2;
      sheet.drawPage(ep, { x, y, width: w, height: h });
    }
  }
  return new Uint8Array(await out.save({ useObjectStreams: true }));
}

export async function cropPdfPages(
  bytes: Uint8Array,
  marginsPct: { top: number; right: number; bottom: number; left: number },
  pageRange = ''
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const target = new Set(parsePageRanges(pageRange, total));
  doc.getPages().forEach((page, idx) => {
    if (!target.has(idx + 1)) return;
    const { width, height } = page.getSize();
    const l = (marginsPct.left / 100) * width;
    const r = (marginsPct.right / 100) * width;
    const b = (marginsPct.bottom / 100) * height;
    const t = (marginsPct.top / 100) * height;
    const nw = Math.max(20, width - l - r);
    const nh = Math.max(20, height - t - b);
    page.setCropBox(l, b, nw, nh);
  });
  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function redactPdfPermanent(
  bytes: Uint8Array,
  terms: string[]
): Promise<{ bytes: Uint8Array; redactedPages: number[]; matchCount: number }> {
  const pdfJs = await openPdfJs(bytes);
  const cleanTerms = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const redactedPages: number[] = [];
  let matchCount = 0;
  const outDoc = await PDFDocument.create();

  for (let p = 1; p <= pdfJs.numPages; p++) {
    const page = await pdfJs.getPage(p);
    const vp = page.getViewport({ scale: 2 });
    const content = await page.getTextContent();
    const rectsToBlackout: { x: number; y: number; w: number; h: number }[] = [];

    for (const raw of content.items) {
      if (!('str' in raw) || !raw.str) continue;
      const low = raw.str.toLowerCase();
      if (cleanTerms.some((term) => low.includes(term))) {
        const tx = raw.transform;
        const x = tx[4] * 2;
        const h = Math.max(18, (raw.height || 12) * 2.2);
        const y = vp.height - tx[5] * 2 - h * 0.85;
        const w = Math.max(20, (raw.width || raw.str.length * 6) * 2);
        rectsToBlackout.push({ x, y, w, h });
        matchCount++;
      }
    }

    if (rectsToBlackout.length > 0) {
      redactedPages.push(p);
    }
    const canvas = await renderPdfPageToCanvas(pdfJs, p, 2);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    for (const r of rectsToBlackout) {
      ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    }
    const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
    const emb = await outDoc.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
    const origVp = page.getViewport({ scale: 1 });
    const outPage = outDoc.addPage([origVp.width, origVp.height]);
    outPage.drawImage(emb, { x: 0, y: 0, width: origVp.width, height: origVp.height });
  }

  return {
    bytes: new Uint8Array(await outDoc.save({ useObjectStreams: true })),
    redactedPages,
    matchCount,
  };
}

export async function signPdfWithDataUrl(
  bytes: Uint8Array,
  sigDataUrl: string,
  options: {
    pageMode: 'last' | 'first' | 'all' | 'custom';
    customPage?: number;
    anchor: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'center';
    widthPt?: number;
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const base64 = sigDataUrl.split(',')[1];
  const bin = atob(base64);
  const pngBytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pngBytes[i] = bin.charCodeAt(i);
  const embedded = await doc.embedPng(pngBytes);
  const pages = doc.getPages();
  const wPt = options.widthPt ?? 150;
  const hPt = (embedded.height / embedded.width) * wPt;

  pages.forEach((page, idx) => {
    const pNum = idx + 1;
    const apply =
      options.pageMode === 'all' ||
      (options.pageMode === 'first' && pNum === 1) ||
      (options.pageMode === 'last' && pNum === pages.length) ||
      (options.pageMode === 'custom' && pNum === (options.customPage ?? 1));
    if (!apply) return;

    const { width, height } = page.getSize();
    let x = width - wPt - 40;
    let y = 48;
    if (options.anchor === 'bottom-left') x = 40;
    else if (options.anchor === 'bottom-center') x = (width - wPt) / 2;
    else if (options.anchor === 'center') {
      x = (width - wPt) / 2;
      y = (height - hPt) / 2;
    }
    page.drawImage(embedded, { x, y, width: wPt, height: hPt });
  });

  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function convertPdfToOutputs(
  bytes: Uint8Array,
  filename: string,
  mode: 'png' | 'jpg' | 'webp' | 'long-png' | 'grid-png' | 'md' | 'html' | 'json',
  dpiScale = 1.6
): Promise<{ blob: Blob; downloadName: string; previewText?: string; previewDataUrl?: string }> {
  const base = safeBase(filename);

  if (mode === 'md' || mode === 'html' || mode === 'json') {
    const { pages } = await extractPdfTextAndSearch(bytes);
    if (mode === 'json') {
      const jsonStr = JSON.stringify({ filename, pageCount: pages.length, pages }, null, 2);
      return {
        blob: new Blob([jsonStr], { type: 'application/json' }),
        downloadName: `${base}.json`,
        previewText: jsonStr,
      };
    }
    if (mode === 'md') {
      const md = pages.map((p) => `## Page ${p.page}\n\n${p.text}`).join('\n\n---\n\n');
      return {
        blob: new Blob([md], { type: 'text/markdown' }),
        downloadName: `${base}.md`,
        previewText: md,
      };
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${base}</title><style>body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.6}section{border-bottom:1px solid #e2e8f0;padding:24px 0}</style></head><body><h1>${base}</h1>${pages
      .map((p) => `<section><h2>Page ${p.page}</h2><p>${p.text.replace(/</g, '&lt;')}</p></section>`)
      .join('')}</body></html>`;
    return {
      blob: new Blob([html], { type: 'text/html' }),
      downloadName: `${base}.html`,
      previewText: html,
    };
  }

  const pdfJs = await openPdfJs(bytes);
  const canvases: HTMLCanvasElement[] = [];
  for (let p = 1; p <= pdfJs.numPages; p++) {
    canvases.push(await renderPdfPageToCanvas(pdfJs, p, dpiScale));
  }

  if (mode === 'long-png') {
    const maxW = Math.max(...canvases.map((c) => c.width));
    const totalH = canvases.reduce((s, c) => s + c.height + 12, 0);
    const big = document.createElement('canvas');
    big.width = maxW;
    big.height = Math.max(1, totalH);
    const ctx = big.getContext('2d')!;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, big.width, big.height);
    let y = 0;
    for (const c of canvases) {
      ctx.drawImage(c, Math.floor((maxW - c.width) / 2), y);
      y += c.height + 12;
    }
    const blob = await canvasToBlob(big, 'image/png', 0.95);
    return { blob, downloadName: `${base}_scroll.png`, previewDataUrl: big.toDataURL('image/png') };
  }

  if (mode === 'grid-png') {
    const cols = Math.min(3, canvases.length);
    const rows = Math.ceil(canvases.length / cols);
    const cw = Math.max(...canvases.map((c) => c.width));
    const ch = Math.max(...canvases.map((c) => c.height));
    const gap = 16;
    const grid = document.createElement('canvas');
    grid.width = cols * cw + (cols + 1) * gap;
    grid.height = rows * ch + (rows + 1) * gap;
    const ctx = grid.getContext('2d')!;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, grid.width, grid.height);
    canvases.forEach((c, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.drawImage(c, gap + col * (cw + gap), gap + row * (ch + gap));
    });
    const blob = await canvasToBlob(grid, 'image/png', 0.92);
    return { blob, downloadName: `${base}_contact_sheet.png`, previewDataUrl: grid.toDataURL('image/png') };
  }

  const mime = mode === 'jpg' ? 'image/jpeg' : mode === 'webp' ? 'image/webp' : 'image/png';
  if (canvases.length === 1) {
    const blob = await canvasToBlob(canvases[0], mime, 0.92);
    return { blob, downloadName: `${base}_p1.${mode}`, previewDataUrl: canvases[0].toDataURL(mime) };
  }
  const zip = new JSZip();
  for (let i = 0; i < canvases.length; i++) {
    const blob = await canvasToBlob(canvases[i], mime, 0.92);
    zip.file(`${base}_page_${String(i + 1).padStart(3, '0')}.${mode}`, blob);
  }
  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    downloadName: `${base}_${mode}_pages.zip`,
    previewDataUrl: canvases[0]?.toDataURL(mime),
  };
}

export async function compareTwoPdfPages(
  bytesA: Uint8Array,
  bytesB: Uint8Array,
  pageNumber = 1
): Promise<{
  canvasA: HTMLCanvasElement;
  canvasB: HTMLCanvasElement;
  diffCanvas: HTMLCanvasElement;
  diffPercent: number;
}> {
  const [pdfA, pdfB] = await Promise.all([openPdfJs(bytesA), openPdfJs(bytesB)]);
  const pA = Math.min(pageNumber, pdfA.numPages);
  const pB = Math.min(pageNumber, pdfB.numPages);
  const [cA, cB] = await Promise.all([
    renderPdfPageToCanvas(pdfA, pA, 1.35),
    renderPdfPageToCanvas(pdfB, pB, 1.35),
  ]);
  const w = Math.max(cA.width, cB.width);
  const h = Math.max(cA.height, cB.height);

  const norm = (src: HTMLCanvasElement) => {
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0);
    return ctx.getImageData(0, 0, w, h);
  };

  const dA = norm(cA).data;
  const dB = norm(cB).data;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = w;
  diffCanvas.height = h;
  const diffCtx = diffCanvas.getContext('2d')!;
  const diffImg = diffCtx.createImageData(w, h);
  let changed = 0;

  for (let i = 0; i < dA.length; i += 4) {
    const delta = Math.abs(dA[i] - dB[i]) + Math.abs(dA[i + 1] - dB[i + 1]) + Math.abs(dA[i + 2] - dB[i + 2]);
    if (delta > 36) {
      changed++;
      diffImg.data[i] = 225;
      diffImg.data[i + 1] = 29;
      diffImg.data[i + 2] = 72;
      diffImg.data[i + 3] = 255;
    } else {
      const lum = Math.round((dA[i] + dA[i + 1] + dA[i + 2]) / 3);
      const faded = Math.min(255, Math.round(lum * 0.4 + 150));
      diffImg.data[i] = diffImg.data[i + 1] = diffImg.data[i + 2] = faded;
      diffImg.data[i + 3] = 255;
    }
  }
  diffCtx.putImageData(diffImg, 0, 0);
  const diffPercent = (changed / (w * h)) * 100;
  return { canvasA: cA, canvasB: cB, diffCanvas, diffPercent };
}
