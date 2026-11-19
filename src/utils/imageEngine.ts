import { canvasToBlob, loadImageFile } from './download';

export interface ImageFilters {
  brightness: number; // 0..200 (100 default)
  contrast: number; // 0..200
  saturation: number; // 0..200
  blur: number; // 0..10
  grayscale: number; // 0..100
  sepia: number; // 0..100
  hueRotate: number; // 0..360
  sharpen: number; // 0..100
}

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  sharpen: 0,
};

export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const img = await loadImageFile(file);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return c;
}

export function applyImageFilters(
  src: HTMLCanvasElement,
  f: ImageFilters,
  rotateDeg = 0,
  flipH = false,
  flipV = false
): HTMLCanvasElement {
  const swap = rotateDeg === 90 || rotateDeg === 270;
  const out = document.createElement('canvas');
  out.width = swap ? src.height : src.width;
  out.height = swap ? src.width : src.height;
  const ctx = out.getContext('2d')!;
  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) grayscale(${f.grayscale}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg)`;
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.restore();

  if (f.sharpen > 0) {
    const amount = (f.sharpen / 100) * 0.85;
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    const copy = new Uint8ClampedArray(d);
    const w = out.width;
    const h = out.height;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const lap =
            4 * copy[i + c] -
            copy[((y - 1) * w + x) * 4 + c] -
            copy[((y + 1) * w + x) * 4 + c] -
            copy[(y * w + x - 1) * 4 + c] -
            copy[(y * w + x + 1) * 4 + c];
          d[i + c] = Math.min(255, Math.max(0, copy[i + c] + amount * lap));
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  return out;
}

export function autoEnhanceCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    if (d[i] < minR) minR = d[i];
    if (d[i] > maxR) maxR = d[i];
    if (d[i + 1] < minG) minG = d[i + 1];
    if (d[i + 1] > maxG) maxG = d[i + 1];
    if (d[i + 2] < minB) minB = d[i + 2];
    if (d[i + 2] > maxB) maxB = d[i + 2];
  }
  const sR = maxR > minR ? 255 / (maxR - minR) : 1;
  const sG = maxG > minG ? 255 / (maxG - minG) : 1;
  const sB = maxB > minB ? 255 / (maxB - minB) : 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.max(0, (d[i] - minR) * sR));
    d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - minG) * sG));
    d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - minB) * sB));
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export async function compressCanvasToTargetKb(
  canvas: HTMLCanvasElement,
  mime: 'image/jpeg' | 'image/webp' | 'image/png',
  targetKb: number,
  defaultQuality = 0.85
): Promise<{ blob: Blob; qualityUsed: number }> {
  if (targetKb <= 0 || mime === 'image/png') {
    return { blob: await canvasToBlob(canvas, mime, defaultQuality), qualityUsed: defaultQuality };
  }
  let lo = 0.1;
  let hi = 0.96;
  let bestBlob = await canvasToBlob(canvas, mime, defaultQuality);
  let bestQ = defaultQuality;
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    const attempt = await canvasToBlob(canvas, mime, mid);
    bestBlob = attempt;
    bestQ = mid;
    if (attempt.size / 1024 > targetKb) hi = mid - 0.02;
    else lo = mid + 0.02;
    if (Math.abs(attempt.size / 1024 - targetKb) < Math.max(4, targetKb * 0.06)) break;
  }
  return { blob: bestBlob, qualityUsed: bestQ };
}

export function extractDominantPalette(canvas: HTMLCanvasElement, count = 6): string[] {
  const w = Math.min(120, canvas.width);
  const h = Math.min(120, canvas.height);
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  tmp.getContext('2d')!.drawImage(canvas, 0, 0, w, h);
  const data = tmp.getContext('2d')!.getImageData(0, 0, w, h).data;
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rq = Math.round(data[i] / 32) * 32;
    const gq = Math.round(data[i + 1] / 32) * 32;
    const bq = Math.round(data[i + 2] / 32) * 32;
    const key = `${rq},${gq},${bq}`;
    const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    entry.r += data[i];
    entry.g += data[i + 1];
    entry.b += data[i + 2];
    entry.n++;
    buckets.set(key, entry);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((b) => {
      const hx = (v: number) => Math.min(255, Math.round(v / b.n)).toString(16).padStart(2, '0');
      return `#${hx(b.r)}${hx(b.g)}${hx(b.b)}`.toUpperCase();
    });
}

