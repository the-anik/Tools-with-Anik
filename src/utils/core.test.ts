import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtBytes,
  parsePageRanges,
  parseSplitSpec,
  numToWordsEnBD,
  numToWordsEnIntl,
  numToWordsBn,
  phoneticToBangla,
  textToMorse,
  morseToText,
  transformCase,
  slugify,
  csvToJson,
  jsonToCsv,
  computeLineDiff,
} from './formatters.ts';
import {
  evaluateMath,
  numericalDerivative,
  simpsonIntegral,
  calcLoanEmi,
  calcDpsMaturity,
  calcStats,
  calcHaversineDistance,
  simplifyGroupDebts,
  calcBajusGoldPrice,
  calcZakat,
} from './calculators.ts';
import {
  crc32,
  detectMagicMime,
  encodeCode128B,
  generateQrMatrix,
  shannonEntropy,
} from './barcodeQr.ts';

describe('formatters & parsers', () => {
  it('formats byte sizes cleanly', () => {
    assert.equal(fmtBytes(0), '0 B');
    assert.equal(fmtBytes(1024), '1.00 KB');
    assert.equal(fmtBytes(1048576), '1.00 MB');
  });

  it('parses PDF page ranges and split specs', () => {
    assert.deepEqual(parsePageRanges('1-3, 5, 8-last', 10), [1, 2, 3, 5, 8, 9, 10]);
    const oddEven = parseSplitSpec('odd-even', 5);
    assert.deepEqual(oddEven[0].pages, [1, 3, 5]);
    assert.deepEqual(oddEven[1].pages, [2, 4]);
    const every2 = parseSplitSpec('every-n', 5, 2);
    assert.equal(every2.length, 3);
    assert.deepEqual(every2[2].pages, [5]);
  });

  it('converts numbers to English BD, Intl, and Bangla words', () => {
    assert.equal(numToWordsEnBD(125000), 'One Lakh Twenty Five Thousand');
    assert.equal(numToWordsEnIntl(125000), 'One Hundred Twenty Five Thousand');
    assert.equal(numToWordsBn(105000), 'এক লক্ষ পাঁচ হাজার');
  });

  it('transliterates phonetic Banglish and Morse code', () => {
    assert.equal(phoneticToBangla('Amar bangla'), 'আমার বাংলা');
    const enc = textToMorse('SOS 2025');
    assert.equal(morseToText(enc), 'SOS 2025');
  });

  it('handles case transforms, CSV/JSON roundtrips, and line diff', () => {
    assert.equal(transformCase('hello world test', 'camel'), 'helloWorldTest');
    assert.equal(transformCase('helloWorldTest', 'snake'), 'hello_world_test');
    assert.equal(slugify('Hello World! 2025'), 'hello-world-2025');
    const json = csvToJson('name,age\nAnik,27\n"Khan, R",30');
    assert.equal(json.length, 2);
    assert.equal(json[1].name, 'Khan, R');
    const backCsv = jsonToCsv(json);
    assert.ok(backCsv.includes('"Khan, R"'));
    const diff = computeLineDiff('a\nb\nc', 'a\nd\nc');
    assert.ok(diff.some((d) => d.type === 'del' && d.text === 'b'));
    assert.ok(diff.some((d) => d.type === 'add' && d.text === 'd'));
  });
});

describe('calculators & domain math', () => {
  it('evaluates scientific expressions & calculus safely', () => {
    assert.equal(evaluateMath('2 + 3 * 4^2'), 50);
    assert.ok(Math.abs(evaluateMath('sin(pi/2)') - 1) < 1e-9);
    assert.equal(evaluateMath('5!'), 120);
    // d/dx (x^3) at x=2 is 12
    assert.ok(Math.abs(numericalDerivative('x^3', 2) - 12) < 1e-4);
    // integral of x^2 from 0 to 3 is 9
    assert.ok(Math.abs(simpsonIntegral('x^2', 0, 3) - 9) < 1e-4);
  });

  it('computes EMI, DPS, stats, distance, gold, debt settlement, and Zakat', () => {
    const emi = calcLoanEmi(100000, 12, 12);
    assert.ok(emi.emi > 8880 && emi.emi < 8890);
    assert.equal(emi.schedule.length, 12);
    const dps = calcDpsMaturity(5000, 8, 60);
    assert.ok(dps.maturityValue > 360000);
    const st = calcStats([10, 20, 20, 30]);
    assert.equal(st.mean, 20);
    assert.equal(st.median, 20);
    assert.deepEqual(st.mode, [20]);
    const dist = calcHaversineDistance(23.8103, 90.4125, 22.3569, 91.7832);
    assert.ok(dist > 200 && dist < 240);
    const gold = calcBajusGoldPrice({ vori: 1, ana: 0, roti: 0, point: 0, pricePerVori: 140000, includeVat5Pct: true });
    assert.equal(gold.grandTotal, 147000);
    const { settlements } = simplifyGroupDebts(
      [{ paidBy: 'A', amount: 300 }, { paidBy: 'B', amount: 0 }],
      ['A', 'B', 'C']
    );
    assert.equal(settlements.length, 2);
    const z = calcZakat({ cashBank: 200000, goldSilverValue: 0, investments: 0, businessStock: 0, liabilities: 0, nisabThreshold: 100000 });
    assert.equal(z.zakatDue, 5000);
  });
});

describe('barcode, QR, CRC32 & magic MIME', () => {
  it('computes CRC32, entropy, magic bytes, QR & Code-128B', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    assert.equal(detectMagicMime(pdfBytes, 'doc.jpg').extensionMismatch, true);
    assert.equal(detectMagicMime(pdfBytes, 'doc.pdf').mime, 'application/pdf');
    assert.equal(crc32(new TextEncoder().encode('123456789')), 'cbf43926');
    assert.equal(shannonEntropy(new Uint8Array([1, 1, 1, 1])), 0);
    const qr = generateQrMatrix('https://example.com');
    assert.ok(qr.length >= 21 && qr.length === qr[0].length);
    const bc = encodeCode128B('ANIK-01');
    assert.ok(bc.bars.length > 20);
  });
});
