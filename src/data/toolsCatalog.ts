export type ToolCategory =
  | 'PDF Workspace'
  | 'Pro Batch Studio'
  | 'Image Studio'
  | 'Text Studio'
  | 'File & Data'
  | 'Calculators'
  | 'Developer Tools'
  | 'Productivity'
  | 'Travel Tools'
  | 'Everyday Utilities'
  | 'Business & Print';

export interface ToolDef {
  id: string;
  name: string;
  desc: string;
  cat: ToolCategory;
  engine: string;
  tab?: string;
  color: string;
  popular?: boolean;
  keywords?: string;
}

export const CATEGORIES: { id: ToolCategory; label: string; short: string; color: string; desc: string }[] = [
  { id: 'PDF Workspace', label: 'PDF Workspace', short: 'PDF', color: '#4f46e5', desc: '22 dedicated private PDF tools: compress, merge, split, organize, redact, sign, stamp & compare.' },
  { id: 'Pro Batch Studio', label: 'Pro Batch Studio', short: 'Batch', color: '#0ea5e9', desc: '36 bulk engines: 16 PDF batch engines & 20 Image/File batch engines with multi-queue ZIP export.' },
  { id: 'Image Studio', label: 'Image Studio', short: 'Image', color: '#ec4899', desc: '29 visual canvas tools: compress to KB, convert, crop, annotate, frames, palettes, GIF & SVG trace.' },
  { id: 'Text Studio', label: 'Text Studio', short: 'Text', color: '#8b5cf6', desc: '23 writing tools: counters, case converter, regex/diff, GFM markdown, unicode & handwriting pages.' },
  { id: 'File & Data', label: 'File & Data', short: 'Data', color: '#f59e0b', desc: '19 file & schema tools: ZIP builder/inspector, CSV/JSON/XML, checksums, magic MIME & mock data.' },
  { id: 'Calculators', label: 'Calculators', short: 'Calc', color: '#10b981', desc: '38 math, calculus graphing, loan EMI, VAT/profit, GPA/CGPA, statistics & health calculators.' },
  { id: 'Developer Tools', label: 'Developer Tools', short: 'Dev', color: '#06b6d4', desc: '15 dev utilities: Base64, URL parser, UUID/Unix, color/WCAG contrast, regex & formatters.' },
  { id: 'Productivity', label: 'Productivity', short: 'Focus', color: '#14b8a6', desc: '14 focus tools: Pomodoro, stopwatch, intervals, tasks, habits, budget & EN/BN typing test.' },
  { id: 'Travel Tools', label: 'Travel Tools', short: 'Travel', color: '#f97316', desc: '12 trip utilities: group debt splitter, packing checklists, 24h world clock, distance & solar.' },
  { id: 'Everyday Utilities', label: 'Everyday Utilities', short: 'Everyday', color: '#6366f1', desc: '27 daily essentials: offline QR/Barcode, live currency, units, Bangla phonetic, Prayer/Zakat & spin wheel.' },
  { id: 'Business & Print', label: 'Business & Print', short: 'Business', color: '#be123c', desc: '11 print-ready makers: Invoice, Money Receipt, Certificate, Cheque Words EN/BN, BAJUS Gold & Labels.' },
];

