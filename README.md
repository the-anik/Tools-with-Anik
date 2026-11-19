# Tools with Anik

**Tools with Anik** is a fast, local-first, Light-Mode-default web workspace unifying **22 PDF tools**, a **16-engine PDF Batch Studio**, and **208 standalone daily utilities** into one modern React + TypeScript + Vite application. All processing happens directly in your browser with zero file uploads.

## Included Modules (231 Tools across 11 Categories)

- **PDF Workspace (22 Tools)**: Compress (Auto, Smart image shrink, Target-KB binary search, Lossless), Visual Merge & Page Organizer, Split & Extract (ZIP), 8-Mode Convert (PNG/JPG/WebP/Long Scroll/Contact Sheet/Markdown/HTML/JSON + Images/Text to PDF), Clean-up & Blank-Page Scanner, Interactive Crop & Whitespace Auto-Trim, Permanent Redact, Signature Pad & Stamp, Headers/Footers/Bates/Watermarks, Page Layout (Resize/N-Up/Booklet/Reverse), Metadata Inspector, Extract Text & Embedded Images, Full-Text Highlight Search, Pixel-Diff PDF Compare, Grayscale, Flatten, Repair, and Markdown to PDF.
- **Pro Batch Studio (36 Engines)**:
  - **16 PDF Batch Engines** with 3 independent queues (Queue A/B/C), folder upload, pause/cancel/retry, and ZIP export.
  - **20 Image & File Batch Engines** for bulk format conversion, compression, resizing, cropping, watermarking, EXIF stripping, SHA-256/CRC-32 audits, and ZIP archiving.
- **Image Studio (29 Tools)**: Format Converter, Target-KB Compressor, Resizer/Cropper/Aspect Ratio, Darkroom Filters & Auto-Enhance, Mac/Polaroid/Rounded Frames, Annotation & Region Blur, Chroma-Key Background Remover, Color Palette Extractor, Favicon & PWA Icon Packs, IG 3×3 Grid Cutter, Collage & Screenshot Stitcher, Animated GIF89a Maker, and SVG Vectorizer.
- **Text Studio (23 Tools)**, **File & Data (19 Tools)**, **Calculators (38 Tools incl. Calculus Graphing)**, **Developer Tools (15 Tools)**, **Productivity (14 Tools incl. EN/বাংলা Typing)**, **Travel Tools (12 Tools)**, **Everyday Utilities (27 Tools incl. Offline QR/Barcode, Bangla Phonetic, Prayer/Zakat)**, and **Business & Print (11 Tools incl. Invoice, Money Receipt, BAJUS Gold ভরি/আনা/রতি, Bank Cheque Words EN/বাংলা)**.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Deploy on GitHub Pages (1-Click Setup)

This repository includes `.github/workflows/deploy.yml` and relative asset paths (`base: './'`) so it deploys cleanly to GitHub Pages out of the box:

1. Upload or push all files from this archive to a GitHub repository (`main` branch).
2. In your GitHub repo, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push any commit (or run the workflow manually under **Actions**) — your live site will build, test, and publish automatically.

You can also deploy directly to **Vercel**, **Netlify**, or **Cloudflare Pages** using:
- **Build command**: `npm run build`
- **Output directory**: `dist`

## Scripts

- `npm run dev` — Start Vite development server on port 3000
- `npm run build` — Build production bundle into `dist/`
- `npm run preview` — Preview the production build locally
- `npm run lint` — TypeScript strict check (`tsc --noEmit`)
- `npm test` — Run unit tests (`src/utils/core.test.ts`)

## License

MIT — see [LICENSE](./LICENSE).
