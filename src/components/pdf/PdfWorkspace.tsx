import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  Download,
  RotateCw,
  RotateCcw,
  Trash2,
  CopyPlus,
  FilePlus2,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Search,
  Send,
  Sparkles,
  Check,
} from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, FileDropzone, Panel, StatTile, CopyButton } from '../ui/SharedUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  assemblePdfFromPages,
  compareTwoPdfPages,
  compressPdf,
  convertPdfToOutputs,
  cropPdfPages,
  detectWhitespaceMargins,
  extractPdfImagesToZip,
  extractPdfTextAndSearch,
  imagesToPdf,
  inspectPdf,
  isCanvasMostlyBlank,
  layoutPdf,
  openPdfJs,
  PdfInspection,
  redactPdfPermanent,
  renderPdfPageToCanvas,
  signPdfWithDataUrl,
  splitPdfToZip,
  stampPdf,
  textOrMarkdownToPdf,
} from '../../utils/pdfEngine';
import { downloadBlob, downloadBytes, downloadText, readFileAsBytes } from '../../utils/download';
import { fmtBytes, safeBase } from '../../utils/formatters';

interface PageThumb {
  uid: string;
  sourceIndex: number;
  pageNumber?: number; // undefined = blank
  rotation: number;
  thumbUrl: string;
  isBlank?: boolean;
  label: string;
}