export const TOOLS_CATALOG: ToolDef[] = [
  // ======================== 1. PDF WORKSPACE (22 Tools) ========================
  { id: 'pdf-compress', name: 'Compress PDF', desc: 'Auto, smart image shrink, target-KB binary search & lossless cleanup', cat: 'PDF Workspace', engine: 'pdf-compress', color: '#4f46e5', popular: true, keywords: 'shrink reduce target kb' },
  { id: 'pdf-merge', name: 'Merge PDFs', desc: 'Combine multiple PDFs at page level with drag reorder, rotate & blank pages', cat: 'PDF Workspace', engine: 'pdf-merge', color: '#4f46e5', popular: true, keywords: 'combine join append' },
  { id: 'pdf-split', name: 'Split & Extract', desc: 'Split every page, every N pages, odd/even, halves or custom range to ZIP', cat: 'PDF Workspace', engine: 'pdf-split', color: '#4f46e5', popular: true, keywords: 'extract pages zip range' },
  { id: 'pdf-organize', name: 'Organize Pages', desc: 'Visual thumbnail grid to reorder, rotate, duplicate, reverse & delete pages', cat: 'PDF Workspace', engine: 'pdf-organize', color: '#6366f1', popular: true, keywords: 'reorder rotate delete reverse' },
  { id: 'pdf-convert', name: 'Convert PDF (8 Modes)', desc: 'PDF to PNG/JPG/WebP, Long Scroll, Contact Sheet, Markdown, HTML, JSON & Images to PDF', cat: 'PDF Workspace', engine: 'pdf-convert', color: '#0ea5e9', popular: true, keywords: 'png jpg webp html markdown json images to pdf' },
  { id: 'pdf-clean', name: 'Clean-up PDF', desc: 'Visual blank-page scanner, strip metadata, annotations & bookmarks', cat: 'PDF Workspace', engine: 'pdf-clean', color: '#10b981', keywords: 'blank page sanitize metadata' },
  { id: 'pdf-crop', name: 'Crop Pages', desc: 'Trim margins interactively with live preview & auto-whitespace detection', cat: 'PDF Workspace', engine: 'pdf-crop', color: '#f59e0b', keywords: 'trim margin cropbox' },
  { id: 'pdf-redact', name: 'Permanent Redact', desc: 'Scan keywords, emails, phones or IDs and burn opaque black boxes permanently', cat: 'PDF Workspace', engine: 'pdf-redact', color: '#dc2626', keywords: 'blackout hide sensitive pii' },
  { id: 'pdf-sign', name: 'Sign PDF', desc: 'Draw or upload a signature and stamp it onto first, last, all or custom pages', cat: 'PDF Workspace', engine: 'pdf-sign', color: '#7c3aed', popular: true, keywords: 'signature sign esign' },
  { id: 'pdf-stamp', name: 'Stamps & Headers', desc: 'Headers, footers, Bates/page numbers & logo stamps with dynamic tokens', cat: 'PDF Workspace', engine: 'pdf-stamp', color: '#2563eb', keywords: 'header footer bates logo' },
  { id: 'pdf-watermark', name: 'Watermark & Numbers', desc: 'Add diagonal text watermarks, opacity controls & page numbering', cat: 'PDF Workspace', engine: 'pdf-stamp', tab: 'watermark', color: '#8b5cf6', keywords: 'confidential draft page numbers' },
  { id: 'pdf-layout', name: 'Page Layout & N-Up', desc: 'Resize to A4/Letter/Legal, N-Up 2/4/6/9-per-sheet, Booklet or Reverse order', cat: 'PDF Workspace', engine: 'pdf-layout', color: '#0284c7', keywords: 'a4 letter nup booklet impose' },
  { id: 'pdf-metadata', name: 'Metadata Inspector', desc: 'Inspect and edit PDF Title, Author, Subject, Keywords & producer fields', cat: 'PDF Workspace', engine: 'pdf-metadata', color: '#64748b', keywords: 'title author properties' },
  { id: 'pdf-extract', name: 'Extract Text', desc: 'Extract clean page-by-page text to TXT or send directly to Text Studio', cat: 'PDF Workspace', engine: 'pdf-extract', color: '#0d9488', keywords: 'text copy txt export' },
  { id: 'pdf-images', name: 'Extract Images', desc: 'Carve embedded JPEG assets or export crisp page renders into a ZIP archive', cat: 'PDF Workspace', engine: 'pdf-images', color: '#ec4899', keywords: 'images photos extract zip' },
  { id: 'pdf-search', name: 'Search in PDF', desc: 'Full-text keyword search with highlighted bounding boxes on rendered pages', cat: 'PDF Workspace', engine: 'pdf-search', color: '#d97706', keywords: 'find highlight search' },
  { id: 'pdf-compare', name: 'Compare PDFs', desc: 'Pixel-by-pixel difference map, side-by-side & interactive swipe slider', cat: 'PDF Workspace', engine: 'pdf-compare', color: '#e11d48', keywords: 'diff compare two files' },
  { id: 'pdf-grayscale', name: 'PDF to Grayscale', desc: 'Convert color PDF pages into crisp ink-saving grayscale or B&W scan', cat: 'PDF Workspace', engine: 'pdf-quick', tab: 'grayscale', color: '#475569', keywords: 'black white ink save' },
  { id: 'pdf-flatten', name: 'Flatten PDF', desc: 'Flatten interactive AcroForm fields into permanent non-editable content', cat: 'PDF Workspace', engine: 'pdf-quick', tab: 'flatten', color: '#334155', keywords: 'forms lock flatten' },
  { id: 'pdf-repair', name: 'Repair PDF', desc: 'Rebuild broken cross-reference tables or recover pages via safe re-render', cat: 'PDF Workspace', engine: 'pdf-quick', tab: 'repair', color: '#ea580c', keywords: 'fix corrupt recover' },
  { id: 'pdf-md2pdf', name: 'Markdown to PDF', desc: 'Render formatted Markdown headings, lists & code directly into clean A4 PDF', cat: 'PDF Workspace', engine: 'pdf-md2pdf', color: '#4f46e5', keywords: 'markdown write create pdf' },
  { id: 'pdf-batch', name: 'PDF Batch Studio (16 Engines)', desc: 'Process dozens of PDFs across 16 bulk engines with Queue A/B/C & ZIP export', cat: 'PDF Workspace', engine: 'pdf-batch', color: '#0ea5e9', popular: true, keywords: 'bulk queue multiple pdf' },

  // ======================== 2. PRO BATCH STUDIO (20 Non-PDF + Link to 16 PDF) ========================
  { id: 'batch-pdf-hub', name: 'PDF Batch Processing (16 Engines)', desc: 'Compress, merge, split, rotate, watermark, img2pdf, pdf2img, Bates, resize & text in bulk', cat: 'Pro Batch Studio', engine: 'pdf-batch', color: '#4f46e5', popular: true, keywords: 'pdf bulk batch queue' },
  { id: 'batch-img-convert', name: 'Batch Image Format Converter', desc: 'Convert dozens of images to JPG, PNG or WebP in one ZIP', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-convert', color: '#ec4899' },
  { id: 'batch-img-compress', name: 'Batch Image Compressor', desc: 'Compress and shrink multiple images with uniform quality', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-compress', color: '#f43f5e' },
  { id: 'batch-img-resize', name: 'Batch Image Resizer', desc: 'Resize multiple photos by max width or percentage cleanly', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-resize', color: '#8b5cf6' },
  { id: 'batch-img-rename', name: 'Batch Image Renamer', desc: 'Rename photos using {index}, {name}, {date} pattern templates', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-rename', color: '#6366f1' },
  { id: 'batch-img-watermark', name: 'Batch Image Watermarker', desc: 'Stamp a protective text watermark across dozens of images at once', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-watermark', color: '#0ea5e9' },
  { id: 'batch-img-crop', name: 'Batch Image Cropper', desc: 'Center-crop all queued images to 1:1 square, 16:9 or 4:5 ratios', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-crop', color: '#14b8a6' },
  { id: 'batch-img-rotate', name: 'Batch Image Rotation & Flipping', desc: 'Rotate 90°/180°/270° or flip a full batch of photos', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-rotate', color: '#10b981' },
  { id: 'batch-img-border', name: 'Batch Image Border & Padding', desc: 'Add uniform white or colored frames around every queued photo', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-border', color: '#f59e0b' },
  { id: 'batch-img-strip', name: 'Batch Image Metadata Remover', desc: 'Re-encode images via clean canvas to strip all EXIF/GPS metadata', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-strip', color: '#64748b' },
  { id: 'batch-img-quality', name: 'Batch Image Quality Adjuster', desc: 'Tune JPEG/WebP quality factor uniformly across an image set', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-compress', color: '#d946ef' },
  { id: 'batch-img-opt', name: 'Batch Image Format Optimizer', desc: 'Automatically output WebP/JPG for smallest web payload', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'img-opt', color: '#0284c7' },
  { id: 'batch-file-rename', name: 'Batch File Renamer', desc: 'Apply prefix, suffix, find/replace & sequential numbering to any files', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'file-rename', color: '#475569' },
  { id: 'batch-zip-create', name: 'Batch ZIP Creator', desc: 'Package any collection of files cleanly into a single compressed ZIP', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'zip-create', color: '#f59e0b' },
  { id: 'batch-zip-extract', name: 'Batch ZIP Extractor', desc: 'Unpack multiple ZIP files and inspect/download every inner entry', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'zip-extract', color: '#ea580c' },
  { id: 'batch-file-org', name: 'Batch File Organizer', desc: 'Sort files into categorized subfolders by extension & export ZIP', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'file-org', color: '#0d9488' },
  { id: 'batch-csv-conv', name: 'Batch CSV Converter', desc: 'Convert a batch of CSV files into JSON arrays packaged as a ZIP', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'csv-conv', color: '#22c55e' },
  { id: 'batch-json-fmt', name: 'Batch JSON Formatter', desc: 'Pretty-print and validate a batch of JSON files in one pass', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'json-fmt', color: '#3b82f6' },
  { id: 'batch-checksum', name: 'Batch File Checksum Generator', desc: 'Compute SHA-256 & CRC-32 manifest CSV/JSON for every dropped file', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'checksum', color: '#334155' },
  { id: 'batch-fmt-conv', name: 'Batch Supported-Format Converter', desc: 'Auto-route CSV⇄JSON or JPG/PNG/WebP conversions across mixed files', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'fmt-conv', color: '#8b5cf6' },
  { id: 'batch-file-meta', name: 'Batch File Metadata Inspector', desc: 'Audit magic-byte MIME, Shannon entropy & sizes across multiple files', cat: 'Pro Batch Studio', engine: 'batch-nonpdf', tab: 'file-meta', color: '#06b6d4' },

  // ======================== 3. IMAGE STUDIO (29 Tools) ========================
  { id: 'img-convert', name: 'Image Format Converter', desc: 'Convert PNG, JPG, WebP cleanly with transparency handling', cat: 'Image Studio', engine: 'img-studio', tab: 'convert', color: '#ec4899', popular: true },
  { id: 'img-compress', name: 'Image Compressor', desc: 'Target exact KB file size via smart binary-search compression', cat: 'Image Studio', engine: 'img-studio', tab: 'compress', color: '#f43f5e', popular: true },
  { id: 'img-quality', name: 'Image Quality Adjuster', desc: 'Interactive quality slider with live byte-size comparison', cat: 'Image Studio', engine: 'img-studio', tab: 'compress', color: '#fb7185' },
  { id: 'img-resize', name: 'Image Resizer', desc: 'Resize to exact pixel dimensions or presets (HD, 4K, IG, Passport)', cat: 'Image Studio', engine: 'img-studio', tab: 'transform', color: '#8b5cf6' },
  { id: 'img-crop', name: 'Image Cropper', desc: 'Trim edges cleanly by percentage or preset aspect frames', cat: 'Image Studio', engine: 'img-studio', tab: 'transform', color: '#6366f1' },
  { id: 'img-aspect', name: 'Aspect Ratio Converter', desc: 'Fit or pad photos into 16:9, 1:1, 4:5, 9:16 or 3:2 ratios', cat: 'Image Studio', engine: 'img-studio', tab: 'transform', color: '#3b82f6' },
  { id: 'img-rotate', name: 'Image Rotator', desc: 'Rotate 90°, 180°, 270° cleanly with zero quality loss', cat: 'Image Studio', engine: 'img-studio', tab: 'transform', color: '#0ea5e9' },
  { id: 'img-flip', name: 'Image Flipper', desc: 'Mirror images horizontally or vertically with live preview', cat: 'Image Studio', engine: 'img-studio', tab: 'transform', color: '#06b6d4' },
  { id: 'img-editor', name: 'Image Editor & Filters', desc: 'Adjust Brightness, Contrast, Saturation, Blur, Sepia, Grayscale & Sharpen', cat: 'Image Studio', engine: 'img-studio', tab: 'editor', color: '#d946ef', popular: true },
  { id: 'img-enhance', name: 'Auto Photo Enhancer', desc: 'One-click contrast stretch and white-balance histogram normalization', cat: 'Image Studio', engine: 'img-studio', tab: 'editor', color: '#a855f7' },
  { id: 'img-border', name: 'Image Border & Mockups', desc: 'Wrap images in Gallery Border, Polaroid Frame, or macOS Window', cat: 'Image Studio', engine: 'img-studio', tab: 'frame', color: '#f59e0b' },
  { id: 'img-corners', name: 'Rounded Corners Generator', desc: 'Create crisp transparent rounded corners & pill avatars', cat: 'Image Studio', engine: 'img-studio', tab: 'frame', color: '#eab308' },
  { id: 'img-watermark', name: 'Image Watermarker', desc: 'Overlay customizable diagonal or corner copyright watermarks', cat: 'Image Studio', engine: 'img-studio', tab: 'annotate', color: '#14b8a6' },
  { id: 'img-meme', name: 'Caption & Meme Generator', desc: 'Add classic top/bottom Impact-style captions with crisp black outline', cat: 'Image Studio', engine: 'img-studio', tab: 'annotate', color: '#f97316' },
  { id: 'img-annotate', name: 'Image Annotator & Drawing', desc: 'Draw freehand highlights, arrows, boxes & redactions directly on canvas', cat: 'Image Studio', engine: 'img-studio', tab: 'annotate', color: '#ef4444' },
  { id: 'img-blur', name: 'Face & Region Blur/Pixelate', desc: 'Interactive brush to blur or pixelate sensitive regions on screenshots', cat: 'Image Studio', engine: 'img-studio', tab: 'annotate', color: '#dc2626' },
  { id: 'img-bgremove', name: 'Background Remover (Chroma + Brush)', desc: 'Click any background color with tolerance slider or manually erase pixels', cat: 'Image Studio', engine: 'img-studio', tab: 'bgremove', color: '#10b981', popular: true },
  { id: 'img-palette', name: 'Color Palette Extractor', desc: 'Extract dominant hex swatches & export visual palette poster PNG', cat: 'Image Studio', engine: 'img-studio', tab: 'inspect', color: '#ec4899' },
  { id: 'img-inspect', name: 'Image Metadata Inspector', desc: 'Inspect dimensions, megapixels, aspect ratio & MIME header', cat: 'Image Studio', engine: 'img-studio', tab: 'inspect', color: '#64748b' },
  { id: 'img-transparency', name: 'Transparency Inspector', desc: 'Measure exact transparent vs opaque pixel coverage on PNG/WebP', cat: 'Image Studio', engine: 'img-studio', tab: 'inspect', color: '#0284c7' },
  { id: 'img-favicon', name: 'Favicon Generator', desc: 'Generate 16x16, 32x32, 48x48 & Apple Touch PNGs in a single ZIP', cat: 'Image Studio', engine: 'img-studio', tab: 'icons', color: '#6366f1' },
  { id: 'img-pwa-icon', name: 'PWA & App Icon Generator', desc: 'Export complete 72px–512px PWA manifest icon bundle ZIP', cat: 'Image Studio', engine: 'img-studio', tab: 'icons', color: '#4f46e5' },
  { id: 'img-grid', name: 'Instagram Grid Cutter', desc: 'Slice any banner or photo into 3x1, 3x2 or 3x3 IG feed tiles ZIP', cat: 'Image Studio', engine: 'img-studio', tab: 'collage', color: '#db2777' },
  { id: 'img-collage', name: 'Photo Collage Maker', desc: 'Combine 2 to 6 photos into customizable multi-tile grid collages', cat: 'Image Studio', engine: 'img-studio', tab: 'collage', color: '#9333ea' },
  { id: 'img-stitch', name: 'Screenshot Stitcher', desc: 'Stitch multiple screenshots seamlessly vertically or horizontally', cat: 'Image Studio', engine: 'img-studio', tab: 'collage', color: '#0d9488' },
  { id: 'img-gif', name: 'GIF Maker', desc: 'Compile multiple uploaded frames into a looping animated GIF89a', cat: 'Image Studio', engine: 'img-studio', tab: 'gif', color: '#f59e0b' },
  { id: 'img-gif-frames', name: 'GIF / Sprite Frame Strip', desc: 'Split an image strip or inspect multi-frame preview strips to PNGs', cat: 'Image Studio', engine: 'img-studio', tab: 'gif', color: '#ea580c' },
  { id: 'img-vector', name: 'SVG Image Vectorizer', desc: 'Trace logos & silhouettes into clean scalable SVG vector paths', cat: 'Image Studio', engine: 'img-studio', tab: 'vector', color: '#2563eb' },
  { id: 'img-ocr', name: 'Image Contrast & OCR Prep', desc: 'Binarize & sharpen scanned text images + extract embedded text patterns', cat: 'Image Studio', engine: 'img-studio', tab: 'inspect', color: '#334155' },

  // ======================== 4. TEXT STUDIO (23 Tools) ========================
  { id: 'txt-stats', name: 'Word Counter', desc: 'Real-time word, character, sentence, paragraph & reading time counters', cat: 'Text Studio', engine: 'text-studio', tab: 'stats', color: '#8b5cf6', popular: true },
  { id: 'txt-chars', name: 'Character Counter', desc: 'Count characters with/without spaces, bytes & line lengths', cat: 'Text Studio', engine: 'text-studio', tab: 'stats', color: '#7c3aed' },
  { id: 'txt-sents', name: 'Sentence Counter', desc: 'Analyze sentence counts and average sentence length', cat: 'Text Studio', engine: 'text-studio', tab: 'stats', color: '#6366f1' },
  { id: 'txt-paras', name: 'Paragraph Counter', desc: 'Inspect paragraph counts and block distribution', cat: 'Text Studio', engine: 'text-studio', tab: 'stats', color: '#4f46e5' },
  { id: 'txt-readtime', name: 'Reading & Speaking Time', desc: 'Estimate silent reading (220 WPM) and speech duration (135 WPM)', cat: 'Text Studio', engine: 'text-studio', tab: 'stats', color: '#0ea5e9' },
  { id: 'txt-case', name: 'Case Converter (11 Styles)', desc: 'UPPER, lower, Title, Sentence, camelCase, snake_case, kebab-case & more', cat: 'Text Studio', engine: 'text-studio', tab: 'case', color: '#a855f7', popular: true },
  { id: 'txt-clean', name: 'Text Cleaner & Polish', desc: 'Strip extra blanks, zero-width chars, smart quotes & normalize spacing', cat: 'Text Studio', engine: 'text-studio', tab: 'clean', color: '#10b981' },
  { id: 'txt-spaces', name: 'Extra Space Remover', desc: 'Collapse repeated spaces and trim leading/trailing indentation', cat: 'Text Studio', engine: 'text-studio', tab: 'clean', color: '#14b8a6' },
  { id: 'txt-linebreak', name: 'Line Break Normalizer', desc: 'Remove awkward hard line-wraps from copied PDF paragraphs', cat: 'Text Studio', engine: 'text-studio', tab: 'clean', color: '#06b6d4' },
  { id: 'txt-sort', name: 'Line Sorter', desc: 'Sort lines A–Z, Z–A, numeric, by length or shuffle randomly', cat: 'Text Studio', engine: 'text-studio', tab: 'lines', color: '#3b82f6' },
  { id: 'txt-dedup', name: 'Duplicate Line Remover', desc: 'Remove duplicate lines cleanly with optional case-insensitive matching', cat: 'Text Studio', engine: 'text-studio', tab: 'lines', color: '#2563eb' },
  { id: 'txt-join', name: 'Text Joiner', desc: 'Merge multi-line lists using custom delimiters (comma, pipe, SQL IN)', cat: 'Text Studio', engine: 'text-studio', tab: 'lines', color: '#6366f1' },
  { id: 'txt-split', name: 'Text Splitter', desc: 'Split single-line delimiters cleanly onto individual lines', cat: 'Text Studio', engine: 'text-studio', tab: 'lines', color: '#8b5cf6' },
  { id: 'txt-replace', name: 'Find & Replace', desc: 'Fast bulk text replacement with match counter', cat: 'Text Studio', engine: 'text-studio', tab: 'diff', color: '#f59e0b' },
  { id: 'txt-regex-replace', name: 'Regex Find & Replace', desc: 'Search and replace using full JavaScript RegExp flags & capture groups', cat: 'Text Studio', engine: 'text-studio', tab: 'diff', color: '#ea580c' },
  { id: 'txt-diff', name: 'Text Difference Checker', desc: 'Line-by-line LCS diff highlighting additions & deletions', cat: 'Text Studio', engine: 'text-studio', tab: 'diff', color: '#ec4899', popular: true },
  { id: 'txt-slug', name: 'URL Slug Generator', desc: 'Convert article titles into clean SEO-friendly URL slugs', cat: 'Text Studio', engine: 'text-studio', tab: 'unicode', color: '#0d9488' },
  { id: 'txt-lorem', name: 'Lorem Ipsum Generator (EN/BN)', desc: 'Generate realistic English or বাংলা placeholder paragraphs', cat: 'Text Studio', engine: 'text-studio', tab: 'unicode', color: '#64748b' },
  { id: 'txt-markdown', name: 'Markdown Editor & Preview', desc: 'Split-pane GFM Markdown editor with live HTML preview & PDF export', cat: 'Text Studio', engine: 'text-studio', tab: 'markdown', color: '#4f46e5', popular: true },
  { id: 'txt-unicode', name: 'Unicode Inspector', desc: 'Inspect UTF-16 codepoints, U+XXXX hex & character breakdown', cat: 'Text Studio', engine: 'text-studio', tab: 'unicode', color: '#0284c7' },
  { id: 'txt-utf8', name: 'UTF-8 Hex Encoder/Decoder', desc: 'Encode UTF-8 strings to hex/percent bytes or decode back', cat: 'Text Studio', engine: 'text-studio', tab: 'unicode', color: '#334155' },
  { id: 'txt-fancy', name: 'Fancy Text Generator', desc: 'Transform text into Unicode Bold, Italic, Script, Mono & Bubble fonts', cat: 'Text Studio', engine: 'text-studio', tab: 'unicode', color: '#d946ef' },
  { id: 'txt-handwriting', name: 'Text to Handwriting Converter', desc: 'Render typed notes onto lined notebook paper PNG or printable A4 PDF', cat: 'Text Studio', engine: 'text-studio', tab: 'handwriting', color: '#e11d48', popular: true },

  // ======================== 5. FILE & DATA (19 Tools) ========================
  { id: 'fd-zip-create', name: 'ZIP Creator', desc: 'Compress multiple local files into a clean downloadable ZIP archive', cat: 'File & Data', engine: 'file-data', tab: 'zip-create', color: '#f59e0b', popular: true },
  { id: 'fd-zip-inspect', name: 'ZIP Inspector', desc: 'Browse internal directory tree, compressed & uncompressed sizes', cat: 'File & Data', engine: 'file-data', tab: 'zip-inspect', color: '#eab308' },
  { id: 'fd-zip-extract', name: 'ZIP Extractor', desc: 'Preview and extract individual files from any ZIP without installing software', cat: 'File & Data', engine: 'file-data', tab: 'zip-inspect', color: '#ca8a04' },
  { id: 'fd-csv2json', name: 'CSV to JSON Converter', desc: 'Parse RFC-4180 CSV spreadsheets cleanly into structured JSON objects', cat: 'File & Data', engine: 'file-data', tab: 'csv-json', color: '#10b981', popular: true },
  { id: 'fd-json2csv', name: 'JSON to CSV Converter', desc: 'Flatten JSON arrays into Excel-ready CSV files', cat: 'File & Data', engine: 'file-data', tab: 'csv-json', color: '#ec4899' },
  { id: 'fd-xml', name: 'XML ⇄ JSON Converter', desc: 'Convert XML payloads cleanly to JSON or serialize JSON into XML', cat: 'File & Data', engine: 'file-data', tab: 'xml', color: '#8b5cf6' },
  { id: 'fd-json-fmt', name: 'JSON Formatter', desc: 'Prettify JSON payloads with 2-space indent and syntax validation', cat: 'File & Data', engine: 'file-data', tab: 'json', color: '#06b6d4', popular: true },
  { id: 'fd-json-val', name: 'JSON Validator', desc: 'Validate JSON syntax, object counts & pinpointed error messages', cat: 'File & Data', engine: 'file-data', tab: 'json', color: '#16a34a' },
  { id: 'fd-json-min', name: 'JSON Minifier', desc: 'Strip formatting whitespace from JSON for compact production payloads', cat: 'File & Data', engine: 'file-data', tab: 'json', color: '#64748b' },
  { id: 'fd-json-sort', name: 'JSON Key Sorter', desc: 'Recursively sort all JSON object keys alphabetically A–Z', cat: 'File & Data', engine: 'file-data', tab: 'json', color: '#6366f1' },
  { id: 'fd-csv-view', name: 'CSV Table Viewer & Chart', desc: 'Sortable, searchable CSV spreadsheet grid with instant column bar chart', cat: 'File & Data', engine: 'file-data', tab: 'csv-grid', color: '#14b8a6', popular: true },
  { id: 'fd-csv-val', name: 'CSV Structure Validator', desc: 'Check header uniformity, ragged rows, empty cells & column statistics', cat: 'File & Data', engine: 'file-data', tab: 'csv-grid', color: '#d97706' },
  { id: 'fd-file-info', name: 'File Info & Hex Dump', desc: 'Inspect exact bytes, Shannon entropy (0–8) & 16-column Hex/ASCII dump', cat: 'File & Data', engine: 'file-data', tab: 'inspect', color: '#0ea5e9' },
  { id: 'fd-mime', name: 'Magic-Byte MIME Checker', desc: 'Detect true binary signature (%PDF, PNG, ZIP) & catch spoofed extensions', cat: 'File & Data', engine: 'file-data', tab: 'inspect', color: '#ef4444' },
  { id: 'fd-checksum', name: 'SHA-256 & CRC-32 Checksum', desc: 'Compute and verify SHA-256 & CRC-32 checksums via Web Crypto', cat: 'File & Data', engine: 'file-data', tab: 'inspect', color: '#334155' },
  { id: 'fd-sha512', name: 'SHA-512 Hash Generator', desc: 'Generate 512-bit SHA-512 cryptographic digests for files or text', cat: 'File & Data', engine: 'file-data', tab: 'inspect', color: '#1e293b' },
  { id: 'fd-renamer', name: 'File Renamer', desc: 'Batch rename files using {index}, {name}, {date} tokens & ZIP export', cat: 'File & Data', engine: 'batch-nonpdf', tab: 'file-rename', color: '#4f46e5' },
  { id: 'fd-packager', name: 'File Packager', desc: 'Bundle files + auto-generated SHA-256 manifest.json into a ZIP package', cat: 'File & Data', engine: 'file-data', tab: 'zip-create', color: '#7c3aed' },
  { id: 'fd-dummy', name: 'Dummy Data Generator (EN/BN)', desc: 'Generate realistic English or বাংলা mock user/order datasets in JSON/CSV/SQL', cat: 'File & Data', engine: 'file-data', tab: 'dummy', color: '#d946ef' },

  // ======================== 6. CALCULATORS (38 Tools) ========================
  { id: 'calc-sci', name: 'Scientific & Calculus Grapher', desc: 'Keypad, f(x)/g(x) canvas plotter, numerical derivative & Simpson integral', cat: 'Calculators', engine: 'calc', tab: 'sci', color: '#4f46e5', popular: true },
  { id: 'calc-pct', name: 'Percentage Calculator', desc: 'Compute X% of Y, what % X is of Y, and visual share bars', cat: 'Calculators', engine: 'calc', tab: 'pct', color: '#3b82f6' },
  { id: 'calc-pct-chg', name: 'Percentage Change Calculator', desc: 'Measure percentage increase or decrease between initial & final numbers', cat: 'Calculators', engine: 'calc', tab: 'pct', color: '#0ea5e9' },
  { id: 'calc-discount', name: 'Discount Calculator', desc: 'Compute sale price, discount savings & Taka/USD breakdown', cat: 'Calculators', engine: 'calc', tab: 'pct', color: '#10b981' },
  { id: 'calc-vat', name: 'VAT Calculator (15% BD & Custom)', desc: 'Exclusive/Inclusive VAT calculator with base, tax & gross totals', cat: 'Calculators', engine: 'calc', tab: 'pct', color: '#f59e0b' },
  { id: 'calc-tax', name: 'Sales Tax / GST Calculator', desc: 'Calculate pre-tax net & post-tax gross amounts instantly', cat: 'Calculators', engine: 'calc', tab: 'pct', color: '#f97316' },
  { id: 'calc-tip', name: 'Tip & Bill Splitter', desc: 'Split restaurant bills, tax and tip evenly across any number of guests', cat: 'Calculators', engine: 'calc', tab: 'pct', color: '#ec4899' },
  { id: 'calc-profit', name: 'Profit Calculator', desc: 'Compute Gross Profit, Net Profit & visual revenue/cost breakdown', cat: 'Calculators', engine: 'calc', tab: 'finance', color: '#16a34a' },
  { id: 'calc-margin', name: 'Profit Margin Calculator', desc: 'Compute exact gross & net margin percentages cleanly', cat: 'Calculators', engine: 'calc', tab: 'finance', color: '#059669' },
  { id: 'calc-markup', name: 'Markup Calculator', desc: 'Convert cost & selling price into retail markup percentage', cat: 'Calculators', engine: 'calc', tab: 'finance', color: '#8b5cf6' },
  { id: 'calc-breakeven', name: 'Break-even Calculator', desc: 'Calculate break-even units & revenue from fixed/variable costs', cat: 'Calculators', engine: 'calc', tab: 'finance', color: '#0284c7' },
  { id: 'calc-commission', name: 'Commission Calculator', desc: 'Compute tiered or flat sales commission payouts & net earnings', cat: 'Calculators', engine: 'calc', tab: 'finance', color: '#a855f7' },
  { id: 'calc-emi', name: 'Loan EMI Calculator', desc: 'Monthly EMI, total interest payable & principal vs interest split', cat: 'Calculators', engine: 'calc', tab: 'loan', color: '#4f46e5', popular: true },
  { id: 'calc-amort', name: 'Loan Amortization Schedule', desc: 'Full month-by-month repayment table exportable to CSV', cat: 'Calculators', engine: 'calc', tab: 'loan', color: '#2563eb' },
  { id: 'calc-compound', name: 'Compound Interest Calculator', desc: 'Project compounded growth across monthly, quarterly or annual periods', cat: 'Calculators', engine: 'calc', tab: 'loan', color: '#0ea5e9' },
  { id: 'calc-savings', name: 'DPS / SIP Savings Calculator', desc: 'Calculate monthly recurring deposit maturity & earned profit', cat: 'Calculators', engine: 'calc', tab: 'loan', color: '#14b8a6' },
  { id: 'calc-age', name: 'Age Calculator', desc: 'Exact age in years, months, days & total days lived', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#ea580c' },
  { id: 'calc-bday', name: 'Birthday Countdown', desc: 'Exact days and weeks remaining until your next birthday', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#ec4899' },
  { id: 'calc-date-add', name: 'Date Add/Subtract Calculator', desc: 'Add or subtract days, weeks, months or years from any date', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#0284c7' },
  { id: 'calc-duration', name: 'Time Duration Calculator', desc: 'Measure exact hours & minutes between any start and end time', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#6366f1' },
  { id: 'calc-workhours', name: 'Work Hours Calculator', desc: 'Compute total billable shift hours minus unpaid breaks', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#0d9488' },
  { id: 'calc-overtime', name: 'Overtime Pay Calculator', desc: 'Calculate regular + 1.5x/2x overtime pay cleanly', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#d97706' },
  { id: 'calc-salary', name: 'Salary Breakdown Calculator', desc: 'Convert hourly, monthly & annual gross/net compensation', cat: 'Calculators', engine: 'calc', tab: 'date-time', color: '#16a34a' },
  { id: 'calc-gpa', name: 'GPA Calculator (5.0 & 4.0)', desc: 'Dynamic course list supporting Bangladesh 5.0 & University 4.0 scales', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#6366f1', popular: true },
  { id: 'calc-cgpa', name: 'CGPA Calculator', desc: 'Combine semester GPA & credit hours into cumulative CGPA', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#4f46e5' },
  { id: 'calc-grade', name: 'Final Exam Grade Needed', desc: 'Compute score required on final exam to achieve your target course grade', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#0ea5e9' },
  { id: 'calc-exam-pct', name: 'Exam Percentage Calculator', desc: 'Convert obtained marks across multiple subjects into total percentage', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#10b981' },
  { id: 'calc-attend', name: 'Attendance Calculator (75% Rule)', desc: 'See classes you can skip or must attend to maintain 75% eligibility', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#f59e0b' },
  { id: 'calc-avg', name: 'Mean & Average Calculator', desc: 'Compute sum, count, arithmetic mean, min & max for any number set', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#06b6d4' },
  { id: 'calc-wavg', name: 'Weighted Average Calculator', desc: 'Calculate weighted average across custom values & weights', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#8b5cf6' },
  { id: 'calc-median', name: 'Median Calculator', desc: 'Find middle value cleanly even on unsorted datasets', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#14b8a6' },
  { id: 'calc-mode', name: 'Mode & StdDev Calculator', desc: 'Compute statistical mode and population standard deviation', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#d946ef' },
  { id: 'calc-ratio', name: 'Aspect Ratio & Proportion Solver', desc: 'Simplify ratios A:B and scale width/height proportionally', cat: 'Calculators', engine: 'calc', tab: 'edu-stats', color: '#ec4899' },
  { id: 'calc-storage', name: 'Data Storage Converter', desc: 'Convert Bits, Bytes, KB, MB, GB, TB & KiB/MiB/GiB accurately', cat: 'Calculators', engine: 'calc', tab: 'tech-health', color: '#334155' },
  { id: 'calc-bandwidth', name: 'Bandwidth & Download Time', desc: 'Estimate exact download/upload time from Mbps speed & file size', cat: 'Calculators', engine: 'calc', tab: 'tech-health', color: '#0ea5e9' },
  { id: 'calc-bmi', name: 'BMI & Ideal Weight', desc: 'Calculate Body Mass Index and healthy weight range', cat: 'Calculators', engine: 'calc', tab: 'tech-health', color: '#16a34a' },
  { id: 'calc-wellness', name: 'BMR, TDEE & Macro Targets', desc: 'Mifflin-St Jeor calorie expenditure & daily protein/carb/fat split', cat: 'Calculators', engine: 'calc', tab: 'tech-health', color: '#10b981' },
  { id: 'calc-sleep', name: 'Sleep Cycle Calculator', desc: 'Find optimal 90-minute REM bedtime & wake-up windows', cat: 'Calculators', engine: 'calc', tab: 'tech-health', color: '#6366f1' },

  // ======================== 7. DEVELOPER TOOLS (15 Tools) ========================
  { id: 'dev-base64', name: 'Base64 Encoder/Decoder', desc: 'UTF-8 safe Base64 text and binary encoding/decoding', cat: 'Developer Tools', engine: 'dev-tools', tab: 'encode', color: '#06b6d4', popular: true },
  { id: 'dev-url', name: 'URL Encoder/Decoder', desc: 'Percent-encode or decode URLs and URI components safely', cat: 'Developer Tools', engine: 'dev-tools', tab: 'encode', color: '#0ea5e9' },
  { id: 'dev-query', name: 'URL Query Parameter Parser', desc: 'Inspect, edit and rebuild URL query strings in an interactive table', cat: 'Developer Tools', engine: 'dev-tools', tab: 'encode', color: '#3b82f6' },
  { id: 'dev-entities', name: 'HTML Entity Encoder/Decoder', desc: 'Escape or unescape HTML entities (&lt; &gt; &amp; &quot;)', cat: 'Developer Tools', engine: 'dev-tools', tab: 'encode', color: '#6366f1' },
  { id: 'dev-uuid', name: 'UUID v4 Batch Generator', desc: 'Generate cryptographically random RFC-4122 UUID v4 identifiers', cat: 'Developer Tools', engine: 'dev-tools', tab: 'time-id', color: '#8b5cf6' },
  { id: 'dev-unix', name: 'Unix Timestamp Converter', desc: 'Convert Epoch seconds/ms to local, UTC & ISO-8601 timestamps', cat: 'Developer Tools', engine: 'dev-tools', tab: 'time-id', color: '#14b8a6' },
  { id: 'dev-iso', name: 'ISO Date & Relative Time', desc: 'Parse ISO dates into Unix epoch and human-readable deltas', cat: 'Developer Tools', engine: 'dev-tools', tab: 'time-id', color: '#10b981' },
  { id: 'dev-color', name: 'Color Picker & 50–900 Shades', desc: 'Convert HEX/RGB/HSL and generate full 10-stop Tailwind-style palette', cat: 'Developer Tools', engine: 'dev-tools', tab: 'color', color: '#ec4899', popular: true },
  { id: 'dev-wcag', name: 'WCAG Contrast Checker', desc: 'Check AA & AAA contrast ratios for normal and large typography', cat: 'Developer Tools', engine: 'dev-tools', tab: 'color', color: '#f43f5e' },
  { id: 'dev-sandbox', name: 'HTML/CSS/JS Safe Sandbox', desc: 'Live preview HTML snippets inside a sandboxed iframe viewport', cat: 'Developer Tools', engine: 'dev-tools', tab: 'format', color: '#f97316' },
  { id: 'dev-css', name: 'CSS Formatter & Minifier', desc: 'Cleanly indent or compact stylesheets in one click', cat: 'Developer Tools', engine: 'dev-tools', tab: 'format', color: '#2563eb' },
  { id: 'dev-js', name: 'JavaScript Formatter & Minifier', desc: 'Format or strip whitespace/comments from JS code snippets', cat: 'Developer Tools', engine: 'dev-tools', tab: 'format', color: '#eab308' },
  { id: 'dev-xml-fmt', name: 'XML Formatter & Minifier', desc: 'Pretty-print indented XML trees or compact single-line XML', cat: 'Developer Tools', engine: 'dev-tools', tab: 'format', color: '#a855f7' },
  { id: 'dev-sql', name: 'SQL Formatter & Minifier', desc: 'Format SELECT/JOIN/WHERE clauses cleanly with uppercase keywords', cat: 'Developer Tools', engine: 'dev-tools', tab: 'format', color: '#0d9488' },
  { id: 'dev-regex', name: 'Regex Tester & Capture Groups', desc: 'Real-time match highlighting, flags & numbered capture group breakdown', cat: 'Developer Tools', engine: 'dev-tools', tab: 'regex', color: '#4f46e5', popular: true },

  // ======================== 8. PRODUCTIVITY (14 Tools) ========================
  { id: 'prod-pomodoro', name: 'Pomodoro Focus Timer', desc: '25/5/15 focus cycles with live SVG progress ring & completion chime', cat: 'Productivity', engine: 'productivity', tab: 'timers', color: '#ef4444', popular: true },
  { id: 'prod-stopwatch', name: 'Stopwatch with Laps', desc: 'High-precision stopwatch with split lap table and CSV export', cat: 'Productivity', engine: 'productivity', tab: 'timers', color: '#f97316' },
  { id: 'prod-countdown', name: 'Countdown Timer', desc: 'Custom HH:MM:SS timer with audio alert when time expires', cat: 'Productivity', engine: 'productivity', tab: 'timers', color: '#f59e0b' },
  { id: 'prod-interval', name: 'HIIT / Study Interval Timer', desc: 'Alternate work & rest rounds automatically with audio cues', cat: 'Productivity', engine: 'productivity', tab: 'timers', color: '#10b981' },
  { id: 'prod-todo', name: 'To-Do List', desc: 'Persistent local task manager with priorities & completion filters', cat: 'Productivity', engine: 'productivity', tab: 'workspace', color: '#4f46e5', popular: true },
  { id: 'prod-habit', name: '7-Day Habit Tracker', desc: 'Interactive weekly habit streak matrix stored locally', cat: 'Productivity', engine: 'productivity', tab: 'workspace', color: '#14b8a6' },
  { id: 'prod-goal', name: 'Goal Progress Tracker', desc: 'Track numeric milestones & percentage progress bars', cat: 'Productivity', engine: 'productivity', tab: 'workspace', color: '#8b5cf6' },
  { id: 'prod-notes', name: 'Quick Scratchpad Notes', desc: 'Auto-saving sticky notes with instant TXT download', cat: 'Productivity', engine: 'productivity', tab: 'workspace', color: '#eab308' },
  { id: 'prod-datediff', name: 'Date Difference Calculator', desc: 'Compute exact years, months, weeks & total days between dates', cat: 'Productivity', engine: 'productivity', tab: 'dates-money', color: '#0284c7' },
  { id: 'prod-bizdays', name: 'BD & Intl Business Days', desc: 'Count working days with Fri–Sat (Bangladesh) or Sat–Sun weekend toggles', cat: 'Productivity', engine: 'productivity', tab: 'dates-money', color: '#0d9488' },
  { id: 'prod-budget', name: 'Monthly Budget Planner', desc: 'Allocate income vs housing, food, savings & visualize budget balance', cat: 'Productivity', engine: 'productivity', tab: 'dates-money', color: '#16a34a' },
  { id: 'prod-expense', name: 'Daily Expense Tracker', desc: 'Log categorized expenses & export summary CSV', cat: 'Productivity', engine: 'productivity', tab: 'dates-money', color: '#e11d48' },
  { id: 'prod-typing', name: 'Typing Speed Test (English)', desc: '60-second WPM, accuracy % & live keystroke error highlighting', cat: 'Productivity', engine: 'productivity', tab: 'typing', color: '#6366f1', popular: true },
  { id: 'prod-typing-bn', name: 'Typing Speed Test (বাংলা)', desc: 'Practice Bangla script speed & character accuracy interactively', cat: 'Productivity', engine: 'productivity', tab: 'typing', color: '#059669' },

  // ======================== 9. TRAVEL TOOLS (12 Tools) ========================
  { id: 'trv-split', name: 'Group Expense Splitter', desc: 'Simplify shared trip debts to minimum person-to-person transfers', cat: 'Travel Tools', engine: 'travel', tab: 'budget', color: '#f97316', popular: true },
  { id: 'trv-budget', name: 'Travel Budget Planner', desc: 'Estimate flights, stay, meals & per-day allowance in any currency', cat: 'Travel Tools', engine: 'travel', tab: 'budget', color: '#f59e0b' },
  { id: 'trv-fuel', name: 'Fuel Cost Calculator', desc: 'Calculate trip fuel liters and cost from distance, km/L & price', cat: 'Travel Tools', engine: 'travel', tab: 'budget', color: '#ef4444' },
  { id: 'trv-packing', name: 'Travel Packing Checklist', desc: 'Smart preset checklists (Beach, Business, Winter, International)', cat: 'Travel Tools', engine: 'travel', tab: 'lists', color: '#10b981' },
  { id: 'trv-shopping', name: 'Trip Shopping Checklist', desc: 'Track souvenirs, duty-free items & gift budgets', cat: 'Travel Tools', engine: 'travel', tab: 'lists', color: '#ec4899' },
  { id: 'trv-itinerary', name: 'Day-by-Day Itinerary Planner', desc: 'Organize timed activities & print or export your trip schedule', cat: 'Travel Tools', engine: 'travel', tab: 'lists', color: '#4f46e5' },
  { id: 'trv-multidest', name: 'Multi-Destination Trip Planner', desc: 'Track stops, nights per city, transit modes & check-in notes', cat: 'Travel Tools', engine: 'travel', tab: 'lists', color: '#8b5cf6' },
  { id: 'trv-tz', name: '24h World Time Zone Slider', desc: 'Compare Dhaka, London, New York, Dubai, Tokyo & Singapore live', cat: 'Travel Tools', engine: 'travel', tab: 'time-geo', color: '#0ea5e9', popular: true },
  { id: 'trv-meeting', name: 'International Meeting Overlap', desc: 'Find polite 9am–6pm overlapping hours across multiple global cities', cat: 'Travel Tools', engine: 'travel', tab: 'time-geo', color: '#0284c7' },
  { id: 'trv-distance', name: 'Distance & Weather Probe', desc: 'Haversine city-to-city km/miles plus optional Open-Meteo live weather', cat: 'Travel Tools', engine: 'travel', tab: 'time-geo', color: '#14b8a6' },
  { id: 'trv-speed', name: 'Speed, Distance & ETA', desc: 'Calculate average travel speed, duration or estimated arrival time', cat: 'Travel Tools', engine: 'travel', tab: 'time-geo', color: '#6366f1' },
  { id: 'trv-sun', name: 'Sunrise & Sunset Calculator', desc: 'Compute solar noon, sunrise, sunset & daylight length by coordinates', cat: 'Travel Tools', engine: 'travel', tab: 'time-geo', color: '#eab308' },

  // ======================== 10. EVERYDAY UTILITIES (27 Tools) ========================
  { id: 'ev-qr', name: 'QR Code Generator (SVG & PNG)', desc: '100% offline styled QR maker for URLs, Wi-Fi & text with SVG/PNG export', cat: 'Everyday Utilities', engine: 'everyday', tab: 'qr', color: '#4f46e5', popular: true },
  { id: 'ev-barcode', name: 'Code-128 Barcode Generator', desc: 'Generate sharp scannable Code-128B SVG/PNG barcodes offline', cat: 'Everyday Utilities', engine: 'everyday', tab: 'qr', color: '#334155' },
  { id: 'ev-qrscan', name: 'QR Code Image Scanner', desc: 'Decode QR codes from uploaded images or live camera (BarcodeDetector)', cat: 'Everyday Utilities', engine: 'everyday', tab: 'qr', color: '#0ea5e9' },
  { id: 'ev-barscan', name: 'Barcode Scanner', desc: 'Scan EAN-13, UPC & Code-128 barcodes from photo or camera', cat: 'Everyday Utilities', engine: 'everyday', tab: 'qr', color: '#0284c7' },
  { id: 'ev-passgen', name: 'Password & Diceware Generator', desc: 'Cryptographically strong passwords or memorable 5-word passphrases', cat: 'Everyday Utilities', engine: 'everyday', tab: 'security', color: '#10b981', popular: true },
  { id: 'ev-passchk', name: 'Password Strength Checker', desc: 'Estimate bit entropy, crack-time resistance & pattern warnings locally', cat: 'Everyday Utilities', engine: 'everyday', tab: 'security', color: '#16a34a' },
  { id: 'ev-sha', name: 'SHA-1 / 256 / 512 Text Hasher', desc: 'Compute instant Web Crypto hashes for any string or token', cat: 'Everyday Utilities', engine: 'everyday', tab: 'security', color: '#475569' },
  { id: 'ev-currency', name: 'Currency Converter (Live + Offline)', desc: 'BDT, USD, EUR, GBP, SAR, AED, INR & 30+ currencies with live sync button', cat: 'Everyday Utilities', engine: 'everyday', tab: 'convert', color: '#f59e0b', popular: true },
  { id: 'ev-unit', name: 'Unit Converter (incl. Vori/Katha/Bigha)', desc: 'Convert Length, Weight, Temp, Area (Sqft/Katha/Bigha/Decimal) & Speed', cat: 'Everyday Utilities', engine: 'everyday', tab: 'convert', color: '#ea580c' },
  { id: 'ev-bangla', name: 'Bangla Phonetic Keyboard & Pad', desc: 'Type Banglish (e.g. "Amar bangla") -> বাংলা + clickable vowel/kar pad', cat: 'Everyday Utilities', engine: 'everyday', tab: 'bangla-islamic', color: '#059669', popular: true },
  { id: 'ev-hijri', name: 'Hijri Calendar Converter', desc: 'Convert today or any Gregorian date to Islamic Hijri calendar', cat: 'Everyday Utilities', engine: 'everyday', tab: 'bangla-islamic', color: '#0d9488' },
  { id: 'ev-prayer', name: 'Prayer Time Utility', desc: 'Daily Fajr/Dhuhr/Asr/Maghrib/Isha schedule with Aladhan sync + offline fallback', cat: 'Everyday Utilities', engine: 'everyday', tab: 'bangla-islamic', color: '#14b8a6' },
  { id: 'ev-zakat', name: 'Zakat Calculator', desc: 'Compute annual 2.5% Zakat across cash, gold/silver, stocks & debts', cat: 'Everyday Utilities', engine: 'everyday', tab: 'bangla-islamic', color: '#16a34a' },
  { id: 'ev-wheel', name: 'Interactive Spin Wheel', desc: 'Animated SVG decision wheel with custom entries and winner celebration', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#ec4899' },
  { id: 'ev-luckydraw', name: 'Lucky Draw Winner Picker', desc: 'Draw unique winners from participant lists cleanly', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#d946ef' },
  { id: 'ev-rand', name: 'Random Number Generator', desc: 'Generate unique or repeated random integers in any min–max range', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#8b5cf6' },
  { id: 'ev-dice', name: '3D-Style Dice Roller', desc: 'Roll 1 to 6 dice (d6/d20) with instant sum totals', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#6366f1' },
  { id: 'ev-coin', name: 'Coin Flipper', desc: 'Fair crypto-random coin toss with Heads/Tails session tally', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#f59e0b' },
  { id: 'ev-team', name: 'Random Team Generator', desc: 'Shuffle any list of names evenly into N balanced teams', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#0ea5e9' },
  { id: 'ev-emoji', name: 'Emoji Picker', desc: 'Search & 1-click copy emojis across Smileys, Objects, Flags & Symbols', cat: 'Everyday Utilities', engine: 'everyday', tab: 'random', color: '#f43f5e' },
  { id: 'ev-morse', name: 'Morse Code Translator', desc: 'Convert plain text ⇄ Morse code dots and dashes cleanly', cat: 'Everyday Utilities', engine: 'everyday', tab: 'creative', color: '#06b6d4' },
  { id: 'ev-morse-audio', name: 'Morse Code WAV Audio Generator', desc: 'Synthesize and play/download real 44.1 kHz Morse beep WAV audio', cat: 'Everyday Utilities', engine: 'everyday', tab: 'creative', color: '#0284c7' },
  { id: 'ev-whiteboard', name: 'Freehand Whiteboard Sketchpad', desc: 'Multi-color drawing canvas with brush sizes, undo & PNG export', cat: 'Everyday Utilities', engine: 'everyday', tab: 'creative', color: '#4f46e5' },
  { id: 'ev-quote', name: 'Quote & Status Card Maker', desc: 'Design gradient social quote cards and export crisp high-DPI PNG', cat: 'Everyday Utilities', engine: 'everyday', tab: 'creative', color: '#a855f7' },
  { id: 'ev-calendar', name: 'Printable Monthly Calendar', desc: 'Generate clean monthly calendars ready for print or PDF export', cat: 'Everyday Utilities', engine: 'everyday', tab: 'printables', color: '#14b8a6' },
  { id: 'ev-paper', name: 'Printable Ruled / Dot / Grid Paper', desc: 'Print college-ruled, dot-grid, graph or music staff sheets cleanly', cat: 'Everyday Utilities', engine: 'everyday', tab: 'printables', color: '#64748b' },
  { id: 'ev-device', name: 'Device & Browser Inspector', desc: 'Inspect viewport, DPR, CPU cores, memory, online state & user-agent', cat: 'Everyday Utilities', engine: 'everyday', tab: 'printables', color: '#334155' },

  // ======================== 11. BUSINESS & PRINT (11 Tools) ========================
  { id: 'biz-invoice', name: 'Invoice Generator (QR & Print/PDF)', desc: 'Create branded invoices with line items, tax, QR verification & PDF export', cat: 'Business & Print', engine: 'business', tab: 'invoice', color: '#be123c', popular: true },
  { id: 'biz-receipt', name: 'Money Receipt / মানি রসিদ', desc: 'Generate bilingual English/Bangla cash & cheque payment receipts', cat: 'Business & Print', engine: 'business', tab: 'receipt', color: '#e11d48' },
  { id: 'biz-cert', name: 'Gold-Seal Certificate Maker', desc: 'Design customizable completion/award certificates with exportable PNG/Print', cat: 'Business & Print', engine: 'business', tab: 'cert', color: '#d97706' },
  { id: 'biz-card', name: 'Business Card Maker (Front/Back)', desc: 'Create scannable QR visiting cards and download print-ready PNGs', cat: 'Business & Print', engine: 'business', tab: 'card', color: '#4f46e5' },
  { id: 'biz-cheque', name: 'Bank Cheque Leaf & Words (EN/BN)', desc: 'Preview filled cheque leaf + convert amounts to English & বাংলা words', cat: 'Business & Print', engine: 'business', tab: 'cheque', color: '#059669', popular: true },
  { id: 'biz-numwords', name: 'Number to Words (BD/Intl/বাংলা)', desc: 'Convert figures into Lakh/Crore English, Million/Billion & বাংলা কথায়', cat: 'Business & Print', engine: 'business', tab: 'cheque', color: '#0d9488' },
  { id: 'biz-gold', name: 'BAJUS Gold Calculator (ভরি/আনা/রতি)', desc: 'Convert ভরি/আনা/রতি/পয়েন্ট ⇄ Grams with 22K/21K/18K rate, making & 5% VAT', cat: 'Business & Print', engine: 'business', tab: 'gold', color: '#eab308', popular: true },
  { id: 'biz-label', name: 'Retail Price Label Generator', desc: 'Create scannable product price tags with Code-128 barcodes & discounts', cat: 'Business & Print', engine: 'business', tab: 'labels', color: '#f97316' },
  { id: 'biz-barsheet', name: '3x4 Barcode Sticker Sheet', desc: 'Generate a printable 12-label barcode grid for inventory tagging', cat: 'Business & Print', engine: 'business', tab: 'labels', color: '#334155' },
  { id: 'biz-sign', name: 'Digital Signature Pad', desc: 'Smooth canvas signature studio exporting transparent PNG or to Sign PDF', cat: 'Business & Print', engine: 'business', tab: 'sign', color: '#6366f1' },
  { id: 'biz-template', name: 'Voucher & Letterhead Maker', desc: 'Print-ready company voucher & official memo template builder', cat: 'Business & Print', engine: 'business', tab: 'receipt', color: '#7c3aed' },
];

export function getToolById(id: string): ToolDef | undefined {
  return TOOLS_CATALOG.find((t) => t.id === id);
}

export function detectBestToolsForFile(file: File): {
  label: string;
  primaryToolId: string;
  suggestions: { toolId: string; actionLabel: string }[];
} {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      label: 'PDF Document detected',
      primaryToolId: 'pdf-compress',
      suggestions: [
        { toolId: 'pdf-compress', actionLabel: 'Compress PDF' },
        { toolId: 'pdf-organize', actionLabel: 'Organize / Rotate' },
        { toolId: 'pdf-merge', actionLabel: 'Merge PDFs' },
        { toolId: 'pdf-split', actionLabel: 'Split / Extract' },
        { toolId: 'pdf-sign', actionLabel: 'Sign PDF' },
        { toolId: 'pdf-redact', actionLabel: 'Redact Sensitive Text' },
      ],
    };
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/.test(name)) {
    return {
      label: 'Image Asset detected',
      primaryToolId: 'img-editor',
      suggestions: [
        { toolId: 'img-compress', actionLabel: 'Compress to KB' },
        { toolId: 'img-convert', actionLabel: 'Convert JPG/PNG/WebP' },
        { toolId: 'img-editor', actionLabel: 'Filters & Enhance' },
        { toolId: 'img-bgremove', actionLabel: 'Remove Background' },
        { toolId: 'pdf-convert', actionLabel: 'Convert Image to PDF' },
      ],
    };
  }
  if (name.endsWith('.csv')) {
    return {
      label: 'CSV Spreadsheet detected',
      primaryToolId: 'fd-csv-view',
      suggestions: [
        { toolId: 'fd-csv-view', actionLabel: 'View CSV Table & Chart' },
        { toolId: 'fd-csv2json', actionLabel: 'Convert CSV to JSON' },
        { toolId: 'batch-csv-conv', actionLabel: 'Batch CSV Converter' },
      ],
    };
  }
  if (name.endsWith('.json')) {
    return {
      label: 'JSON Payload detected',
      primaryToolId: 'fd-json-fmt',
      suggestions: [
        { toolId: 'fd-json-fmt', actionLabel: 'Format & Validate JSON' },
        { toolId: 'fd-json2csv', actionLabel: 'Convert JSON to CSV' },
        { toolId: 'fd-xml', actionLabel: 'Convert JSON to XML' },
      ],
    };
  }
  if (name.endsWith('.zip')) {
    return {
      label: 'ZIP Archive detected',
      primaryToolId: 'fd-zip-inspect',
      suggestions: [
        { toolId: 'fd-zip-inspect', actionLabel: 'Inspect & Extract ZIP' },
        { toolId: 'batch-zip-extract', actionLabel: 'Batch ZIP Extractor' },
      ],
    };
  }
  return {
    label: 'File detected',
    primaryToolId: 'fd-file-info',
    suggestions: [
      { toolId: 'fd-file-info', actionLabel: 'Inspect Hex & Entropy' },
      { toolId: 'fd-checksum', actionLabel: 'SHA-256 / CRC-32 Hash' },
      { toolId: 'fd-zip-create', actionLabel: 'Package into ZIP' },
    ],
  };
}