export function inspectTransparency(canvas: HTMLCanvasElement): {
  transparentPixels: number;
  semiTransparentPixels: number;
  opaquePixels: number;
  transparentPct: number;
} {
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
  let transparentPixels = 0;
  let semiTransparentPixels = 0;
  let opaquePixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) transparentPixels++;
    else if (data[i] < 250) semiTransparentPixels++;
    else opaquePixels++;
  }
  const total = Math.max(1, transparentPixels + semiTransparentPixels + opaquePixels);
  return {
    transparentPixels,
    semiTransparentPixels,
    opaquePixels,
    transparentPct: ((transparentPixels + semiTransparentPixels) / total) * 100,
  };
}

export function applyChromaKey(
  src: HTMLCanvasElement,
  targetHex: string,
  tolerance = 36
): HTMLCanvasElement {
  const tr = parseInt(targetHex.slice(1, 3), 16) || 255;
  const tg = parseInt(targetHex.slice(3, 5), 16) || 255;
  const tb = parseInt(targetHex.slice(5, 7), 16) || 255;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i] - tr, d[i + 1] - tg, d[i + 2] - tb);
    if (dist <= tolerance) d[i + 3] = 0;
    else if (dist <= tolerance + 14) d[i + 3] = Math.round(((dist - tolerance) / 14) * d[i + 3]);
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function frameImageCanvas(
  src: HTMLCanvasElement,
  style: 'gallery' | 'polaroid' | 'mac' | 'rounded',
  padding = 32,
  bgHex = '#ffffff',
  radius = 24
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  const topExtra = style === 'mac' ? 40 : 0;
  const botExtra = style === 'polaroid' ? 68 : 0;
  out.width = src.width + padding * 2;
  out.height = src.height + padding * 2 + topExtra + botExtra;
  const ctx = out.getContext('2d')!;

  if (style === 'rounded') {
    ctx.beginPath();
    ctx.roundRect(0, 0, out.width, out.height, radius);
    ctx.clip();
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.beginPath();
    ctx.roundRect(padding, padding, src.width, src.height, Math.max(4, radius - 6));
    ctx.clip();
    ctx.drawImage(src, padding, padding);
    return out;
  }

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, out.width, out.height);

  if (style === 'mac') {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(padding, padding, src.width, 32);
    const colors = ['#ef4444', '#f59e0b', '#22c55e'];
    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(padding + 18 + i * 18, padding + 16, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.drawImage(src, padding, padding + 32);
    return out;
  }

  ctx.drawImage(src, padding, padding);
  return out;
}

