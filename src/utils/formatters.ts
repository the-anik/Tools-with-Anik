/**
 * Pure formatting, parsing, text-transformation, data conversion,
 * and Bengali/Bangla localization utilities.
 */

export function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, exp);
  return `${val >= 100 || exp === 0 ? val.toFixed(0) : val.toFixed(val >= 10 ? 1 : 2)} ${units[exp]}`;
}

export function safeBase(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const raw = dot > 0 ? filename.slice(0, dot) : filename;
  return raw.replace(/[^a-zA-Z0-9._\-\u0980-\u09FF ]+/g, '_').trim() || 'file';
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

/**
 * Parse page range strings like "1-3, 5, 8-last" into sorted 1-based unique page numbers.
 */
export function parsePageRanges(expr: string, totalPages: number): number[] {
  if (!expr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const clean = expr.toLowerCase().replace(/last|end/g, String(totalPages));
  const out = new Set<number>();
  for (const part of clean.split(',')) {
    const s = part.trim();
    if (!s) continue;
    if (s.includes('-')) {
      const [aRaw, bRaw] = s.split('-');
      const a = Math.max(1, parseInt(aRaw.trim(), 10) || 1);
      const b = Math.min(totalPages, parseInt(bRaw.trim(), 10) || totalPages);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) {
        if (i >= 1 && i <= totalPages) out.add(i);
      }
    } else {
      const n = parseInt(s, 10);
      if (Number.isInteger(n) && n >= 1 && n <= totalPages) out.add(n);
    }
  }
  return Array.from(out).sort((a, b) => a - b);
}

/**
 * Parse split specification into an array of page-number groups.
 */
export function parseSplitSpec(
  mode: 'single' | 'every-n' | 'odd-even' | 'halves' | 'custom',
  totalPages: number,
  everyN = 2,
  customExpr = '1-2, 3-last'
): { label: string; pages: number[] }[] {
  if (totalPages <= 0) return [];
  if (mode === 'single') {
    return Array.from({ length: totalPages }, (_, i) => ({
      label: `page_${i + 1}`,
      pages: [i + 1],
    }));
  }
  if (mode === 'every-n') {
    const step = Math.max(1, Math.floor(everyN));
    const groups: { label: string; pages: number[] }[] = [];
    for (let i = 1; i <= totalPages; i += step) {
      const end = Math.min(totalPages, i + step - 1);
      const pages = [];
      for (let p = i; p <= end; p++) pages.push(p);
      groups.push({ label: `pages_${i}-${end}`, pages });
    }
    return groups;
  }
  if (mode === 'odd-even') {
    const odd: number[] = [];
    const even: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i % 2 === 1) odd.push(i);
      else even.push(i);
    }
    const res: { label: string; pages: number[] }[] = [];
    if (odd.length) res.push({ label: 'odd_pages', pages: odd });
    if (even.length) res.push({ label: 'even_pages', pages: even });
    return res;
  }
  if (mode === 'halves') {
    const mid = Math.ceil(totalPages / 2);
    const first = Array.from({ length: mid }, (_, i) => i + 1);
    const second = Array.from({ length: totalPages - mid }, (_, i) => mid + i + 1);
    const res = [{ label: `part1_1-${mid}`, pages: first }];
    if (second.length) res.push({ label: `part2_${mid + 1}-${totalPages}`, pages: second });
    return res;
  }
  // custom: comma separated chunks create separate output groups
  const clean = customExpr.toLowerCase().replace(/last|end/g, String(totalPages));
  const groups: { label: string; pages: number[] }[] = [];
  let idx = 1;
  for (const part of clean.split(',')) {
    const pages = parsePageRanges(part, totalPages);
    if (pages.length) {
      groups.push({ label: `split_${idx++}_${pages[0]}-${pages[pages.length - 1]}`, pages });
    }
  }
  return groups;
}

const EN_ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000En(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${EN_ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(EN_TENS[Math.floor(n / 10)] + (n % 10 ? ` ${EN_ONES[n % 10]}` : ''));
  } else if (n > 0) {
    parts.push(EN_ONES[n]);
  }
  return parts.join(' ').trim();
}