export function PdfWorkspace({ tool }: { tool: ToolDef }) {
  const { transfer, clearTransfer, navigateToTool } = useWorkspace();

  // Single primary PDF state
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [info, setInfo] = useState<PdfInspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [resultInfo, setResultInfo] = useState<{
    bytes?: Uint8Array;
    blob?: Blob;
    name: string;
    note?: string;
    previewText?: string;
    previewImg?: string;
  } | null>(null);

  // Merge / Organize thumbnails
  const [sources, setSources] = useState<{ name: string; bytes: Uint8Array }[]>([]);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [undoStack, setUndoStack] = useState<PageThumb[][]>([]);

  // Compress controls
  const [compMode, setCompMode] = useState<'auto' | 'smart' | 'raster' | 'lossless'>('auto');
  const [compQuality, setCompQuality] = useState(0.68);
  const [compDpi, setCompDpi] = useState(1.4);
  const [targetKb, setTargetKb] = useState(0);
  const [compColor, setCompColor] = useState<'color' | 'grayscale' | 'bw-scan'>('color');
  const [compRange, setCompRange] = useState('');

  // Split controls
  const [splitMode, setSplitMode] = useState<'single' | 'every-n' | 'odd-even' | 'halves' | 'custom'>('single');
  const [splitEveryN, setSplitEveryN] = useState(2);
  const [splitCustom, setSplitCustom] = useState('1-2, 3-last');

  // Convert controls
  const [convSubMode, setConvSubMode] = useState<'pdf2out' | 'img2pdf' | 'txt2pdf'>('pdf2out');
  const [convFormat, setConvFormat] = useState<'png' | 'jpg' | 'webp' | 'long-png' | 'grid-png' | 'md' | 'html' | 'json'>('png');
  const [convImages, setConvImages] = useState<File[]>([]);
  const [imgPageSize, setImgPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [rawTextToPdf, setRawTextToPdf] = useState('# Document Title\n\nWrite clean paragraphs or Markdown notes here to render an A4 PDF.');

  // Clean controls
  const [blankSet, setBlankSet] = useState<Set<number>>(new Set());
  const [cleanThumbs, setCleanThumbs] = useState<{ page: number; thumbUrl: string; isBlank: boolean }[]>([]);
  const [dropPages, setDropPages] = useState<Set<number>>(new Set());
  const [stripMeta, setStripMeta] = useState(true);
  const [flattenAcro, setFlattenAcro] = useState(true);

  // Crop controls
  const [cropMargins, setCropMargins] = useState({ top: 5, right: 5, bottom: 5, left: 5 });
  const [cropPreviewUrl, setCropPreviewUrl] = useState('');
  const [cropRange, setCropRange] = useState('');

  // Redact controls
  const [redactInput, setRedactInput] = useState('CONFIDENTIAL, example@email.com');
  const [redactMatches, setRedactMatches] = useState<{ page: number; snippet: string }[]>([]);

  // Sign controls
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sigDrawing, setSigDrawing] = useState(false);
  const [sigDataUrl, setSigDataUrl] = useState('');
  const [sigPageMode, setSigPageMode] = useState<'last' | 'first' | 'all' | 'custom'>('last');
  const [sigCustomPage, setSigCustomPage] = useState(1);
  const [sigAnchor, setSigAnchor] = useState<'bottom-right' | 'bottom-left' | 'bottom-center' | 'center'>('bottom-right');

  // Stamp & Watermark controls
  const [headerTxt, setHeaderTxt] = useState('{filename} • {date}');
  const [footerTxt, setFooterTxt] = useState('Confidential');
  const [wmTxt, setWmTxt] = useState(tool.tab === 'watermark' ? 'CONFIDENTIAL' : '');
  const [wmOpacity, setWmOpacity] = useState(0.22);
  const [pageNumFmt, setPageNumFmt] = useState<'none' | 'x-of-y' | 'page-x' | 'bates'>('x-of-y');
  const [batesPrefix, setBatesPrefix] = useState('DOC-');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Layout controls
  const [layoutMode, setLayoutMode] = useState<'resize' | 'nup' | 'booklet' | 'reverse'>('nup');
  const [layoutTargetSize, setLayoutTargetSize] = useState<'a4' | 'letter' | 'legal' | 'a3' | 'a5'>('a4');
  const [layoutNup, setLayoutNup] = useState<2 | 4 | 6 | 9>(2);

  // Metadata controls
  const [metaFields, setMetaFields] = useState({ title: '', author: '', subject: '', keywords: '' });

  // Extract & Search controls
  const [extractedText, setExtractedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<{ page: number; count: number; items: { x: number; y: number; w: number; h: number }[] }[]>([]);
  const [searchPreviewUrl, setSearchPreviewUrl] = useState('');
  const [searchActivePage, setSearchActivePage] = useState(1);

  // Compare controls
  const [compareFileB, setCompareFileB] = useState<File | null>(null);
  const [compareBytesB, setCompareBytesB] = useState<Uint8Array | null>(null);
  const [compareData, setCompareData] = useState<{
    urlA: string;
    urlB: string;
    urlDiff: string;
    diffPct: number;
  } | null>(null);
  const [compareView, setCompareView] = useState<'diff' | 'side' | 'swipe'>('diff');
  const [swipePct, setSwipePct] = useState(50);

  // Quick tools (grayscale / flatten / repair) & Markdown
  const [mdSource, setMdSource] = useState('# Project Brief\n\n- Client-side PDF generation\n- Clean A4 typography\n\n## Summary\n\nGenerated directly inside **Tools with Anik**.');
  const [mdTitle, setMdTitle] = useState('Project Brief');

  // Consume cross-tool transfers
  useEffect(() => {
    if (!transfer) return;
    if (transfer.signatureDataUrl) {
      setSigDataUrl(transfer.signatureDataUrl);
    }
    if (transfer.text) {
      if (tool.engine === 'pdf-md2pdf') setMdSource(transfer.text);
      else if (tool.engine === 'pdf-convert') {
        setConvSubMode('txt2pdf');
        setRawTextToPdf(transfer.text);
      }
    }
    if (transfer.files?.length) {
      const pdfs = transfer.files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      const imgs = transfer.files.filter((f) => f.type.startsWith('image/'));
      if (tool.engine === 'pdf-merge' || tool.engine === 'pdf-organize') {
        if (pdfs.length) handleLoadMultiPdfs(pdfs);
      } else if (tool.engine === 'pdf-convert' && imgs.length) {
        setConvSubMode('img2pdf');
        setConvImages(imgs);
      } else if (pdfs[0]) {
        handleLoadSinglePdf(pdfs[0]);
      }
    }
    clearTransfer();
  }, [transfer]);

  const handleLoadSinglePdf = async (f: File) => {
    setBusy(true);
    setResultInfo(null);
    setStatusMsg('Loading PDF document...');
    try {
      const b = await readFileAsBytes(f);
      const inspected = await inspectPdf(b);
      setFile(f);
      setBytes(b);
      setInfo(inspected);
      setMetaFields({
        title: inspected.title,
        author: inspected.author,
        subject: inspected.subject,
        keywords: inspected.keywords,
      });

      const pdfJs = await openPdfJs(b);
      if (tool.engine === 'pdf-crop') {
        const c = await renderPdfPageToCanvas(pdfJs, 1, 1.0);
        setCropPreviewUrl(c.toDataURL('image/png'));
        const auto = await detectWhitespaceMargins(c);
        setCropMargins({ top: auto.topPct, right: auto.rightPct, bottom: auto.bottomPct, left: auto.leftPct });
      }
      if (tool.engine === 'pdf-clean') {
        const rows: { page: number; thumbUrl: string; isBlank: boolean }[] = [];
        const blanks = new Set<number>();
        const maxScan = Math.min(pdfJs.numPages, 24);
        for (let p = 1; p <= maxScan; p++) {
          const c = await renderPdfPageToCanvas(pdfJs, p, 0.45);
          const blank = isCanvasMostlyBlank(c);
          if (blank) blanks.add(p);
          rows.push({ page: p, thumbUrl: c.toDataURL('image/png'), isBlank: blank });
        }
        setCleanThumbs(rows);
        setBlankSet(blanks);
        setDropPages(new Set(blanks));
      }
      if (tool.engine === 'pdf-extract') {
        const res = await extractPdfTextAndSearch(b);
        setExtractedText(res.fullText);
      }
      setStatusMsg('');
    } catch (err) {
      setStatusMsg(`Error reading PDF: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadMultiPdfs = async (files: File[]) => {
    setBusy(true);
    setResultInfo(null);
    setStatusMsg('Rendering page thumbnails...');
    try {
      const startIdx = sources.length;
      const addedSources: { name: string; bytes: Uint8Array }[] = [];
      const addedThumbs: PageThumb[] = [];

      for (let i = 0; i < files.length; i++) {
        const b = await readFileAsBytes(files[i]);
        const sIdx = startIdx + i;
        addedSources.push({ name: files[i].name, bytes: b });
        const pdfJs = await openPdfJs(b);
        for (let p = 1; p <= pdfJs.numPages; p++) {
          const c = await renderPdfPageToCanvas(pdfJs, p, 0.45);
          addedThumbs.push({
            uid: `${sIdx}_${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            sourceIndex: sIdx,
            pageNumber: p,
            rotation: 0,
            thumbUrl: c.toDataURL('image/png'),
            isBlank: isCanvasMostlyBlank(c),
            label: `${files[i].name} · p${p}`,
          });
        }
      }
      setSources((prev) => [...prev, ...addedSources]);
      setThumbs((prev) => [...prev, ...addedThumbs]);
      setStatusMsg('');
    } catch (err) {
      setStatusMsg(`Error loading PDF: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const pushUndo = (next: PageThumb[]) => {
    setUndoStack((u) => [thumbs, ...u].slice(0, 12));
    setThumbs(next);
  };

  // --- Tool Execution Handlers ---
  const runCompress = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    setResultInfo(null);
    try {
      const res = await compressPdf(
        bytes,
        {
          mode: compMode,
          quality: compQuality,
          dpiScale: compDpi,
          targetKb,
          colorMode: compColor,
          pageRange: compRange,
        },
        (_, msg) => setStatusMsg(msg)
      );
      setResultInfo({
        bytes: res.bytes,
        name: `${safeBase(file.name)}_compressed.pdf`,
        note: `${res.modeUsed} — ${res.note}`,
      });
      setStatusMsg('');
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runMergeOrOrganize = async () => {
    if (!thumbs.length) return;
    setBusy(true);
    setStatusMsg('Building assembled PDF...');
    try {
      const outBytes = await assemblePdfFromPages(
        sources.map((s) => s.bytes),
        thumbs.map((t) => ({
          sourceIndex: t.sourceIndex,
          pageNumber: t.pageNumber,
          rotation: t.rotation,
        }))
      );
      const name = tool.engine === 'pdf-merge' ? 'merged_document.pdf' : `${safeBase(sources[0]?.name || 'doc')}_organized.pdf`;
      setResultInfo({ bytes: outBytes, name, note: `${thumbs.length} pages assembled cleanly.` });
      setStatusMsg('');
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runSplit = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    setStatusMsg('Splitting PDF pages...');
    try {
      const { zipBlob, filesCount } = await splitPdfToZip(bytes, file.name, splitMode, splitEveryN, splitCustom);
      setResultInfo({
        blob: zipBlob,
        name: `${safeBase(file.name)}_split.zip`,
        note: `Created ${filesCount} split PDF files inside ZIP archive.`,
      });
      setStatusMsg('');
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runConvert = async () => {
    setBusy(true);
    setResultInfo(null);
    try {
      if (convSubMode === 'img2pdf') {
        if (!convImages.length) throw new Error('Select at least 1 image');
        setStatusMsg('Packaging images into PDF...');
        const pdfBytes = await imagesToPdf(convImages, { pageSize: imgPageSize });
        setResultInfo({
          bytes: pdfBytes,
          name: `${safeBase(convImages[0].name)}_bundle.pdf`,
          note: `${convImages.length} image(s) converted to PDF`,
        });
      } else if (convSubMode === 'txt2pdf') {
        setStatusMsg('Rendering text to A4 PDF...');
        const pdfBytes = await textOrMarkdownToPdf(rawTextToPdf, 'Document', true);
        setResultInfo({ bytes: pdfBytes, name: 'text_document.pdf', note: 'Rendered clean A4 PDF' });
      } else {
        if (!bytes || !file) throw new Error('Upload a PDF first');
        setStatusMsg(`Converting PDF to ${convFormat.toUpperCase()}...`);
        const res = await convertPdfToOutputs(bytes, file.name, convFormat, 1.6);
        setResultInfo({
          blob: res.blob,
          name: res.downloadName,
          previewText: res.previewText,
          previewImg: res.previewDataUrl,
          note: `Converted ${info?.pageCount ?? ''} pages to ${convFormat.toUpperCase()}`,
        });
      }
      setStatusMsg('');
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runClean = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    setStatusMsg('Cleaning PDF...');
    try {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      if (flattenAcro) {
        try {
          src.getForm().flatten();
        } catch {
          // ignore
        }
      }
      const keepIndices: number[] = [];
      for (let i = 0; i < src.getPageCount(); i++) {
        if (!dropPages.has(i + 1)) keepIndices.push(i);
      }
      if (!keepIndices.length) throw new Error('Cannot remove every page from PDF');
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, keepIndices);
      copied.forEach((p) => out.addPage(p));
      if (stripMeta) {
        out.setTitle('');
        out.setAuthor('');
        out.setSubject('');
        out.setKeywords([]);
        out.setCreator('Tools with Anik');
        out.setProducer('Tools with Anik');
      }
      const outBytes = new Uint8Array(await out.save({ useObjectStreams: true }));
      setResultInfo({
        bytes: outBytes,
        name: `${safeBase(file.name)}_cleaned.pdf`,
        note: `Removed ${dropPages.size} page(s)${stripMeta ? ' & stripped metadata' : ''}.`,
      });
      setStatusMsg('');
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runCrop = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    try {
      const out = await cropPdfPages(bytes, cropMargins, cropRange);
      setResultInfo({ bytes: out, name: `${safeBase(file.name)}_cropped.pdf`, note: 'Applied page crop box cleanly.' });
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const scanRedactMatches = async () => {
    if (!bytes) return;
    setBusy(true);
    const terms = redactInput.split(',').map((s) => s.trim()).filter(Boolean);
    const { pages } = await extractPdfTextAndSearch(bytes);
    const hits: { page: number; snippet: string }[] = [];
    for (const p of pages) {
      const low = p.text.toLowerCase();
      for (const t of terms) {
        if (low.includes(t.toLowerCase())) {
          hits.push({ page: p.page, snippet: `Matched "${t}" on page ${p.page}` });
        }
      }
    }
    setRedactMatches(hits);
    setBusy(false);
  };

  const runRedact = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    setStatusMsg('Burning permanent black redaction boxes...');
    try {
      const terms = redactInput.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await redactPdfPermanent(bytes, terms);
      setResultInfo({
        bytes: res.bytes,
        name: `${safeBase(file.name)}_redacted.pdf`,
        note: `Permanently burned ${res.matchCount} match(es) across ${res.redactedPages.length} page(s).`,
      });
      setStatusMsg('');
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runSign = async () => {
    if (!bytes || !file || !sigDataUrl) return;
    setBusy(true);
    try {
      const out = await signPdfWithDataUrl(bytes, sigDataUrl, {
        pageMode: sigPageMode,
        customPage: sigCustomPage,
        anchor: sigAnchor,
      });
      setResultInfo({ bytes: out, name: `${safeBase(file.name)}_signed.pdf`, note: 'Signature stamped cleanly.' });
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runStamp = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    try {
      const out = await stampPdf(bytes, {
        filename: file.name,
        headerText: headerTxt,
        footerText: footerTxt,
        watermarkText: wmTxt,
        watermarkOpacity: wmOpacity,
        pageNumberFormat: pageNumFmt,
        batesPrefix,
        logoFile,
      });
      setResultInfo({ bytes: out, name: `${safeBase(file.name)}_stamped.pdf`, note: 'Applied headers, footers & watermarks.' });
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runLayout = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    try {
      const out = await layoutPdf(bytes, {
        mode: layoutMode,
        targetSize: layoutTargetSize,
        nup: layoutNup,
      });
      setResultInfo({
        bytes: out,
        name: `${safeBase(file.name)}_${layoutMode}.pdf`,
        note: `Applied ${layoutMode.toUpperCase()} layout transform.`,
      });
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runSaveMetadata = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      doc.setTitle(metaFields.title);
      doc.setAuthor(metaFields.author);
      doc.setSubject(metaFields.subject);
      doc.setKeywords(metaFields.keywords.split(',').map((s) => s.trim()).filter(Boolean));
      const out = new Uint8Array(await doc.save({ useObjectStreams: true }));
      setResultInfo({ bytes: out, name: `${safeBase(file.name)}_meta.pdf`, note: 'Updated PDF metadata properties.' });
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async (targetPage = 1) => {
    if (!bytes || !searchQuery.trim()) return;
    setBusy(true);
    try {
      const q = searchQuery.trim().toLowerCase();
      const { pages } = await extractPdfTextAndSearch(bytes);
      const hits = pages.map((p) => {
        const matched = p.items.filter((it) => it.str.toLowerCase().includes(q));
        return { page: p.page, count: matched.length, items: matched };
      });
      setSearchHits(hits);
      const firstHitPage = hits.find((h) => h.count > 0)?.page ?? targetPage;
      setSearchActivePage(firstHitPage);

      const pdfJs = await openPdfJs(bytes);
      const canvas = await renderPdfPageToCanvas(pdfJs, firstHitPage, 1.5);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      const hitObj = hits.find((h) => h.page === firstHitPage);
      if (hitObj) {
        for (const it of hitObj.items) {
          ctx.fillRect(it.x * 1.5, it.y * 1.5, Math.max(20, it.w * 1.5), Math.max(14, it.h * 1.5));
          ctx.strokeRect(it.x * 1.5, it.y * 1.5, Math.max(20, it.w * 1.5), Math.max(14, it.h * 1.5));
        }
      }
      setSearchPreviewUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runCompare = async () => {
    if (!bytes || !compareBytesB) return;
    setBusy(true);
    try {
      const res = await compareTwoPdfPages(bytes, compareBytesB, 1);
      setCompareData({
        urlA: res.canvasA.toDataURL('image/png'),
        urlB: res.canvasB.toDataURL('image/png'),
        urlDiff: res.diffCanvas.toDataURL('image/png'),
        diffPct: res.diffPercent,
      });
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runQuickTool = async () => {
    if (!bytes || !file) return;
    setBusy(true);
    try {
      if (tool.tab === 'grayscale') {
        const res = await compressPdf(bytes, { mode: 'raster', colorMode: 'grayscale', quality: 0.8 });
        setResultInfo({ bytes: res.bytes, name: `${safeBase(file.name)}_grayscale.pdf`, note: 'Converted all pages to grayscale.' });
      } else if (tool.tab === 'flatten') {
        const res = await compressPdf(bytes, { mode: 'lossless', flattenForms: true, stripMetadata: false });
        setResultInfo({ bytes: res.bytes, name: `${safeBase(file.name)}_flattened.pdf`, note: 'Flattened interactive form fields.' });
      } else {
        // Repair: try structural re-save, fallback to raster recovery
        try {
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const res = new Uint8Array(await doc.save({ useObjectStreams: true }));
          setResultInfo({ bytes: res, name: `${safeBase(file.name)}_repaired.pdf`, note: 'Rebuilt XRef table & object streams cleanly.' });
        } catch {
          const res = await compressPdf(bytes, { mode: 'raster', quality: 0.85, dpiScale: 1.5 });
          setResultInfo({ bytes: res.bytes, name: `${safeBase(file.name)}_recovered.pdf`, note: 'Recovered pages via clean page re-render.' });
        }
      }
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // --- Render Signature Canvas Events ---
  const getSigCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * sigCanvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * sigCanvasRef.current!.height,
    };
  };

  const needsSingleDrop =
    !['pdf-merge', 'pdf-organize', 'pdf-md2pdf', 'pdf-convert'].includes(tool.engine) ||
    (tool.engine === 'pdf-convert' && convSubMode === 'pdf2out');

  return (
    <div>
      <ToolHeader
        tool={tool}
        extra={
          file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setBytes(null);
                setInfo(null);
                setResultInfo(null);
              }}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            >
              Load Different PDF
            </button>
          )
        }
      />

      {statusMsg && (
        <div className="mb-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-ink)]">
          {statusMsg}
        </div>
      )}

      {/* Markdown to PDF */}
      {tool.engine === 'pdf-md2pdf' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Markdown Source">
            <input
              value={mdTitle}
              onChange={(e) => setMdTitle(e.target.value)}
              placeholder="Document Title"
              className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold"
            />
            <textarea
              value={mdSource}
              onChange={(e) => setMdSource(e.target.value)}
              rows={14}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
            <button
              type="button"
              onClick={async () => {
                const out = await textOrMarkdownToPdf(mdSource, mdTitle, true);
                downloadBytes(out, `${safeBase(mdTitle)}.pdf`);
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
            >
              <Download className="h-3.5 w-3.5" /> Generate & Download PDF
            </button>
          </Panel>
          <Panel title="Formatted Outline Preview">
            <div className="prose prose-sm max-w-none space-y-2 text-sm text-[var(--ink)]">
              {mdSource.split(/\r?\n/).map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold">{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold pt-2">{line.slice(3)}</h2>;
                if (line.startsWith('- ')) return <li key={i} className="ml-4">{line.slice(2)}</li>;
                return line.trim() ? <p key={i} className="text-[var(--ink-2)]">{line}</p> : <div key={i} className="h-2" />;
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* Merge / Organize Multi-Page Visual Studio */}
      {(tool.engine === 'pdf-merge' || tool.engine === 'pdf-organize') && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <FileDropzone
                accept=".pdf"
                multiple
                compact
                onFiles={handleLoadMultiPdfs}
                label={tool.engine === 'pdf-merge' ? 'Add PDFs to Merge (Multi-select)' : 'Open PDF to Organize Pages'}
                hint="Inspect every page thumbnail cleanly before saving"
              />
            </div>
            <div className="lg:col-span-7">
              <Panel title={`Assembled Document (${thumbs.length} Pages)`}>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      pushUndo([
                        ...thumbs,
                        {
                          uid: `blank_${Date.now()}`,
                          sourceIndex: -1,
                          rotation: 0,
                          thumbUrl: '',
                          label: 'Blank A4 Page',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-3)]"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" /> + Blank Page
                  </button>
                  <button
                    type="button"
                    disabled={!thumbs.length}
                    onClick={() => pushUndo([...thumbs].reverse())}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-3)] disabled:opacity-40"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Reverse Order
                  </button>
                  <button
                    type="button"
                    disabled={!undoStack.length}
                    onClick={() => {
                      const [prev, ...rest] = undoStack;
                      setThumbs(prev);
                      setUndoStack(rest);
                    }}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Undo ({undoStack.length})
                  </button>
                  <button
                    type="button"
                    disabled={!thumbs.length}
                    onClick={() => {
                      setSources([]);
                      setThumbs([]);
                      setResultInfo(null);
                    }}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] disabled:opacity-40"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    disabled={!thumbs.length || busy}
                    onClick={runMergeOrOrganize}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Build Final PDF
                  </button>
                </div>
              </Panel>
            </div>
          </div>

          {thumbs.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {thumbs.map((t, idx) => (
                <div
                  key={t.uid}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 flex flex-col"
                >
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
                    <span className="num">Page {idx + 1}</span>
                    {t.isBlank && <span className="text-amber-600">Blank</span>}
                  </div>
                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-2)]">
                    {t.thumbUrl ? (
                      <img
                        src={t.thumbUrl}
                        alt={t.label}
                        style={{ transform: `rotate(${t.rotation}deg)` }}
                        className="max-h-full max-w-full object-contain transition-transform"
                      />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Blank A4</span>
                    )}
                  </div>
                  <div className="mt-2 truncate text-[11px] text-[var(--ink-2)]" title={t.label}>
                    {t.label}
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const copy = [...thumbs];
                        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                        pushUndo(copy);
                      }}
                      className="rounded border border-[var(--line)] p-1 flex justify-center disabled:opacity-30"
                      title="Move earlier"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === thumbs.length - 1}
                      onClick={() => {
                        const copy = [...thumbs];
                        [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
                        pushUndo(copy);
                      }}
                      className="rounded border border-[var(--line)] p-1 flex justify-center disabled:opacity-30"
                      title="Move later"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...thumbs];
                        copy[idx] = { ...t, rotation: (t.rotation + 90) % 360 };
                        pushUndo(copy);
                      }}
                      className="rounded border border-[var(--line)] p-1 flex justify-center"
                      title="Rotate +90°"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...thumbs];
                        copy.splice(idx + 1, 0, { ...t, uid: `${t.uid}_dup_${Date.now()}` });
                        pushUndo(copy);
                      }}
                      className="rounded border border-[var(--line)] p-1 flex justify-center"
                      title="Duplicate page"
                    >
                      <CopyPlus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => pushUndo(thumbs.filter((_, k) => k !== idx))}
                      className="rounded border border-[var(--line)] p-1 flex justify-center text-[var(--danger)]"
                      title="Remove page"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Convert PDF (8 Modes + Images to PDF + Text to PDF) */}
      {tool.engine === 'pdf-convert' && (
        <div className="space-y-5">
          <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
            {[
              { id: 'pdf2out', label: 'PDF -> PNG / JPG / WebP / Scroll / MD / HTML / JSON' },
              { id: 'img2pdf', label: 'Images -> PDF' },
              { id: 'txt2pdf', label: 'Text / Markdown -> PDF' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setConvSubMode(m.id as 'pdf2out' | 'img2pdf' | 'txt2pdf');
                  setResultInfo(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  convSubMode === m.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {convSubMode === 'img2pdf' && (
            <Panel title="Images to PDF">
              <FileDropzone
                accept="image/*"
                multiple
                onFiles={(fs) => setConvImages((prev) => [...prev, ...fs])}
                label={`Drop PNG / JPG / WebP images (${convImages.length} selected)`}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  value={imgPageSize}
                  onChange={(e) => setImgPageSize(e.target.value as 'a4' | 'letter' | 'fit')}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold"
                >
                  <option value="a4">A4 Page Size</option>
                  <option value="letter">US Letter Page Size</option>
                  <option value="fit">Fit Page to Original Image</option>
                </select>
                <button
                  type="button"
                  disabled={!convImages.length || busy}
                  onClick={runConvert}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  Convert {convImages.length} Image(s) to PDF
                </button>
              </div>
            </Panel>
          )}

          {convSubMode === 'txt2pdf' && (
            <Panel title="Text to PDF">
              <textarea
                rows={10}
                value={rawTextToPdf}
                onChange={(e) => setRawTextToPdf(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
              />
              <button
                type="button"
                disabled={busy}
                onClick={runConvert}
                className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
              >
                Render to A4 PDF
              </button>
            </Panel>
          )}
        </div>
      )}

      {/* Single-PDF Input Dropzone (for single-file PDF tools) */}
      {needsSingleDrop && !bytes && (
        <FileDropzone
          accept=".pdf"
          onFiles={(fs) => fs[0] && handleLoadSinglePdf(fs[0])}
          label={`Drop your PDF file to start "${tool.name}"`}
          hint="100% private client-side processing — your PDF never leaves your browser"
        />
      )}

      {/* Active Single-PDF Workspace */}
      {needsSingleDrop && bytes && file && info && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Document" value={file.name.length > 18 ? file.name.slice(0, 16) + '...' : file.name} sub={fmtBytes(file.size)} />
            <StatTile label="Pages" value={info.pageCount} sub={info.pageDimensions[0] ? `${info.pageDimensions[0].widthPt}×${info.pageDimensions[0].heightPt} pt` : undefined} />
            <StatTile label="Form Fields" value={info.formFieldCount} />
            <StatTile label="Author" value={info.author || 'Unspecified'} />
          </div>

          {/* 1. Compress */}
          {tool.engine === 'pdf-compress' && (
            <Panel title="Compression Strategy">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Engine Mode</label>
                  <select
                    value={compMode}
                    onChange={(e) => setCompMode(e.target.value as 'auto' | 'smart' | 'raster' | 'lossless')}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                  >
                    <option value="auto">Auto (Best Savings vs Quality)</option>
                    <option value="smart">Smart Image Recompression</option>
                    <option value="raster">Full Raster Compress</option>
                    <option value="lossless">Lossless Structure Cleanup Only</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Color Profile</label>
                  <select
                    value={compColor}
                    onChange={(e) => setCompColor(e.target.value as 'color' | 'grayscale' | 'bw-scan')}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                  >
                    <option value="color">Full Color</option>
                    <option value="grayscale">Grayscale (Ink-Saver)</option>
                    <option value="bw-scan">B&W High-Contrast Scan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Target Size KB (0 = off)</label>
                  <input
                    type="number"
                    min={0}
                    value={targetKb}
                    onChange={(e) => setTargetKb(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 500"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-xs font-semibold">
                    <span>JPEG Quality</span>
                    <span className="font-mono">{Math.round(compQuality * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.25}
                    max={0.95}
                    step={0.05}
                    value={compQuality}
                    onChange={(e) => setCompQuality(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-xs font-semibold">
                    <span>Render DPI Scale</span>
                    <span className="font-mono">{Math.round(compDpi * 72)} DPI</span>
                  </label>
                  <input
                    type="range"
                    min={1.0}
                    max={2.2}
                    step={0.1}
                    value={compDpi}
                    onChange={(e) => setCompDpi(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Page Subset (optional)</label>
                  <input
                    value={compRange}
                    onChange={(e) => setCompRange(e.target.value)}
                    placeholder="All pages (or e.g. 1-5)"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runCompress}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" /> {busy ? 'Compressing...' : 'Compress PDF Now'}
              </button>
            </Panel>
          )}

          {/* 2. Split */}
          {tool.engine === 'pdf-split' && (
            <Panel title="Split Configuration">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Split Method</label>
                  <select
                    value={splitMode}
                    onChange={(e) => setSplitMode(e.target.value as 'single' | 'every-n' | 'odd-even' | 'halves' | 'custom')}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                  >
                    <option value="single">Every Single Page → ZIP</option>
                    <option value="every-n">Every N Pages → ZIP</option>
                    <option value="odd-even">Odd &amp; Even Pages → ZIP</option>
                    <option value="halves">Split in Two Halves → ZIP</option>
                    <option value="custom">Custom Ranges (e.g. 1-3, 4-last)</option>
                  </select>
                </div>
                {splitMode === 'every-n' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Pages per Chunk (N)</label>
                    <input
                      type="number"
                      min={1}
                      max={info.pageCount}
                      value={splitEveryN}
                      onChange={(e) => setSplitEveryN(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs"
                    />
                  </div>
                )}
                {splitMode === 'custom' && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">Range Chunks (comma separated)</label>
                    <input
                      value={splitCustom}
                      onChange={(e) => setSplitCustom(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runSplit}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Split & Export ZIP
              </button>
            </Panel>
          )}

          {/* 3. Convert PDF2Out */}
          {tool.engine === 'pdf-convert' && convSubMode === 'pdf2out' && (
            <Panel title="Export Format">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['png', 'PNG Pages'],
                  ['jpg', 'JPG Pages'],
                  ['webp', 'WebP Pages'],
                  ['long-png', 'Long Scroll Image'],
                  ['grid-png', 'Grid Contact Sheet'],
                  ['md', 'Markdown (.md)'],
                  ['html', 'Clean HTML (.html)'],
                  ['json', 'Structured JSON'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setConvFormat(id as typeof convFormat)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                      convFormat === id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                        : 'border-[var(--line)] bg-[var(--surface-2)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runConvert}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Convert PDF Now
              </button>
            </Panel>
          )}

          {/* 4. Clean PDF */}
          {tool.engine === 'pdf-clean' && (
            <Panel title={`Clean-up & Blank Page Scanner (${blankSet.size} blank detected)`}>
              <div className="mb-4 flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={stripMeta} onChange={(e) => setStripMeta(e.target.checked)} />
                  Strip Author/Title/Keywords Metadata
                </label>
                <label className="inline-flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={flattenAcro} onChange={(e) => setFlattenAcro(e.target.checked)} />
                  Flatten Interactive Forms
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {cleanThumbs.map((ct) => {
                  const markedDrop = dropPages.has(ct.page);
                  return (
                    <button
                      key={ct.page}
                      type="button"
                      onClick={() => {
                        const next = new Set(dropPages);
                        if (next.has(ct.page)) next.delete(ct.page);
                        else next.add(ct.page);
                        setDropPages(next);
                      }}
                      className={`rounded-lg border p-1.5 text-left transition-all ${
                        markedDrop ? 'border-red-400 bg-red-50/70 opacity-60 dark:bg-red-950/30' : 'border-[var(--line)]'
                      }`}
                    >
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span>P.{ct.page}</span>
                        <span className={markedDrop ? 'text-red-600' : 'text-emerald-600'}>
                          {markedDrop ? 'Drop' : 'Keep'}
                        </span>
                      </div>
                      <img src={ct.thumbUrl} alt={`Page ${ct.page}`} className="mt-1 h-24 w-full object-contain" />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runClean}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Clean PDF & Remove {dropPages.size} Page(s)
              </button>
            </Panel>
          )}

          {/* 5. Crop PDF */}
          {tool.engine === 'pdf-crop' && (
            <div className="grid gap-5 lg:grid-cols-12">
              <Panel title="Crop Margin Percentages" className="lg:col-span-5">
                <div className="space-y-3 text-xs">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <div key={side}>
                      <label className="mb-1 flex justify-between font-semibold capitalize">
                        <span>{side} trim</span>
                        <span className="font-mono">{cropMargins[side]}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={cropMargins[side]}
                        onChange={(e) => setCropMargins((m) => ({ ...m, [side]: Number(e.target.value) }))}
                        className="w-full accent-[var(--accent)]"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block font-semibold">Apply to Pages (blank = all)</label>
                    <input
                      value={cropRange}
                      onChange={(e) => setCropRange(e.target.value)}
                      placeholder="e.g. 1-3, 5"
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={runCrop}
                    className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-bold text-white"
                  >
                    Apply Crop Box & Save PDF
                  </button>
                </div>
              </Panel>
              <Panel title="Visual Crop Preview (Page 1)" className="lg:col-span-7">
                {cropPreviewUrl && (
                  <div className="relative mx-auto inline-block overflow-hidden rounded-lg border border-[var(--line)]">
                    <img src={cropPreviewUrl} alt="Crop preview" className="max-h-96 object-contain" />
                    <div
                      className="pointer-events-none absolute border-2 border-dashed border-rose-500 bg-rose-500/10"
                      style={{
                        top: `${cropMargins.top}%`,
                        right: `${cropMargins.right}%`,
                        bottom: `${cropMargins.bottom}%`,
                        left: `${cropMargins.left}%`,
                      }}
                    />
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* 6. Redact */}
          {tool.engine === 'pdf-redact' && (
            <Panel title="Permanent Text Redaction (Burns Black Boxes & Flattens)">
              <label className="mb-1 block text-xs font-semibold">
                Keywords or Phrases to Redact Permanently (comma separated)
              </label>
              <input
                value={redactInput}
                onChange={(e) => setRedactInput(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={scanRedactMatches}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-semibold"
                >
                  Scan Matches First
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={runRedact}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                  Permanently Redact & Flatten
                </button>
              </div>
              {redactMatches.length > 0 && (
                <div className="mt-3 rounded-lg bg-[var(--surface-2)] p-3 text-xs space-y-1">
                  <div className="font-bold">Found {redactMatches.length} page match(es):</div>
                  {redactMatches.map((m, i) => (
                    <div key={i} className="text-[var(--ink-2)]">• {m.snippet}</div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* 7. Sign PDF */}
          {tool.engine === 'pdf-sign' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Draw or Load Signature">
                <canvas
                  ref={sigCanvasRef}
                  width={460}
                  height={160}
                  onPointerDown={(e) => {
                    setSigDrawing(true);
                    const ctx = sigCanvasRef.current!.getContext('2d')!;
                    const { x, y } = getSigCoords(e);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                  }}
                  onPointerMove={(e) => {
                    if (!sigDrawing) return;
                    const ctx = sigCanvasRef.current!.getContext('2d')!;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#0f172a';
                    const { x, y } = getSigCoords(e);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                  }}
                  onPointerUp={() => {
                    setSigDrawing(false);
                    setSigDataUrl(sigCanvasRef.current!.toDataURL('image/png'));
                  }}
                  className="w-full cursor-crosshair rounded-lg border border-[var(--line-strong)] bg-white touch-none"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = sigCanvasRef.current!;
                      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
                      setSigDataUrl('');
                    }}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
                  >
                    Clear Pad
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigDataUrl(sigCanvasRef.current!.toDataURL('image/png'))}
                    className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold"
                  >
                    Capture Pad
                  </button>
                </div>
              </Panel>
              <Panel title="Placement & Stamp">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="mb-1 block font-semibold">Apply to Pages</label>
                    <select
                      value={sigPageMode}
                      onChange={(e) => setSigPageMode(e.target.value as 'last' | 'first' | 'all' | 'custom')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <option value="last">Last Page Only</option>
                      <option value="first">First Page Only</option>
                      <option value="all">Every Page</option>
                      <option value="custom">Specific Page Number</option>
                    </select>
                  </div>
                  {sigPageMode === 'custom' && (
                    <input
                      type="number"
                      min={1}
                      max={info.pageCount}
                      value={sigCustomPage}
                      onChange={(e) => setSigCustomPage(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                    />
                  )}
                  <div>
                    <label className="mb-1 block font-semibold">Corner Anchor</label>
                    <select
                      value={sigAnchor}
                      onChange={(e) => setSigAnchor(e.target.value as typeof sigAnchor)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="center">Page Center</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!sigDataUrl || busy}
                    onClick={runSign}
                    className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-bold text-white disabled:opacity-40"
                  >
                    Stamp Signature onto PDF
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {/* 8. Stamps, Headers, Watermark, Page Numbers */}
          {tool.engine === 'pdf-stamp' && (
            <Panel title="Headers, Footers, Watermarks & Bates Numbers">
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold">Header ({`{page}, {pages}, {date}, {filename}`})</label>
                  <input
                    value={headerTxt}
                    onChange={(e) => setHeaderTxt(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Footer</label>
                  <input
                    value={footerTxt}
                    onChange={(e) => setFooterTxt(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Diagonal Watermark Text</label>
                  <input
                    value={wmTxt}
                    onChange={(e) => setWmTxt(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between font-semibold">
                    <span>Watermark Opacity</span>
                    <span className="font-mono">{Math.round(wmOpacity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={wmOpacity}
                    onChange={(e) => setWmOpacity(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Page Numbering Style</label>
                  <select
                    value={pageNumFmt}
                    onChange={(e) => setPageNumFmt(e.target.value as typeof pageNumFmt)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <option value="x-of-y">1 / N</option>
                    <option value="page-x">Page 1</option>
                    <option value="bates">Legal Bates (PREFIX-00001)</option>
                    <option value="none">None</option>
                  </select>
                </div>
                {pageNumFmt === 'bates' ? (
                  <div>
                    <label className="mb-1 block font-semibold">Bates Prefix</label>
                    <input
                      value={batesPrefix}
                      onChange={(e) => setBatesPrefix(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block font-semibold">Optional Top-Right Logo PNG/JPG</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runStamp}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Apply Stamps & Save PDF
              </button>
            </Panel>
          )}

          {/* 9. Page Layout & N-Up */}
          {tool.engine === 'pdf-layout' && (
            <Panel title="Page Standardizer, N-Up & Booklet Imposition">
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold">Layout Transform</label>
                  <select
                    value={layoutMode}
                    onChange={(e) => setLayoutMode(e.target.value as typeof layoutMode)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <option value="nup">N-Up Multi-Page Sheet (2/4/6/9-up)</option>
                    <option value="resize">Standardize Size (A4/Letter/Legal/A3/A5)</option>
                    <option value="booklet">Booklet 2-Up Saddle-Stitch Imposition</option>
                    <option value="reverse">Reverse All Pages</option>
                  </select>
                </div>
                {layoutMode === 'nup' && (
                  <div>
                    <label className="mb-1 block font-semibold">Pages per Sheet</label>
                    <select
                      value={layoutNup}
                      onChange={(e) => setLayoutNup(Number(e.target.value) as 2 | 4 | 6 | 9)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <option value={2}>2-Up (Side-by-Side Landscape)</option>
                      <option value={4}>4-Up (2×2 Grid)</option>
                      <option value={6}>6-Up (3×2 Grid)</option>
                      <option value={9}>9-Up (3×3 Contact Sheet)</option>
                    </select>
                  </div>
                )}
                {layoutMode === 'resize' && (
                  <div>
                    <label className="mb-1 block font-semibold">Target Paper Format</label>
                    <select
                      value={layoutTargetSize}
                      onChange={(e) => setLayoutTargetSize(e.target.value as typeof layoutTargetSize)}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <option value="a4">A4 (210 × 297 mm)</option>
                      <option value="letter">US Letter (8.5 × 11 in)</option>
                      <option value="legal">US Legal (8.5 × 14 in)</option>
                      <option value="a3">A3 (297 × 420 mm)</option>
                      <option value="a5">A5 (148 × 210 mm)</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runLayout}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Transform PDF Layout
              </button>
            </Panel>
          )}

          {/* 10. Metadata */}
          {tool.engine === 'pdf-metadata' && (
            <Panel title="Edit Document Metadata">
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold">Title</label>
                  <input
                    value={metaFields.title}
                    onChange={(e) => setMetaFields((m) => ({ ...m, title: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Author</label>
                  <input
                    value={metaFields.author}
                    onChange={(e) => setMetaFields((m) => ({ ...m, author: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Subject</label>
                  <input
                    value={metaFields.subject}
                    onChange={(e) => setMetaFields((m) => ({ ...m, subject: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Keywords (comma separated)</label>
                  <input
                    value={metaFields.keywords}
                    onChange={(e) => setMetaFields((m) => ({ ...m, keywords: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runSaveMetadata}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Save Metadata to PDF
              </button>
            </Panel>
          )}

          {/* 11. Extract Text */}
          {tool.engine === 'pdf-extract' && (
            <Panel
              title="Extracted Document Text"
              actions={
                <>
                  <CopyButton text={extractedText} />
                  <button
                    type="button"
                    onClick={() => downloadText(extractedText, `${safeBase(file.name)}.txt`)}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
                  >
                    Download .TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToTool('txt-stats', { text: extractedText })}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Send className="h-3 w-3" /> Send to Text Studio
                  </button>
                </>
              }
            >
              <textarea
                readOnly
                rows={12}
                value={extractedText}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
              />
            </Panel>
          )}

          {/* 12. Extract Images */}
          {tool.engine === 'pdf-images' && (
            <Panel title="Extract Embedded Images">
              <p className="mb-3 text-xs text-[var(--muted)]">
                Carves embedded JPEG streams directly from PDF objects, or falls back to exporting sharp high-DPI PNG page renders into a ZIP archive.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const { zipBlob, count } = await extractPdfImagesToZip(bytes, file.name);
                  setResultInfo({
                    blob: zipBlob,
                    name: `${safeBase(file.name)}_images.zip`,
                    note: `Extracted ${count} image(s) cleanly into ZIP.`,
                  });
                  setBusy(false);
                }}
                className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Extract Images to ZIP
              </button>
            </Panel>
          )}

          {/* 13. Search in PDF */}
          {tool.engine === 'pdf-search' && (
            <Panel title="Search & Highlight on Page Canvas">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch(searchActivePage)}
                  placeholder="Enter keyword or phrase to highlight..."
                  className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => runSearch(1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
                >
                  <Search className="h-3.5 w-3.5" /> Search
                </button>
              </div>
              {searchHits.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {searchHits
                      .filter((h) => h.count > 0)
                      .map((h) => (
                        <button
                          key={h.page}
                          type="button"
                          onClick={() => runSearch(h.page)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                            searchActivePage === h.page
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                              : 'border-[var(--line)]'
                          }`}
                        >
                          Page {h.page} ({h.count})
                        </button>
                      ))}
                  </div>
                  {searchPreviewUrl && (
                    <img
                      src={searchPreviewUrl}
                      alt="Highlighted PDF match"
                      className="max-h-[540px] rounded-lg border border-[var(--line)] object-contain"
                    />
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* 14. Compare Two PDFs */}
          {tool.engine === 'pdf-compare' && (
            <Panel title="Compare with Second PDF (Document B)">
              <FileDropzone
                accept=".pdf"
                compact
                onFiles={async (fs) => {
                  if (!fs[0]) return;
                  setCompareFileB(fs[0]);
                  setCompareBytesB(await readFileAsBytes(fs[0]));
                }}
                label={compareFileB ? `Loaded Document B: ${compareFileB.name}` : 'Drop Second PDF (Version B)'}
              />
              {compareBytesB && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={runCompare}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
                  >
                    Run Pixel Diff Comparison
                  </button>
                  {compareData && (
                    <div className="ml-auto inline-flex rounded-lg border border-[var(--line)] p-0.5 text-xs">
                      {(['diff', 'side', 'swipe'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCompareView(v)}
                          className={`rounded-md px-2.5 py-1 font-semibold capitalize ${
                            compareView === v ? 'bg-[var(--accent)] text-white' : ''
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {compareData && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-bold text-[var(--ink)]">
                    Visual Difference Score: <span className="font-mono text-rose-600">{compareData.diffPct.toFixed(2)}%</span> pixels changed
                  </div>
                  {compareView === 'diff' && (
                    <img src={compareData.urlDiff} alt="Pixel Diff" className="max-h-[540px] rounded-lg border border-[var(--line)]" />
                  )}
                  {compareView === 'side' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <img src={compareData.urlA} alt="Doc A" className="rounded-lg border border-[var(--line)]" />
                      <img src={compareData.urlB} alt="Doc B" className="rounded-lg border border-[var(--line)]" />
                    </div>
                  )}
                  {compareView === 'swipe' && (
                    <div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={swipePct}
                        onChange={(e) => setSwipePct(Number(e.target.value))}
                        className="mb-2 w-full accent-[var(--accent)]"
                      />
                      <div className="relative inline-block overflow-hidden rounded-lg border border-[var(--line)]">
                        <img src={compareData.urlB} alt="Doc B" className="block max-h-[500px]" />
                        <div
                          className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-[var(--accent)]"
                          style={{ width: `${swipePct}%` }}
                        >
                          <img src={compareData.urlA} alt="Doc A" className="block max-h-[500px] max-w-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* 15. Quick Tools: Grayscale / Flatten / Repair */}
          {tool.engine === 'pdf-quick' && (
            <Panel title={tool.name}>
              <p className="mb-3 text-xs text-[var(--muted)]">{tool.desc}</p>
              <button
                type="button"
                disabled={busy}
                onClick={runQuickTool}
                className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
              >
                Run {tool.name}
              </button>
            </Panel>
          )}
        </div>
      )}

      {/* Output Result Card */}
      {resultInfo && (
        <Panel title="Ready for Download" className="mt-5 border-emerald-300 dark:border-emerald-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <Check className="h-4 w-4" /> {resultInfo.name}
              </div>
              {resultInfo.note && <div className="mt-1 text-xs text-[var(--muted)]">{resultInfo.note}</div>}
              {file && resultInfo.bytes && (
                <div className="mt-2 flex items-center gap-3 font-mono text-xs">
                  <span>Original: {fmtBytes(file.size)}</span>
                  <span>→</span>
                  <span className="font-bold text-emerald-600">Output: {fmtBytes(resultInfo.bytes.byteLength)}</span>
                  {resultInfo.bytes.byteLength < file.size && (
                    <span className="font-bold text-emerald-600">
                      (-{Math.round(((file.size - resultInfo.bytes.byteLength) / file.size) * 100)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (resultInfo.bytes) downloadBytes(resultInfo.bytes, resultInfo.name);
                else if (resultInfo.blob) downloadBlob(resultInfo.blob, resultInfo.name);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Download className="h-3.5 w-3.5" /> Download Output
            </button>
          </div>
          {resultInfo.previewImg && (
            <img src={resultInfo.previewImg} alt="Preview" className="mt-4 max-h-64 rounded-lg border border-[var(--line)]" />
          )}
          {resultInfo.previewText && (
            <textarea
              readOnly
              rows={8}
              value={resultInfo.previewText}
              className="mt-4 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
          )}
        </Panel>
      )}
    </div>
  );
}
