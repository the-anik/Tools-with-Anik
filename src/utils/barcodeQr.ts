/**
 * Pure TypeScript offline QR Code matrix encoder (Byte mode, ECC M, Ver 1-10),
 * Code-128B Barcode encoder, CRC-32, Shannon entropy, Magic-Byte MIME checker,
 * and Hex/ASCII dumper.
 */

// --- CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): string {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export function shannonEntropy(bytes: Uint8Array): number {
  if (!bytes.length) return 0;
  const counts = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i++) counts[bytes[i]]++;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (counts[i] === 0) continue;
    const p = counts[i] / bytes.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function detectMagicMime(bytes: Uint8Array, fileName = ''): {
  mime: string;
  label: string;
  extensionMismatch: boolean;
} {
  const h = (offset: number, arr: number[]) =>
    arr.every((b, idx) => bytes[offset + idx] === b);

  let mime = 'application/octet-stream';
  let label = 'Unknown Binary / Raw Data';
  let expectedExts: string[] = [];

  if (h(0, [0x25, 0x50, 0x44, 0x46])) {
    mime = 'application/pdf';
    label = 'PDF Document (%PDF)';
    expectedExts = ['pdf'];
  } else if (h(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    mime = 'image/png';
    label = 'PNG Image';
    expectedExts = ['png'];
  } else if (h(0, [0xff, 0xd8, 0xff])) {
    mime = 'image/jpeg';
    label = 'JPEG Image';
    expectedExts = ['jpg', 'jpeg'];
  } else if (h(0, [0x47, 0x49, 0x46, 0x38])) {
    mime = 'image/gif';
    label = 'GIF Image';
    expectedExts = ['gif'];
  } else if (h(0, [0x52, 0x49, 0x46, 0x46]) && h(8, [0x57, 0x45, 0x42, 0x50])) {
    mime = 'image/webp';
    label = 'WebP Image';
    expectedExts = ['webp'];
  } else if (h(0, [0x50, 0x4b, 0x03, 0x04])) {
    mime = 'application/zip';
    label = 'ZIP / OOXML Archive (PK..)';
    expectedExts = ['zip', 'docx', 'xlsx', 'pptx', 'apk', 'jar'];
  } else if (h(0, [0x1f, 0x8b])) {
    mime = 'application/gzip';
    label = 'GZIP Compressed Archive';
    expectedExts = ['gz', 'tgz'];
  } else if (h(4, [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])) {
    mime = 'image/avif';
    label = 'AVIF Image';
    expectedExts = ['avif'];
  } else if (h(0, [0x49, 0x44, 0x33]) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    mime = 'audio/mpeg';
    label = 'MP3 Audio';
    expectedExts = ['mp3'];
  } else {
    // Check if printable UTF-8 text
    let textLike = bytes.length > 0;
    const sampleLen = Math.min(bytes.length, 512);
    for (let i = 0; i < sampleLen; i++) {
      const b = bytes[i];
      if (b === 0 || (b < 0x20 && b !== 9 && b !== 10 && b !== 13)) {
        textLike = false;
        break;
      }
    }
    if (textLike) {
      const snippet = new TextDecoder().decode(bytes.subarray(0, 256)).trim();
      if (snippet.startsWith('<svg') || (snippet.startsWith('<?xml') && snippet.includes('<svg'))) {
        mime = 'image/svg+xml';
        label = 'SVG Vector Image';
        expectedExts = ['svg'];
      } else if (snippet.startsWith('{') || snippet.startsWith('[')) {
        mime = 'application/json';
        label = 'JSON / UTF-8 Text';
        expectedExts = ['json', 'txt'];
      } else {
        mime = 'text/plain';
        label = 'UTF-8 Plain Text / Code / CSV';
        expectedExts = ['txt', 'csv', 'md', 'html', 'css', 'js', 'ts', 'xml', 'json', 'sql'];
      }
    }
  }

  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  const extensionMismatch = Boolean(ext && expectedExts.length && !expectedExts.includes(ext));
  return { mime, label, extensionMismatch };
}

export function hexDump(bytes: Uint8Array, maxBytes = 512): string {
  const len = Math.min(bytes.length, maxBytes);
  const lines: string[] = [];
  for (let i = 0; i < len; i += 16) {
    const addr = i.toString(16).padStart(6, '0');
    const hexParts: string[] = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < len) {
        const b = bytes[i + j];
        hexParts.push(b.toString(16).padStart(2, '0'));
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
      } else {
        hexParts.push('  ');
        ascii += ' ';
      }
    }
    lines.push(`${addr}  ${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8).join(' ')}  |${ascii}|`);
  }
  return lines.join('\n');
}

