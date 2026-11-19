import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Printer, RefreshCw, Volume2, Send } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, Panel, StatTile, CopyButton } from '../ui/SharedUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { renderCode128Svg, renderQrSvg } from '../../utils/barcodeQr';
import {
  morseToText,
  numToWordsBn,
  numToWordsEnBD,
  numToWordsEnIntl,
  phoneticToBangla,
  textToMorse,
  toBanglaDigits,
} from '../../utils/formatters';
import { calcBajusGoldPrice, calcZakat } from '../../utils/calculators';
import { canvasToBlob, downloadBlob, downloadText } from '../../utils/download';

// ==================== EVERYDAY UTILITIES (27) ====================
export function EverydayWorkspace({ tool }: { tool: ToolDef }) {
  const [tab, setTab] = useState(tool.tab || 'qr');

  // QR & Barcode
  const [qrInput, setQrInput] = useState('https://anik.studio');
  const [qrColor, setQrColor] = useState('#0f172a');
  const [qrRounded, setQrRounded] = useState(false);
  const [bcInput, setBcInput] = useState('ANIK-2025-8842');
  const [scanResult, setScanResult] = useState('');

  // Security: Password & Hashes
  const [pwLen, setPwLen] = useState(16);
  const [pwOut, setPwOut] = useState('');
  const [hashInput, setHashInput] = useState('Tools with Anik');
  const [sha256Out, setSha256Out] = useState('');

  // Currency & Units
  const [curAmt, setCurAmt] = useState(100);
  const [curFrom, setCurFrom] = useState('USD');
  const [curTo, setCurTo] = useState('BDT');
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1,
    BDT: 121.5,
    EUR: 0.92,
    GBP: 0.79,
    SAR: 3.75,
    AED: 3.67,
    INR: 85.4,
    JPY: 152.0,
  });
  const [unitCat, setUnitCat] = useState<'area-bd' | 'length' | 'weight' | 'temp'>('area-bd');
  const [unitVal, setUnitVal] = useState(1);

  // Bangla Phonetic & Islamic Tools
  const [banglish, setBanglish] = useState('Amar shonar bangla');
  const [zakatWealth, setZakatWealth] = useState({ cash: 250000, gold: 180000, stocks: 50000, debt: 20000, nisab: 110000 });
  const [prayerCity, setPrayerCity] = useState('Dhaka');
  const [prayers, setPrayers] = useState({ Fajr: '04:12', Dhuhr: '12:01', Asr: '15:24', Maghrib: '18:32', Isha: '19:49' });

  // Random / Wheel / Teams / Emoji
  const [wheelNames, setWheelNames] = useState('Pizza, Biryani, Burgers, Pasta, Thai, Tacos');
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelWinner, setWheelWinner] = useState('');
  const [diceRes, setDiceRes] = useState<number[]>([4, 6]);
  const [coinRes, setCoinRes] = useState('Heads');

  // Morse & Whiteboard & Quote
  const [morsePlain, setMorsePlain] = useState('HELLO ANIK');
  const wbCanvasRef = useRef<HTMLCanvasElement>(null);
  const wbDrawingRef = useRef(false);
  const [wbColor, setWbColor] = useState('#4f46e5');
  const [quoteText, setQuoteText] = useState('Simple tools done right save hours every week.');
  const [quoteAuthor, setQuoteAuthor] = useState('Tools with Anik');

  // Printable Calendar & Paper
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [paperStyle, setPaperStyle] = useState<'ruled' | 'grid' | 'dot'>('ruled');

  useEffect(() => {
    setTab(tool.tab || 'qr');
  }, [tool.id, tool.tab]);

  useEffect(() => {
    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(hashInput))
      .then((buf) =>
        setSha256Out(Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''))
      );
  }, [hashInput]);

  const qrSvg = useMemo(() => renderQrSvg(qrInput, qrColor, '#ffffff', qrRounded), [qrInput, qrColor, qrRounded]);
  const bcSvg = useMemo(() => renderCode128Svg(bcInput), [bcInput]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-';
    const arr = new Uint32Array(pwLen);
    crypto.getRandomValues(arr);
    setPwOut(Array.from(arr, (n) => chars[n % chars.length]).join(''));
  };

  useEffect(() => {
    if (!pwOut) generatePassword();
  }, []);

  const syncRates = async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data?.rates) setRates((prev) => ({ ...prev, ...data.rates }));
    } catch {
      // Keep offline rates fallback
    }
  };

  const syncPrayerTimes = async () => {
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(prayerCity)}&country=Bangladesh&method=1`);
      const d = await res.json();
      if (d?.data?.timings) {
        const t = d.data.timings;
        setPrayers({ Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha });
      }
    } catch {
      // keep fallback
    }
  };

  const spinWheel = () => {
    const items = wheelNames.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    const idx = Math.floor(Math.random() * items.length);
    const slice = 360 / items.length;
    setWheelAngle((a) => a + 1080 + (360 - (idx + 0.5) * slice));
    setTimeout(() => setWheelWinner(items[idx]), 600);
  };

  const playMorseAudio = () => {
    const code = textToMorse(morsePlain);
    const ctx = new AudioContext();
    let t = ctx.currentTime + 0.05;
    for (const ch of code) {
      if (ch === '.' || ch === '-') {
        const dur = ch === '.' ? 0.08 : 0.22;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = 680;
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur + 0.07;
      } else {
        t += ch === '/' ? 0.28 : 0.14;
      }
    }
  };

  const handleScanImage = async (file: File) => {
    if ('BarcodeDetector' in window) {
      try {
        const bmp = await createImageBitmap(file);
        // @ts-expect-error BarcodeDetector global
        const det = new window.BarcodeDetector();
        const found = await det.detect(bmp);
        setScanResult(found.length ? found.map((f: { rawValue: string }) => f.rawValue).join(', ') : 'No QR/Barcode detected in image.');
      } catch {
        setScanResult('Could not decode image via BarcodeDetector.');
      }
    } else {
      setScanResult('Browser BarcodeDetector API unavailable in this runtime.');
    }
  };

  const hijriStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    } catch {
      return 'Hijri calendar';
    }
  }, []);

  const zakatRes = useMemo(
    () =>
      calcZakat({
        cashBank: zakatWealth.cash,
        goldSilverValue: zakatWealth.gold,
        investments: zakatWealth.stocks,
        businessStock: 0,
        liabilities: zakatWealth.debt,
        nisabThreshold: zakatWealth.nisab,
      }),
    [zakatWealth]
  );

  return (
    <div>
      <ToolHeader tool={tool} />
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['qr', 'QR & Code-128 Barcode'],
          ['security', 'Password & SHA Hash'],
          ['convert', 'Currency & BD/Intl Units'],
          ['bangla-islamic', 'Bangla Phonetic / Prayer / Zakat'],
          ['random', 'Spin Wheel / Dice / Coin / Emoji'],
          ['creative', 'Morse / Whiteboard / Quote'],
          ['printables', 'Calendar / Paper / Device'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'qr' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Offline QR Code Generator (SVG/PNG)">
            <div className="space-y-3 text-xs">
              <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-semibold">Color <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} /></label>
                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={qrRounded} onChange={(e) => setQrRounded(e.target.checked)} /> Rounded Dots</label>
              </div>
              <div className="mx-auto w-48 rounded-xl border border-[var(--line)] bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <button type="button" onClick={() => downloadText(qrSvg, 'qr_code.svg', 'image/svg+xml')} className="w-full rounded-lg bg-[var(--accent)] py-2 font-bold text-white">
                Download Crisp Vector .SVG
              </button>
            </div>
          </Panel>
          <Panel title="Code-128B Barcode & Scanner">
            <div className="space-y-3 text-xs">
              <input value={bcInput} onChange={(e) => setBcInput(e.target.value)} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              <div className="rounded-xl border border-[var(--line)] bg-white p-4" dangerouslySetInnerHTML={{ __html: bcSvg }} />
              <button type="button" onClick={() => downloadText(bcSvg, 'barcode.svg', 'image/svg+xml')} className="w-full rounded-lg border border-[var(--line)] py-2 font-semibold">
                Download Barcode .SVG
              </button>
              <div className="border-t border-[var(--line)] pt-3">
                <div className="mb-1 font-semibold">Scan QR / Barcode from Image</div>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleScanImage(e.target.files[0])} />
                {scanResult && <div className="mt-2 rounded bg-[var(--surface-2)] p-2 font-mono">{scanResult}</div>}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'security' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Cryptographic Password Generator">
            <div className="space-y-3 text-xs">
              <label className="flex justify-between font-semibold">
                <span>Length</span>
                <span className="font-mono">{pwLen} chars</span>
              </label>
              <input type="range" min={8} max={48} value={pwLen} onChange={(e) => setPwLen(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
              <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] p-3 font-mono text-sm font-bold">
                <span className="flex-1 break-all">{pwOut}</span>
                <CopyButton text={pwOut} />
              </div>
              <button type="button" onClick={generatePassword} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
            </div>
          </Panel>
          <Panel title="SHA-256 Text Hasher" actions={<CopyButton text={sha256Out} />}>
            <input value={hashInput} onChange={(e) => setHashInput(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs" />
            <div className="break-all rounded-lg bg-[var(--surface-2)] p-3 font-mono text-xs">{sha256Out}</div>
          </Panel>
        </div>
      )}

      {tab === 'convert' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Currency Converter (Live Sync + Offline Fallback)">
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <input type="number" value={curAmt} onChange={(e) => setCurAmt(Number(e.target.value))} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
              <select value={curFrom} onChange={(e) => setCurFrom(e.target.value)} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2">
                {Object.keys(rates).slice(0, 20).map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={curTo} onChange={(e) => setCurTo(e.target.value)} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2">
                {Object.keys(rates).slice(0, 20).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <StatTile
              label={`${curAmt} ${curFrom} =`}
              value={`${((curAmt / (rates[curFrom] || 1)) * (rates[curTo] || 1)).toFixed(2)} ${curTo}`}
            />
            <button type="button" onClick={syncRates} className="mt-3 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">
              Sync Live Rates
            </button>
          </Panel>
          <Panel title="Unit Converter (BD Land Katha/Bigha, Length, Weight, Temp)">
            <div className="flex gap-2 mb-3 text-xs">
              <select value={unitCat} onChange={(e) => setUnitCat(e.target.value as typeof unitCat)} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                <option value="area-bd">Land Area (Katha / Bigha / Decimal / Sqft)</option>
                <option value="length">Length (m / km / ft / mile)</option>
                <option value="weight">Weight (kg / g / lb / Vori)</option>
                <option value="temp">Temperature (°C / °F / K)</option>
              </select>
              <input type="number" value={unitVal} onChange={(e) => setUnitVal(Number(e.target.value))} className="w-28 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {unitCat === 'area-bd' && (
                <>
                  <StatTile label="Katha → Sq Ft" value={(unitVal * 720).toLocaleString()} />
                  <StatTile label="Katha → Decimal (শতাংশ)" value={(unitVal * 1.6529).toFixed(3)} />
                  <StatTile label="Katha → Bigha" value={(unitVal / 20).toFixed(3)} />
                  <StatTile label="Sq Meters" value={(unitVal * 66.89).toFixed(2)} />
                </>
              )}
              {unitCat === 'length' && (
                <>
                  <StatTile label="Meters → Feet" value={(unitVal * 3.28084).toFixed(3)} />
                  <StatTile label="Kilometers → Miles" value={(unitVal * 0.62137).toFixed(3)} />
                </>
              )}
              {unitCat === 'weight' && (
                <>
                  <StatTile label="Kg → Pounds" value={(unitVal * 2.20462).toFixed(2)} />
                  <StatTile label="Vori → Grams" value={(unitVal * 11.664).toFixed(3)} />
                </>
              )}
              {unitCat === 'temp' && (
                <>
                  <StatTile label="°C → °F" value={((unitVal * 9) / 5 + 32).toFixed(2)} />
                  <StatTile label="°C → Kelvin" value={(unitVal + 273.15).toFixed(2)} />
                </>
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'bangla-islamic' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Bangla Phonetic Keyboard & Keypad">
            <input value={banglish} onChange={(e) => setBanglish(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs" />
            <div className="flex items-center justify-between rounded-lg bg-[var(--accent-soft)] p-3 text-base font-bold text-[var(--accent-ink)]">
              <span>{phoneticToBangla(banglish)}</span>
              <CopyButton text={phoneticToBangla(banglish)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {['অ','আ','ই','ঈ','উ','ঊ','এ','ঐ','ও','ঔ','ক','খ','গ','ঘ','চ','ছ','জ','ঝ','ত','থ','দ','ধ','ন','প','ফ','ব','ভ','ম','র','ল','শ','ষ','স','হ','ং','ঁ'].map((ch) => (
                <button key={ch} type="button" onClick={() => setBanglish((s) => s + ch)} className="h-8 w-8 rounded border border-[var(--line)] bg-[var(--surface-2)] text-sm font-bold hover:border-[var(--accent)]">
                  {ch}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title={`Hijri (${hijriStr}), Prayer Times & Zakat`}>
            <div className="mb-3 flex gap-2 text-xs">
              <input value={prayerCity} onChange={(e) => setPrayerCity(e.target.value)} className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5" />
              <button type="button" onClick={syncPrayerTimes} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-bold text-white">Sync</button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-4 text-center text-xs">
              {Object.entries(prayers).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-2">
                  <div className="font-semibold">{k}</div>
                  <div className="font-mono font-bold">{v}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <label>Cash <input type="number" value={zakatWealth.cash} onChange={(e) => setZakatWealth((z) => ({ ...z, cash: Number(e.target.value) }))} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" /></label>
              <label>Gold/Silver <input type="number" value={zakatWealth.gold} onChange={(e) => setZakatWealth((z) => ({ ...z, gold: Number(e.target.value) }))} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" /></label>
              <label>Debts <input type="number" value={zakatWealth.debt} onChange={(e) => setZakatWealth((z) => ({ ...z, debt: Number(e.target.value) }))} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" /></label>
            </div>
            <StatTile label="Annual Zakat Due (2.5%)" value={Math.round(zakatRes.zakatDue).toLocaleString()} sub={`Net Zakatable: ${zakatRes.netWealth.toLocaleString()}`} />
          </Panel>
        </div>
      )}

      {tab === 'random' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Interactive Spin Wheel & Lucky Draw">
            <input value={wheelNames} onChange={(e) => setWheelNames(e.target.value)} className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs" />
            <div className="flex flex-col items-center">
              <div
                className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-[var(--accent)] bg-[var(--accent-soft)] text-center text-xs font-bold transition-transform duration-500"
                style={{ transform: `rotate(${wheelAngle}deg)` }}
              >
                Spin
              </div>
              <button type="button" onClick={spinWheel} className="mt-3 rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-bold text-white">
                Spin Wheel
              </button>
              {wheelWinner && <div className="mt-2 text-sm font-extrabold text-emerald-600">Winner: {wheelWinner}</div>}
            </div>
          </Panel>
          <Panel title="Dice Roller, Coin Flip & Quick Emojis">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDiceRes([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)])}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
              >
                Roll 2d6 ({diceRes[0]} + {diceRes[1]} = {diceRes[0] + diceRes[1]})
              </button>
              <button
                type="button"
                onClick={() => setCoinRes(Math.random() < 0.5 ? 'Heads' : 'Tails')}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-semibold"
              >
                Flip Coin ({coinRes})
              </button>
            </div>
            <div className="text-xs font-semibold mb-1.5">Click Emoji to Copy</div>
            <div className="flex flex-wrap gap-1.5">
              {['🚀', '✅', '⚡', '🔥', '📄', '🎯', '💡', '🎉', '🔒', '🇧🇩', '⭐', '❤️'].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(em)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-lg hover:border-[var(--accent)]"
                >
                  {em}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'creative' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Morse Code Translator & Audio">
            <input value={morsePlain} onChange={(e) => setMorsePlain(e.target.value)} className="mb-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs" />
            <div className="mb-3 rounded-lg bg-[var(--surface-2)] p-3 font-mono text-sm font-bold">{textToMorse(morsePlain)}</div>
            <div className="flex gap-2">
              <button type="button" onClick={playMorseAudio} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white">
                <Volume2 className="h-3.5 w-3.5" /> Play Morse Audio
              </button>
              <button type="button" onClick={() => setMorsePlain(morseToText(textToMorse(morsePlain)))} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">
                Roundtrip Check
              </button>
            </div>
          </Panel>
          <Panel title="Whiteboard Sketchpad & Quote Card">
            <div className="mb-2 flex items-center justify-between text-xs">
              <input type="color" value={wbColor} onChange={(e) => setWbColor(e.target.value)} />
              <button type="button" onClick={() => wbCanvasRef.current?.getContext('2d')?.clearRect(0, 0, 480, 180)} className="rounded border border-[var(--line)] px-2.5 py-1">
                Clear Board
              </button>
            </div>
            <canvas
              ref={wbCanvasRef}
              width={480}
              height={180}
              onPointerDown={(e) => {
                wbDrawingRef.current = true;
                const r = wbCanvasRef.current!.getBoundingClientRect();
                const ctx = wbCanvasRef.current!.getContext('2d')!;
                ctx.beginPath();
                ctx.moveTo(((e.clientX - r.left) / r.width) * 480, ((e.clientY - r.top) / r.height) * 180);
              }}
              onPointerMove={(e) => {
                if (!wbDrawingRef.current) return;
                const r = wbCanvasRef.current!.getBoundingClientRect();
                const ctx = wbCanvasRef.current!.getContext('2d')!;
                ctx.strokeStyle = wbColor;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineTo(((e.clientX - r.left) / r.width) * 480, ((e.clientY - r.top) / r.height) * 180);
                ctx.stroke();
              }}
              onPointerUp={() => {
                wbDrawingRef.current = false;
              }}
              className="w-full cursor-crosshair rounded-lg border border-[var(--line)] bg-white touch-none"
            />
            <div className="mt-3 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 p-4 text-white">
              <div className="text-sm font-bold">“{quoteText}”</div>
              <div className="mt-1 text-xs opacity-80">— {quoteAuthor}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <input value={quoteText} onChange={(e) => setQuoteText(e.target.value)} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1" />
              <input value={quoteAuthor} onChange={(e) => setQuoteAuthor(e.target.value)} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1" />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'printables' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Printable Calendar & Ruled/Grid Paper"
            actions={
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
                <Printer className="h-3.5 w-3.5" /> Print Sheet
              </button>
            }
          >
            <div className="mb-3 flex gap-2 text-xs">
              <input type="month" value={calMonth} onChange={(e) => setCalMonth(e.target.value)} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" />
              <select value={paperStyle} onChange={(e) => setPaperStyle(e.target.value as typeof paperStyle)} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5">
                <option value="ruled">Ruled Notebook</option>
                <option value="grid">Graph Grid</option>
                <option value="dot">Dot Grid</option>
              </select>
            </div>
            <div className="print-area rounded-lg border border-[var(--line)] bg-white p-4 text-slate-900">
              <div className="mb-2 text-sm font-bold">{calMonth} Planner</div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
                {Array.from({ length: 30 }, (_, i) => (
                  <div key={i} className="h-9 rounded border border-slate-200 p-1 text-left font-mono text-[10px]">{i + 1}</div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Device & Browser Environment Probe">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Viewport" value={`${window.innerWidth}×${window.innerHeight}`} sub={`DPR ${window.devicePixelRatio}`} />
              <StatTile label="CPU / Online" value={`${navigator.hardwareConcurrency || 4} cores`} sub={navigator.onLine ? 'Online' : 'Offline'} />
            </div>
            <div className="mt-3 rounded-lg bg-[var(--surface-2)] p-3 font-mono text-[11px] text-[var(--ink-2)] break-all">
              {navigator.userAgent}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

// ==================== BUSINESS & PRINT (11) ====================
export function BusinessPrintWorkspace({ tool }: { tool: ToolDef }) {
  const { navigateToTool } = useWorkspace();
  const [tab, setTab] = useState(tool.tab || 'invoice');

  // Invoice & Receipt
  const [bizName, setBizName] = useState('Anik Creative Tech Ltd.');
  const [clientName, setClientName] = useState('Dhaka Retail Solutions');
  const [invNo, setInvNo] = useState('INV-2025-104');
  const [invItems, setInvItems] = useState([
    { desc: 'Web Platform Design & Setup', qty: 1, rate: 45000 },
    { desc: 'PDF Automation Pipeline', qty: 2, rate: 12000 },
  ]);

  // Gold Calculator (BAJUS)
  const [vori, setVori] = useState(1);
  const [ana, setAna] = useState(4);
  const [roti, setRoti] = useState(0);
  const [point, setPoint] = useState(0);
  const [pricePerVori, setPricePerVori] = useState(145000);
  const [includeVat, setIncludeVat] = useState(true);

  // Number to Words & Cheque
  const [amtWords, setAmtWords] = useState(125500);
  const [payeeName, setPayeeName] = useState('Tariq Hasan');

  // Certificate & Card & Label
  const [certRecipient, setCertRecipient] = useState('Nadia Karim');
  const [certCourse, setCertCourse] = useState('Full-Stack TypeScript Engineering');
  const [priceLabel, setPriceLabel] = useState({ title: 'Wireless Mechanical Keyboard', sku: 'SKU-4092', price: '৳ 4,250' });

  // Signature Pad
  const sigRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);

  useEffect(() => {
    setTab(tool.tab || 'invoice');
  }, [tool.id, tool.tab]);

  const invTotal = invItems.reduce((s, it) => s + it.qty * it.rate, 0);
  const goldRes = useMemo(
    () => calcBajusGoldPrice({ vori, ana, roti, point, pricePerVori, makingPerGram: 600, includeVat5Pct: includeVat }),
    [vori, ana, roti, point, pricePerVori, includeVat]
  );
  const invQr = useMemo(() => renderQrSvg(`${invNo} | ${bizName} | Total: ${invTotal}`), [invNo, bizName, invTotal]);
  const labelBc = useMemo(() => renderCode128Svg(priceLabel.sku), [priceLabel.sku]);

  return (
    <div>
      <ToolHeader
        tool={tool}
        extra={
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 no-print">
        {[
          ['invoice', 'Invoice'],
          ['receipt', 'Money Receipt / মানি রসিদ'],
          ['gold', 'BAJUS Gold (ভরি/আনা)'],
          ['cheque', 'Cheque & Words (EN/BN)'],
          ['cert', 'Certificate'],
          ['card', 'Business Card'],
          ['labels', 'Price Label & Barcode Sheet'],
          ['sign', 'Signature Studio'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'invoice' && (
        <div className="grid gap-5 lg:grid-cols-12">
          <Panel title="Invoice Fields" className="lg:col-span-5 no-print">
            <div className="space-y-2 text-xs">
              <input value={bizName} onChange={(e) => setBizName(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2" placeholder="Company" />
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2" placeholder="Client" />
              <input value={invNo} onChange={(e) => setInvNo(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 font-mono" />
              {invItems.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5">
                  <input value={it.desc} onChange={(e) => setInvItems((p) => p.map((x, k) => (k === i ? { ...x, desc: e.target.value } : x)))} className="col-span-6 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1" />
                  <input type="number" value={it.qty} onChange={(e) => setInvItems((p) => p.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)))} className="col-span-2 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                  <input type="number" value={it.rate} onChange={(e) => setInvItems((p) => p.map((x, k) => (k === i ? { ...x, rate: Number(e.target.value) } : x)))} className="col-span-4 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 font-mono" />
                </div>
              ))}
              <button type="button" onClick={() => setInvItems((p) => [...p, { desc: 'Consultation', qty: 1, rate: 5000 }])} className="rounded bg-[var(--surface-2)] px-3 py-1.5 font-semibold">
                + Add Line Item
              </button>
            </div>
          </Panel>
          <div className="print-area rounded-xl border border-[var(--line)] bg-white p-6 text-slate-900 lg:col-span-7">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-indigo-700">{bizName}</h2>
                <div className="text-xs text-slate-500">Bill To: {clientName}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold">{invNo}</div>
                <div className="w-16 ml-auto mt-1" dangerouslySetInnerHTML={{ __html: invQr }} />
              </div>
            </div>
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invItems.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2">{it.desc}</td>
                    <td className="py-2 text-right font-mono">{it.qty}</td>
                    <td className="py-2 text-right font-mono font-bold">{(it.qty * it.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 border-t border-slate-200 pt-3 text-right">
              <div className="text-base font-extrabold">Total: ৳ {invTotal.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500">{numToWordsEnBD(invTotal)} Taka Only</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'receipt' && (
        <Panel title="Money Receipt / মানি রসিদ">
          <div className="print-area rounded-xl border-2 border-slate-300 bg-white p-6 text-slate-900">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-lg font-extrabold">{bizName}</div>
                <div className="text-xs text-slate-500">Official Money Receipt / মানি রসিদ</div>
              </div>
              <div className="font-mono text-xs">Date: {new Date().toISOString().slice(0, 10)}</div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div>Received with thanks from: <strong>{clientName}</strong></div>
              <div>Amount: <strong className="font-mono">৳ {amtWords.toLocaleString()}</strong> ({numToWordsEnBD(amtWords)} Taka / {numToWordsBn(amtWords)} টাকা)</div>
            </div>
          </div>
        </Panel>
      )}

      {tab === 'gold' && (
        <Panel title="BAJUS Gold Calculator (ভরি / আনা / রতি / পয়েন্ট ⇄ Gram)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs mb-4">
            <label>ভরি (Vori)<input type="number" min={0} value={vori} onChange={(e) => setVori(Number(e.target.value))} className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" /></label>
            <label>আনা (Ana)<input type="number" min={0} max={15} value={ana} onChange={(e) => setAna(Number(e.target.value))} className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" /></label>
            <label>রতি (Roti)<input type="number" min={0} max={5} value={roti} onChange={(e) => setRoti(Number(e.target.value))} className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" /></label>
            <label>পয়েন্ট (Pt)<input type="number" min={0} max={9} value={point} onChange={(e) => setPoint(Number(e.target.value))} className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" /></label>
            <label>Price/Vori<input type="number" value={pricePerVori} onChange={(e) => setPricePerVori(Number(e.target.value))} className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 font-mono" /></label>
          </div>
          <label className="mb-4 inline-flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} /> Include 5% BD Govt VAT + Making (৳600/g)
          </label>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="Total Weight" value={`${goldRes.totalGrams.toFixed(3)} g`} sub={`${toBanglaDigits(goldRes.totalVori.toFixed(3))} ভরি`} />
            <StatTile label="Gold Value" value={`৳ ${Math.round(goldRes.goldCost).toLocaleString()}`} />
            <StatTile label="Making + 5% VAT" value={`৳ ${Math.round(goldRes.makingCost + goldRes.vat).toLocaleString()}`} />
            <StatTile label="Grand Total" value={`৳ ${Math.round(goldRes.grandTotal).toLocaleString()}`} />
          </div>
        </Panel>
      )}

      {tab === 'cheque' && (
        <Panel title="Bank Cheque Leaf & Number to Words (BD / Intl / বাংলা)">
          <div className="grid gap-3 sm:grid-cols-2 text-xs mb-4">
            <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Payee Name" className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2" />
            <input type="number" value={amtWords} onChange={(e) => setAmtWords(Number(e.target.value))} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono" />
          </div>
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 text-slate-900 mb-4">
            <div className="flex justify-between text-xs font-semibold text-emerald-800">
              <span>A/C PAYEE ONLY</span>
              <span className="font-mono">DATE: {new Date().toLocaleDateString()}</span>
            </div>
            <div className="mt-3 text-sm">PAY: <strong>{payeeName}</strong></div>
            <div className="mt-1 text-xs">THE SUM OF: <strong>{numToWordsEnBD(amtWords)} Taka Only</strong></div>
            <div className="mt-2 text-right font-mono text-base font-extrabold">৳ {amtWords.toLocaleString()}/=</div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-[var(--surface-2)] p-3"><strong>English (BD Lakh/Crore):</strong> {numToWordsEnBD(amtWords)}</div>
            <div className="rounded-lg bg-[var(--surface-2)] p-3"><strong>English (International):</strong> {numToWordsEnIntl(amtWords)}</div>
            <div className="rounded-lg bg-[var(--surface-2)] p-3"><strong>বাংলা কথায়:</strong> {numToWordsBn(amtWords)} ({toBanglaDigits(amtWords)})</div>
          </div>
        </Panel>
      )}

      {tab === 'cert' && (
        <Panel title="Gold-Seal Certificate Generator">
          <div className="grid grid-cols-2 gap-3 text-xs mb-4 no-print">
            <input value={certRecipient} onChange={(e) => setCertRecipient(e.target.value)} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2" />
            <input value={certCourse} onChange={(e) => setCertCourse(e.target.value)} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2" />
          </div>
          <div className="print-area rounded-xl border-8 border-double border-amber-400 bg-white p-10 text-center text-slate-900">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">Certificate of Achievement</div>
            <div className="mt-3 text-3xl font-extrabold font-display">{certRecipient}</div>
            <div className="mt-2 text-sm text-slate-600">for successfully completing <strong>{certCourse}</strong></div>
            <div className="mt-6 text-xs text-slate-500">Issued by {bizName} · {new Date().toISOString().slice(0, 10)}</div>
          </div>
        </Panel>
      )}

      {tab === 'card' && (
        <Panel title="Scannable Business Card Maker">
          <div className="mx-auto max-w-md rounded-2xl bg-slate-900 p-6 text-white flex items-center justify-between">
            <div>
              <div className="text-lg font-extrabold">{payeeName}</div>
              <div className="text-xs text-slate-300">{bizName}</div>
              <div className="mt-3 font-mono text-xs text-sky-300">hello@anik.studio</div>
            </div>
            <div className="h-20 w-20 rounded-lg bg-white p-1.5" dangerouslySetInnerHTML={{ __html: invQr }} />
          </div>
        </Panel>
      )}

      {tab === 'labels' && (
        <Panel title="Retail Price Label & 3×4 Barcode Sticker Sheet">
          <div className="grid grid-cols-3 gap-2 text-xs mb-4 no-print">
            <input value={priceLabel.title} onChange={(e) => setPriceLabel((p) => ({ ...p, title: e.target.value }))} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2" />
            <input value={priceLabel.sku} onChange={(e) => setPriceLabel((p) => ({ ...p, sku: e.target.value }))} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 font-mono" />
            <input value={priceLabel.price} onChange={(e) => setPriceLabel((p) => ({ ...p, price: e.target.value }))} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 font-mono font-bold" />
          </div>
          <div className="print-area grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-lg border border-slate-300 bg-white p-3 text-center text-slate-900">
                <div className="truncate text-xs font-bold">{priceLabel.title}</div>
                <div className="text-base font-extrabold text-indigo-700">{priceLabel.price}</div>
                <div className="mt-1" dangerouslySetInnerHTML={{ __html: labelBc }} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'sign' && (
        <Panel title="Digital Signature Pad">
          <canvas
            ref={sigRef}
            width={520}
            height={180}
            onPointerDown={(e) => {
              sigDrawing.current = true;
              const r = sigRef.current!.getBoundingClientRect();
              const ctx = sigRef.current!.getContext('2d')!;
              ctx.beginPath();
              ctx.moveTo(((e.clientX - r.left) / r.width) * 520, ((e.clientY - r.top) / r.height) * 180);
            }}
            onPointerMove={(e) => {
              if (!sigDrawing.current) return;
              const r = sigRef.current!.getBoundingClientRect();
              const ctx = sigRef.current!.getContext('2d')!;
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 3;
              ctx.lineCap = 'round';
              ctx.lineTo(((e.clientX - r.left) / r.width) * 520, ((e.clientY - r.top) / r.height) * 180);
              ctx.stroke();
            }}
            onPointerUp={() => {
              sigDrawing.current = false;
            }}
            className="w-full max-w-lg cursor-crosshair rounded-xl border border-[var(--line-strong)] bg-white touch-none"
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => sigRef.current?.getContext('2d')?.clearRect(0, 0, 520, 180)}
              className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold"
            >
              Clear Signature
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!sigRef.current) return;
                downloadBlob(await canvasToBlob(sigRef.current, 'image/png', 1), 'signature.png');
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" /> Download Transparent PNG
            </button>
            <button
              type="button"
              onClick={() => {
                if (!sigRef.current) return;
                navigateToTool('pdf-sign', { signatureDataUrl: sigRef.current.toDataURL('image/png') });
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white"
            >
              <Send className="h-3.5 w-3.5" /> Stamp directly onto a PDF
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