export function vectorizeCanvasToSvg(src: HTMLCanvasElement, threshold = 128, fill = '#0f172a'): string {
  const maxDim = 96;
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  const w = Math.max(8, Math.round(src.width * scale));
  const h = Math.max(8, Math.round(src.height * scale));
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  tmp.getContext('2d')!.drawImage(src, 0, 0, w, h);
  const { data } = tmp.getContext('2d')!.getImageData(0, 0, w, h);

  // Horizontal run-length SVG path compression for crisp lightweight vector output
  const paths: string[] = [];
  for (let y = 0; y < h; y++) {
    let runStart = -1;
    for (let x = 0; x <= w; x++) {
      let dark = false;
      if (x < w) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        dark = a > 64 && lum < threshold;
      }
      if (dark && runStart < 0) runStart = x;
      else if (!dark && runStart >= 0) {
        paths.push(`M${runStart} ${y}h${x - runStart}v1h-${x - runStart}z`);
        runStart = -1;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${src.width}" height="${src.height}"><path fill="${fill}" d="${paths.join('')}"/></svg>`;
}

// Pure TypeScript animated GIF89a encoder (using RGB 3-3-2 global color table + uncompressed LZW blocks for rock-solid compatibility)
export function encodeGifFromCanvases(
  frames: HTMLCanvasElement[],
  delayCs = 45,
  maxWidth = 420
): Blob {
  if (!frames.length) throw new Error('No frames provided');
  const ratio = Math.min(1, maxWidth / frames[0].width);
  const w = Math.max(16, Math.round(frames[0].width * ratio));
  const h = Math.max(16, Math.round(frames[0].height * ratio));

  const out: number[] = [];
  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  };
  const pushU16 = (v: number) => {
    out.push(v & 0xff, (v >> 8) & 0xff);
  };

  pushStr('GIF89a');
  pushU16(w);
  pushU16(h);
  out.push(0xf7, 0x00, 0x00); // Global Color Table, 256 colors

  // 256-entry RGB 3-3-2 palette
  for (let i = 0; i < 256; i++) {
    const r = Math.round(((i >> 5) & 7) * (255 / 7));
    const g = Math.round(((i >> 2) & 7) * (255 / 7));
    const b = Math.round((i & 3) * (255 / 3));
    out.push(r, g, b);
  }

  // NETSCAPE2.0 loop extension
  out.push(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  out.push(0x03, 0x01, 0x00, 0x00, 0x00);

  const scratch = document.createElement('canvas');
  scratch.width = w;
  scratch.height = h;
  const sCtx = scratch.getContext('2d')!;

  for (const frame of frames) {
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, w, h);
    sCtx.drawImage(frame, 0, 0, w, h);
    const { data } = sCtx.getImageData(0, 0, w, h);

    // Graphic Control Extension
    out.push(0x21, 0xf9, 0x04, 0x00);
    pushU16(delayCs);
    out.push(0x00, 0x00);

    // Image Descriptor
    out.push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(w);
    pushU16(h);
    out.push(0x00);

    // Minimum LZW code size = 8
    out.push(8);
    // Stream clear code + 9-bit raw color indices in 120-pixel chunks
    const pixels = w * h;
    const indices = new Uint8Array(pixels);
    for (let i = 0; i < pixels; i++) {
      const r = data[i * 4] >> 5;
      const g = data[i * 4 + 1] >> 5;
      const b = data[i * 4 + 2] >> 6;
      indices[i] = (r << 5) | (g << 2) | b;
    }

    // Minimal valid 9-bit uncompressed LZW stream
    let bitBuf = 0;
    let bitCount = 0;
    const bytesBlock: number[] = [];
    const flushSubBlocks = (final = false) => {
      while (bytesBlock.length >= 254 || (final && bytesBlock.length > 0)) {
        const chunk = bytesBlock.splice(0, 254);
        out.push(chunk.length, ...chunk);
      }
    };
    const emitCode = (code: number) => {
      bitBuf |= code << bitCount;
      bitCount += 9;
      while (bitCount >= 8) {
        bytesBlock.push(bitBuf & 0xff);
        bitBuf >>= 8;
        bitCount -= 8;
      }
      flushSubBlocks(false);
    };

    emitCode(256); // Clear
    for (let i = 0; i < pixels; i++) {
      emitCode(indices[i]);
      if (i > 0 && i % 240 === 0) emitCode(256); // Reset dict before 512 limit
    }
    emitCode(257); // EOI
    if (bitCount > 0) bytesBlock.push(bitBuf & 0xff);
    flushSubBlocks(true);
    out.push(0x00); // Block terminator
  }

  out.push(0x3b); // Trailer
  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}