// --- Code-128B Barcode Encoder ---
const CODE128_PATTERNS: string[] = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
];

export function encodeCode128B(text: string): { bars: number[]; quietWidth: number } {
  const safe = text.replace(/[^\x20-\x7e]/g, '?') || 'ANIK';
  const codes: number[] = [104]; // Start B
  let checksum = 104;
  for (let i = 0; i < safe.length; i++) {
    const val = safe.charCodeAt(i) - 32;
    codes.push(val);
    checksum += val * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop

  const bars: number[] = [];
  for (const c of codes) {
    const pat = CODE128_PATTERNS[c] ?? CODE128_PATTERNS[0];
    for (const ch of pat) bars.push(Number(ch));
  }
  return { bars, quietWidth: bars.reduce((a, b) => a + b, 0) };
}

export function renderCode128Svg(
  text: string,
  fg = '#0f172a',
  bg = '#ffffff',
  height = 72
): string {
  const { bars, quietWidth } = encodeCode128B(text);
  const pad = 10;
  const totalW = quietWidth + pad * 2;
  let x = pad;
  const rects: string[] = [];
  bars.forEach((w, idx) => {
    if (idx % 2 === 0) {
      rects.push(`<rect x="${x}" y="8" width="${w}" height="${height - 24}" fill="${fg}" />`);
    }
    x += w;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${height}" width="100%" height="${height}">
    <rect width="100%" height="100%" fill="${bg}" />
    ${rects.join('')}
    <text x="${totalW / 2}" y="${height - 4}" font-family="monospace" font-size="10" text-anchor="middle" fill="${fg}">${text.replace(/[<>&]/g, '')}</text>
  </svg>`;
}

// --- Offline QR Code Matrix Generator (Byte mode, ECC Level M, Versions 1..10) ---
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = res[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return res.slice(data.length);
}

// Version 1..10 specs for ECC Level M: [totalDataBytes, ecBytesPerBlock, numBlocksGroup1, dataBytesGroup1, numBlocksGroup2, dataBytesGroup2]
const QR_M_SPECS: [number, number, number, number, number, number][] = [
  [16, 10, 1, 16, 0, 0],     // V1
  [28, 16, 1, 28, 0, 0],     // V2
  [44, 26, 1, 44, 0, 0],     // V3
  [64, 18, 2, 32, 0, 0],     // V4
  [86, 24, 2, 43, 0, 0],     // V5
  [108, 16, 4, 27, 0, 0],    // V6
  [124, 18, 4, 31, 0, 0],    // V7
  [154, 22, 2, 38, 2, 39],   // V8
  [182, 22, 3, 36, 2, 37],   // V9
  [216, 26, 4, 43, 1, 44],   // V10
];

const ALIGNMENT_CENTERS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text || 'https://tools-with-anik.local');
  let ver = 1;
  while (ver <= 10) {
    const cap = QR_M_SPECS[ver - 1][0];
    const headerBytes = ver < 10 ? 2 : 3;
    if (bytes.length + headerBytes <= cap) break;
    ver++;
  }
  if (ver > 10) ver = 10;

  const [totalDataCap, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = QR_M_SPECS[ver - 1];
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };

  pushBits(0b0100, 4); // Byte mode
  const countLen = ver < 10 ? 8 : 16;
  const maxBytes = totalDataCap - (ver < 10 ? 2 : 3);
  const payload = bytes.subarray(0, maxBytes);
  pushBits(payload.length, countLen);
  for (const b of payload) pushBits(b, 8);
  const maxBits = totalDataCap * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padIdx % 2 === 0 ? 0xec : 0x11, 8);
    padIdx++;
  }

  const dataBytes = new Uint8Array(totalDataCap);
  for (let i = 0; i < totalDataCap; i++) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i * 8 + k];
    dataBytes[i] = b;
  }

  // Split blocks & compute ECC
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i++) {
    const slice = dataBytes.subarray(offset, offset + g1Data);
    offset += g1Data;
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, ecPerBlock));
  }
  for (let i = 0; i < g2Blocks; i++) {
    const slice = dataBytes.subarray(offset, offset + g2Data);
    offset += g2Data;
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, ecPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataLen = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) if (i < blk.length) interleaved.push(blk[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const blk of ecBlocks) interleaved.push(blk[i]);
  }

  const size = ver * 4 + 17;
  const mod: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunc = (r: number, c: number, val: number) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      mod[r][c] = val;
      reserved[r][c] = true;
    }
  };

  const drawFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark =
          inOuter &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(r, c, dark ? 1 : 0);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  const centers = ALIGNMENT_CENTERS[ver - 1];
  for (const r0 of centers) {
    for (const c0 of centers) {
      if ((r0 < 9 && c0 < 9) || (r0 < 9 && c0 > size - 9) || (r0 > size - 9 && c0 < 9)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) === 2 || (dr === 0 && dc === 0);
          setFunc(r0 + dr, c0 + dc, dark ? 1 : 0);
        }
      }
    }
  }

  // Timing patterns & dark module
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0 ? 1 : 0);
    setFunc(i, 6, i % 2 === 0 ? 1 : 0);
  }
  setFunc(size - 8, 8, 1);

  // Reserve format info cells
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  if (ver >= 7) {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 3; c++) {
        reserved[r][size - 11 + c] = true;
        reserved[size - 11 + c][r] = true;
      }
    }
  }

  // Place data bits (mask 0: (r + c) % 2 === 0)
  const bitStream: number[] = [];
  for (const byte of interleaved) {
    for (let k = 7; k >= 0; k--) bitStream.push((byte >>> k) & 1);
  }

  let bitIdx = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      const row = up ? size - 1 - step : step;
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (!reserved[row][c]) {
          const rawBit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
          const masked = (row + c) % 2 === 0 ? rawBit ^ 1 : rawBit;
          mod[row][c] = masked;
        }
      }
    }
    up = !up;
  }

  // Format info for ECC M (00), Mask 0 (000) -> precomputed BCH + XOR 0x5412 = 0x5412 ^ (0 -> 0) -> 0x5412?
  // Exact 15-bit format sequence for (ECC=M=00, Mask=0=000): data=0b00000, BCH(0)=0, XOR 0b101010000010010 (0x5412) = 0x5412
  const fmt = 0x5412;
  const fmtBit = (idx: number) => (fmt >>> idx) & 1;
  // Horizontal format strip row 8
  for (let i = 0; i <= 5; i++) mod[8][i] = fmtBit(14 - i);
  mod[8][7] = fmtBit(8);
  mod[8][8] = fmtBit(7);
  mod[7][8] = fmtBit(6);
  for (let i = 9; i < 15; i++) mod[14 - i][8] = fmtBit(14 - i);
  // Mirror format info
  for (let i = 0; i < 8; i++) mod[8][size - 1 - i] = fmtBit(i);
  for (let i = 0; i < 7; i++) mod[size - 1 - i][8] = fmtBit(14 - i);

  // Version info for >= 7 (ECC M)
  if (ver >= 7) {
    let rem = ver << 12;
    const poly = 0x1f25;
    for (let i = 17; i >= 12; i--) {
      if ((rem >>> i) & 1) rem ^= poly << (i - 12);
    }
    const verBits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = (verBits >>> i) & 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      mod[a][b] = bit;
      mod[b][a] = bit;
    }
  }

  return mod.map((row) => row.map((v) => v === 1));
}

export function renderQrSvg(
  text: string,
  fg = '#0f172a',
  bg = '#ffffff',
  rounded = false
): string {
  const mat = generateQrMatrix(text);
  const n = mat.length;
  const margin = 2;
  const total = n + margin * 2;
  const cells: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (mat[r][c]) {
        const rx = rounded ? ' rx="0.28"' : '';
        cells.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1"${rx} fill="${fg}"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="${rounded ? 'geometricPrecision' : 'crispEdges'}">
    <rect width="100%" height="100%" fill="${bg}"/>
    ${cells.join('')}
  </svg>`;
}