export function numToWordsEnBD(amount: number): string {
  if (!Number.isFinite(amount)) return 'Invalid Amount';
  if (amount === 0) return 'Zero';
  const neg = amount < 0 ? 'Minus ' : '';
  const abs = Math.abs(amount);
  let whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 100);

  const parts: string[] = [];
  const crore = Math.floor(whole / 10_000_000);
  whole %= 10_000_000;
  const lakh = Math.floor(whole / 100_000);
  whole %= 100_000;
  const thousand = Math.floor(whole / 1000);
  whole %= 1000;

  if (crore > 0) parts.push(`${numToWordsEnBD(crore)} Crore`);
  if (lakh > 0) parts.push(`${below1000En(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${below1000En(thousand)} Thousand`);
  if (whole > 0) parts.push(below1000En(whole));

  let res = `${neg}${parts.join(' ').trim() || 'Zero'}`;
  if (frac > 0) res += ` and ${below1000En(frac)} Paisa`;
  return res;
}

export function numToWordsEnIntl(amount: number): string {
  if (!Number.isFinite(amount)) return 'Invalid Amount';
  if (amount === 0) return 'Zero';
  const neg = amount < 0 ? 'Minus ' : '';
  let whole = Math.floor(Math.abs(amount));
  const frac = Math.round((Math.abs(amount) - whole) * 100);
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const parts: string[] = [];
  let s = 0;
  while (whole > 0 && s < scales.length) {
    const chunk = whole % 1000;
    if (chunk > 0) {
      parts.unshift(`${below1000En(chunk)}${scales[s] ? ' ' + scales[s] : ''}`);
    }
    whole = Math.floor(whole / 1000);
    s++;
  }
  let res = `${neg}${parts.join(' ').trim() || 'Zero'}`;
  if (frac > 0) res += ` Point ${below1000En(frac)}`;
  return res;
}

const BN_NUMS = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বাহান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
];

function below1000Bn(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${BN_NUMS[Math.floor(n / 100)]} শত`);
    n %= 100;
  }
  if (n > 0) parts.push(BN_NUMS[n]);
  return parts.join(' ');
}

export function numToWordsBn(amount: number): string {
  if (!Number.isFinite(amount)) return 'অবৈধ সংখ্যা';
  if (amount === 0) return 'শূন্য';
  const neg = amount < 0 ? 'ঋণাত্মক ' : '';
  const abs = Math.abs(amount);
  let whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 100);
  const parts: string[] = [];
  const koti = Math.floor(whole / 10_000_000);
  whole %= 10_000_000;
  const lakh = Math.floor(whole / 100_000);
  whole %= 100_000;
  const hajar = Math.floor(whole / 1000);
  whole %= 1000;

  if (koti > 0) parts.push(`${numToWordsBn(koti)} কোটি`);
  if (lakh > 0) parts.push(`${below1000Bn(lakh)} লক্ষ`);
  if (hajar > 0) parts.push(`${below1000Bn(hajar)} হাজার`);
  if (whole > 0) parts.push(below1000Bn(whole));

  let res = `${neg}${parts.join(' ').trim() || 'শূন্য'}`;
  if (frac > 0) res += ` এবং ${BN_NUMS[frac] || frac} পয়সা`;
  return res;
}

export function toBanglaDigits(input: string | number): string {
  const map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

// Phonetic Banglish -> Bangla transliteration engine
const PHONETIC_DIGRAPHS: [string, string][] = [
  ['kh', 'খ'], ['gh', 'ঘ'], ['chh', 'ছ'], ['ch', 'চ'], ['jh', 'ঝ'],
  ['Th', 'ঠ'], ['Dh', 'ঢ'], ['th', 'থ'], ['dh', 'ধ'], ['ph', 'ফ'],
  ['bh', 'ভ'], ['sh', 'শ'], ['Sh', 'ষ'], ['ng', 'ং'], ['Ng', 'ঙ'],
  ['oi', 'ঐ'], ['ou', 'ঔ'], ['aa', 'আ'], ['ee', 'ঈ'], ['oo', 'ঊ'],
  ['ri', 'ঋ'],
];

const PHONETIC_CONSONANTS: Record<string, string> = {
  k: 'ক', g: 'গ', c: 'চ', j: 'জ', T: 'ট', D: 'ড', N: 'ণ',
  t: 'ত', d: 'দ', n: 'ন', p: 'প', f: 'ফ', b: 'ব', v: 'ভ',
  m: 'ম', z: 'য', r: 'র', l: 'ল', s: 'স', S: 'শ', h: 'হ',
  y: 'য়', R: 'ড়', w: 'ও',
};

const PHONETIC_VOWELS: Record<string, [string, string]> = {
  a: ['অ', 'া'],
  A: ['আ', 'া'],
  i: ['ই', 'ি'],
  I: ['ঈ', 'ী'],
  u: ['উ', 'ু'],
  U: ['ঊ', 'ূ'],
  e: ['এ', 'ে'],
  O: ['ও', 'ো'],
  o: ['ও', 'ো'],
};

export function phoneticToBangla(input: string): string {
  let out = '';
  let i = 0;
  let prevWasConsonant = false;
  while (i < input.length) {
    const ch = input[i];
    if (/[0-9]/.test(ch)) {
      out += toBanglaDigits(ch);
      prevWasConsonant = false;
      i++;
      continue;
    }
    if (/\s|[.,!?;:\-()[\]"]/.test(ch)) {
      out += ch === '.' ? '।' : ch;
      prevWasConsonant = false;
      i++;
      continue;
    }
    let matched = false;
    for (const [pat, bn] of PHONETIC_DIGRAPHS) {
      if (input.startsWith(pat, i)) {
        if (pat === 'oi' && prevWasConsonant) out += 'ৈ';
        else if (pat === 'ou' && prevWasConsonant) out += 'ৌ';
        else if (pat === 'aa' && prevWasConsonant) out += 'া';
        else if (pat === 'ee' && prevWasConsonant) out += 'ী';
        else if (pat === 'oo' && prevWasConsonant) out += 'ূ';
        else out += bn;
        prevWasConsonant = !['oi', 'ou', 'aa', 'ee', 'oo', 'ri', 'ng'].includes(pat);
        i += pat.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (PHONETIC_CONSONANTS[ch]) {
      out += PHONETIC_CONSONANTS[ch];
      prevWasConsonant = true;
      i++;
      continue;
    }
    if (PHONETIC_VOWELS[ch]) {
      const [indep, kar] = PHONETIC_VOWELS[ch];
      if (prevWasConsonant) {
        if (ch !== 'o') out += kar;
      } else {
        out += indep;
      }
      prevWasConsonant = false;
      i++;
      continue;
    }
    out += ch;
    prevWasConsonant = false;
    i++;
  }
  return out;
}

const MORSE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '-': '-....-',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

export function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .map((word) =>
      Array.from(word)
        .map((c) => MORSE_MAP[c] || '')
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' / ');
}

export function morseToText(morse: string): string {
  return morse
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((code) => MORSE_REV[code] || '')
        .join('')
    )
    .join(' ');
}

export type CaseStyle =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'alternating'
  | 'inverse';

export function transformCase(text: string, style: CaseStyle): string {
  switch (style) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
    case 'sentence':
      return text
        .toLowerCase()
        .replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (m) => m.toUpperCase());
    case 'camel': {
      const words = text.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
      return words
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()
        )
        .join('');
    }
    case 'pascal': {
      const words = text.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
      return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
    }
    case 'snake':
      return text
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
    case 'kebab':
      return text
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    case 'constant':
      return transformCase(text, 'snake').toUpperCase();
    case 'alternating':
      return Array.from(text)
        .map((ch, i) => (i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()))
        .join('');
    case 'inverse':
      return Array.from(text)
        .map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()))
        .join('');
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

export function csvToJson(csvText: string): Record<string, string>[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h, i) => h.trim() || `col_${i + 1}`);
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? '';
    });
    return obj;
  });
}

export function jsonToCsv(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return '';
  const flatObjs: Record<string, unknown>[] = arr.map((item) =>
    item && typeof item === 'object' ? (item as Record<string, unknown>) : { value: item }
  );
  const keys = Array.from(new Set(flatObjs.flatMap((o) => Object.keys(o))));
  const escCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.map(escCell).join(',')];
  for (const o of flatObjs) {
    lines.push(keys.map((k) => escCell(o[k])).join(','));
  }
  return lines.join('\n');
}

export interface DiffLine {
  type: 'same' | 'add' | 'del';
  text: string;
  lineA?: number;
  lineB?: number;
}

export function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const a = textA.split(/\r?\n/);
  const b = textB.split(/\r?\n/);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i], lineA: i + 1, lineB: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i], lineA: i + 1 });
      i++;
    } else {
      out.push({ type: 'add', text: b[j], lineB: j + 1 });
      j++;
    }
  }
  while (i < m) out.push({ type: 'del', text: a[i], lineA: ++i });
  while (j < n) out.push({ type: 'add', text: b[j], lineB: ++j });
  return out;
}

export function fancyTextTransform(text: string, variant: 'bold' | 'italic' | 'script' | 'mono' | 'bubbles'): string {
  const ranges: Record<string, [number, number, number]> = {
    bold: [0x1d400, 0x1d41a, 0x1d7ce],
    italic: [0x1d434, 0x1d44e, 0x30],
    script: [0x1d4d0, 0x1d4ea, 0x30],
    mono: [0x1d670, 0x1d68a, 0x1d7f6],
    bubbles: [0x24b6, 0x24d0, 0x2460],
  };
  const [upperBase, lowerBase, numBase] = ranges[variant];
  return Array.from(text)
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(upperBase + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(lowerBase + (code - 97));
      if (code >= 48 && code <= 57 && variant !== 'italic' && variant !== 'script') {
        if (variant === 'bubbles') return c === '0' ? '⓪' : String.fromCodePoint(numBase + (code - 49));
        return String.fromCodePoint(numBase + (code - 48));
      }
      return c;
    })
    .join('');
}

export function simpleXmlToJson(xml: string): Record<string, unknown> {
  const cleaned = xml.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const stack: { tag: string; obj: Record<string, unknown> }[] = [{ tag: '__root__', obj: {} }];
  const tokenRe = /<(\/?)([a-zA-Z0-9_:-]+)([^>]*?)(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(cleaned)) !== null) {
    const [, closing, tag, , selfClose, text] = match;
    if (text) {
      const t = text.trim();
      if (t && stack.length > 0) {
        const cur = stack[stack.length - 1].obj;
        cur['#text'] = cur['#text'] ? `${cur['#text']} ${t}` : t;
      }
    } else if (closing) {
      if (stack.length > 1) stack.pop();
    } else if (tag) {
      const child: Record<string, unknown> = {};
      const parent = stack[stack.length - 1].obj;
      if (parent[tag] !== undefined) {
        if (!Array.isArray(parent[tag])) parent[tag] = [parent[tag]];
        (parent[tag] as unknown[]).push(child);
      } else {
        parent[tag] = child;
      }
      if (!selfClose) stack.push({ tag, obj: child });
    }
  }
  const unwrap = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(unwrap);
    if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      const keys = Object.keys(o);
      if (keys.length === 1 && keys[0] === '#text') return o['#text'];
      const res: Record<string, unknown> = {};
      for (const k of keys) res[k] = unwrap(o[k]);
      return res;
    }
    return node;
  };
  return unwrap(stack[0].obj) as Record<string, unknown>;
}

export function jsonToSimpleXml(obj: unknown, rootTag = 'root', indent = 0): string {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${pad}<${rootTag} />`;
  if (typeof obj !== 'object') {
    const esc = String(obj)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `${pad}<${rootTag}>${esc}</${rootTag}>`;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => jsonToSimpleXml(item, rootTag, indent)).join('\n');
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (!entries.length) return `${pad}<${rootTag} />`;
  const inner = entries.map(([k, v]) => jsonToSimpleXml(v, k.replace(/[^a-zA-Z0-9_:-]/g, '_'), indent + 1)).join('\n');
  return `${pad}<${rootTag}>\n${inner}\n${pad}</${rootTag}>`;
}
