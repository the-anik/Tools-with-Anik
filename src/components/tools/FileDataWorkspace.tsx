import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Download } from 'lucide-react';
import { ToolDef } from '../../data/toolsCatalog';
import { ToolHeader, FileDropzone, Panel, StatTile, CopyButton } from '../ui/SharedUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  csvToJson,
  fmtBytes,
  jsonToCsv,
  jsonToSimpleXml,
  parseCsv,
  simpleXmlToJson,
} from '../../utils/formatters';
import { crc32, detectMagicMime, hexDump, shannonEntropy } from '../../utils/barcodeQr';
import { downloadBlob, downloadText, readFileAsBytes } from '../../utils/download';

export function FileDataWorkspace({ tool }: { tool: ToolDef }) {
  const { transfer, clearTransfer } = useWorkspace();
  const [tab, setTab] = useState(tool.tab || 'csv-json');
  const [inputText, setInputText] = useState('name,department,salary\nAnik,Engineering,95000\nNadia,Design,88000\nTariq,Operations,72000');
  const [outputText, setOutputText] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // ZIP Builder & Inspector
  const [zipInputFiles, setZipInputFiles] = useState<File[]>([]);
  const [zipEntries, setZipEntries] = useState<{ name: string; size: number; dir: boolean; getBlob: () => Promise<Blob> }[]>([]);

  // File Inspector & Checksums
  const [inspectedFile, setInspectedFile] = useState<{
    name: string;
    size: number;
    mime: string;
    label: string;
    mismatch: boolean;
    entropy: number;
    crc: string;
    sha256: string;
    sha512: string;
    hex: string;
  } | null>(null);

  // CSV Viewer sort/filter
  const [csvFilter, setCsvFilter] = useState('');
  const [sortCol, setSortCol] = useState(0);

  // Dummy Data Generator
  const [dummyCount, setDummyCount] = useState(8);
  const [dummyLang, setDummyLang] = useState<'en' | 'bn'>('en');
  const [dummyFmt, setDummyFmt] = useState<'json' | 'csv' | 'sql'>('json');

  useEffect(() => {
    setTab(tool.tab || 'csv-json');
  }, [tool.id, tool.tab]);

  useEffect(() => {
    if (transfer?.files?.[0]) {
      const f = transfer.files[0];
      if (f.name.toLowerCase().endsWith('.zip')) handleInspectZip(f);
      else if (/\.(csv|json|xml|txt)$/i.test(f.name)) {
        f.text().then((t) => setInputText(t));
      } else {
        handleInspectBinary(f);
      }
      clearTransfer();
    }
  }, [transfer]);

  const handleInspectZip = async (f: File) => {
    const z = await JSZip.loadAsync(await f.arrayBuffer());
    const list = Object.entries(z.files).map(([name, entry]) => ({
      name,
      dir: entry.dir,
      size: 0,
      getBlob: () => entry.async('blob'),
    }));
    setZipEntries(list);
  };

  const handleInspectBinary = async (f: File) => {
    const bytes = await readFileAsBytes(f);
    const magic = detectMagicMime(bytes, f.name);
    const entropy = shannonEntropy(bytes);
    const crc = crc32(bytes);
    const h256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice())))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const h512 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-512', bytes.slice())))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setInspectedFile({
      name: f.name,
      size: f.size,
      mime: magic.mime,
      label: magic.label,
      mismatch: magic.extensionMismatch,
      entropy,
      crc,
      sha256: h256,
      sha512: h512,
      hex: hexDump(bytes, 512),
    });
  };

  const csvRows = useMemo(() => parseCsv(inputText), [inputText]);
  const csvHeaders = csvRows[0] || [];
  const csvBody = useMemo(() => {
    const q = csvFilter.trim().toLowerCase();
    return csvRows
      .slice(1)
      .filter((r) => !q || r.some((cell) => cell.toLowerCase().includes(q)))
      .sort((a, b) => (a[sortCol] || '').localeCompare(b[sortCol] || '', undefined, { numeric: true }));
  }, [csvRows, csvFilter, sortCol]);

  const sortKeysDeep = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(sortKeysDeep);
    if (val && typeof val === 'object') {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce((acc, k) => {
          acc[k] = sortKeysDeep((val as Record<string, unknown>)[k]);
          return acc;
        }, {} as Record<string, unknown>);
    }
    return val;
  };

  const runGenerateDummy = () => {
    const enNames = ['Anik Rahman', 'Nadia Karim', 'Tariq Hasan', 'Sarah Kabir', 'Rafi Ahmed', 'Maya Chowdhury'];
    const bnNames = ['অনিক রহমান', 'নাদিয়া করিম', 'তারিক হাসান', 'সারা কবির', 'রাফি আহমেদ', 'মায়া চৌধুরী'];
    const citiesEn = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna'];
    const citiesBn = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা'];
    const records = Array.from({ length: dummyCount }, (_, i) => ({
      id: i + 1,
      name: (dummyLang === 'bn' ? bnNames : enNames)[i % 6],
      city: (dummyLang === 'bn' ? citiesBn : citiesEn)[i % 5],
      email: `user${i + 1}@example.com`,
      balance: 1500 + ((i * 731) % 8500),
    }));
    if (dummyFmt === 'json') setOutputText(JSON.stringify(records, null, 2));
    else if (dummyFmt === 'csv') setOutputText(jsonToCsv(records));
    else {
      setOutputText(
        records
          .map(
            (r) =>
              `INSERT INTO users (id, name, city, email, balance) VALUES (${r.id}, '${r.name}', '${r.city}', '${r.email}', ${r.balance});`
          )
          .join('\n')
      );
    }
  };

  return (
    <div>
      <ToolHeader tool={tool} />

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {[
          ['csv-json', 'CSV ⇄ JSON'],
          ['csv-grid', 'CSV Viewer & Chart'],
          ['json', 'JSON Format / Validate / Sort'],
          ['xml', 'XML ⇄ JSON'],
          ['zip-create', 'ZIP Creator & Packager'],
          ['zip-inspect', 'ZIP Inspector & Extract'],
          ['inspect', 'File Info / MIME / SHA / Hex'],
          ['dummy', 'Dummy Data (EN/BN)'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setErrMsg('');
            }}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {errMsg && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
          {errMsg}
        </div>
      )}

      {(tab === 'csv-json' || tab === 'json' || tab === 'xml') && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Input Data">
            <textarea
              rows={13}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {tab === 'csv-json' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setErrMsg('');
                      setOutputText(JSON.stringify(csvToJson(inputText), null, 2));
                    }}
                    className="rounded-lg bg-[var(--accent)] px-3.5 py-2 font-bold text-white"
                  >
                    CSV → JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setErrMsg('');
                        setOutputText(jsonToCsv(JSON.parse(inputText)));
                      } catch (e) {
                        setErrMsg((e as Error).message);
                      }
                    }}
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2 font-semibold"
                  >
                    JSON → CSV
                  </button>
                </>
              )}
              {tab === 'json' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setErrMsg('');
                        setOutputText(JSON.stringify(JSON.parse(inputText), null, 2));
                      } catch (e) {
                        setErrMsg(`Invalid JSON: ${(e as Error).message}`);
                      }
                    }}
                    className="rounded-lg bg-[var(--accent)] px-3.5 py-2 font-bold text-white"
                  >
                    Format & Validate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setErrMsg('');
                        setOutputText(JSON.stringify(JSON.parse(inputText)));
                      } catch (e) {
                        setErrMsg(`Invalid JSON: ${(e as Error).message}`);
                      }
                    }}
                    className="rounded-lg border border-[var(--line)] px-3.5 py-2 font-semibold"
                  >
                    Minify
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setErrMsg('');
                        setOutputText(JSON.stringify(sortKeysDeep(JSON.parse(inputText)), null, 2));
                      } catch (e) {
                        setErrMsg(`Invalid JSON: ${(e as Error).message}`);
                      }
                    }}
                    className="rounded-lg border border-[var(--line)] px-3.5 py-2 font-semibold"
                  >
                    Sort Keys A–Z
                  </button>
                </>
              )}
              {tab === 'xml' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setErrMsg('');
                      setOutputText(JSON.stringify(simpleXmlToJson(inputText), null, 2));
                    }}
                    className="rounded-lg bg-[var(--accent)] px-3.5 py-2 font-bold text-white"
                  >
                    XML → JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setErrMsg('');
                        setOutputText(jsonToSimpleXml(JSON.parse(inputText), 'root'));
                      } catch (e) {
                        setErrMsg((e as Error).message);
                      }
                    }}
                    className="rounded-lg border border-[var(--line)] px-3.5 py-2 font-semibold"
                  >
                    JSON → XML
                  </button>
                </>
              )}
            </div>
          </Panel>
          <Panel
            title="Converted Output"
            actions={
              <>
                <CopyButton text={outputText} />
                <button
                  type="button"
                  onClick={() => downloadText(outputText, 'converted_output.txt')}
                  className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-semibold"
                >
                  Download
                </button>
              </>
            }
          >
            <textarea
              readOnly
              rows={13}
              value={outputText}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
            />
          </Panel>
        </div>
      )}

      {tab === 'csv-grid' && (
        <div className="space-y-4">
          <Panel title="CSV Source & Filter">
            <div className="flex flex-wrap gap-3 mb-3">
              <input
                value={csvFilter}
                onChange={(e) => setCsvFilter(e.target.value)}
                placeholder="Filter rows..."
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs"
              />
              <span className="self-center font-mono text-xs text-[var(--muted)]">
                {csvBody.length} row(s) · {csvHeaders.length} col(s)
              </span>
            </div>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-2.5 font-mono text-xs"
            />
          </Panel>
          <Panel title="Interactive Table (Click header to sort)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {csvHeaders.map((h, i) => (
                      <th
                        key={i}
                        onClick={() => setSortCol(i)}
                        className="cursor-pointer py-2 pr-3 font-bold text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        {h} {sortCol === i ? '▾' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {csvBody.map((r, ri) => (
                    <tr key={ri}>
                      {csvHeaders.map((_, ci) => (
                        <td key={ci} className="py-2 pr-3 font-mono text-[var(--ink-2)]">
                          {r[ci]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'zip-create' && (
        <Panel title="Create Compressed ZIP Archive">
          <FileDropzone
            multiple
            onFiles={(fs) => setZipInputFiles((p) => [...p, ...fs])}
            label={`Drop files to add (${zipInputFiles.length} staged)`}
          />
          {zipInputFiles.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-semibold">
                Total Raw Size: {fmtBytes(zipInputFiles.reduce((s, f) => s + f.size, 0))}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const zip = new JSZip();
                  zipInputFiles.forEach((f) => zip.file(f.name, f));
                  downloadBlob(await zip.generateAsync({ type: 'blob' }), 'anik_archive.zip');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white"
              >
                <Download className="h-3.5 w-3.5" /> Build & Download .ZIP
              </button>
            </div>
          )}
        </Panel>
      )}

      {tab === 'zip-inspect' && (
        <Panel title="Inspect & Extract ZIP Contents">
          <FileDropzone
            accept=".zip"
            compact
            onFiles={(fs) => fs[0] && handleInspectZip(fs[0])}
            label="Drop a .ZIP archive to inspect internal tree"
          />
          {zipEntries.length > 0 && (
            <div className="mt-4 divide-y divide-[var(--line)] text-xs">
              {zipEntries.map((ent, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="font-mono">{ent.name}</span>
                  {!ent.dir && (
                    <button
                      type="button"
                      onClick={async () => downloadBlob(await ent.getBlob(), ent.name.split('/').pop() || 'file')}
                      className="rounded bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent-ink)]"
                    >
                      Extract
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'inspect' && (
        <div className="space-y-4">
          <FileDropzone
            compact
            onFiles={(fs) => fs[0] && handleInspectBinary(fs[0])}
            label="Drop any binary or text file to inspect Magic MIME, Entropy, SHA-256/512, CRC-32 & Hex Dump"
          />
          {inspectedFile && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="True Magic MIME" value={inspectedFile.mime} sub={inspectedFile.label} />
                <StatTile label="Byte Size" value={fmtBytes(inspectedFile.size)} sub={`${inspectedFile.size.toLocaleString()} B`} />
                <StatTile label="Shannon Entropy" value={`${inspectedFile.entropy.toFixed(3)} / 8`} />
                <StatTile label="CRC-32" value={inspectedFile.crc} sub={inspectedFile.mismatch ? 'Extension mismatch!' : 'Ext matches'} />
              </div>
              <Panel title="Cryptographic Checksums & Hex/ASCII Dump (first 512 bytes)">
                <div className="mb-3 space-y-1.5 font-mono text-xs">
                  <div>
                    <strong>SHA-256:</strong> {inspectedFile.sha256}
                  </div>
                  <div className="break-all">
                    <strong>SHA-512:</strong> {inspectedFile.sha512}
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed">
                  {inspectedFile.hex}
                </pre>
              </Panel>
            </>
          )}
        </div>
      )}

      {tab === 'dummy' && (
        <Panel title="Generate Mock Datasets (EN & বাংলা)">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <input
              type="number"
              min={1}
              max={200}
              value={dummyCount}
              onChange={(e) => setDummyCount(Number(e.target.value))}
              className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono"
            />
            <select
              value={dummyLang}
              onChange={(e) => setDummyLang(e.target.value as 'en' | 'bn')}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
            >
              <option value="en">English Dataset</option>
              <option value="bn">বাংলা Dataset</option>
            </select>
            <select
              value={dummyFmt}
              onChange={(e) => setDummyFmt(e.target.value as 'json' | 'csv' | 'sql')}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2"
            >
              <option value="json">JSON Array</option>
              <option value="csv">CSV Table</option>
              <option value="sql">SQL INSERT</option>
            </select>
            <button
              type="button"
              onClick={runGenerateDummy}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 font-bold text-white"
            >
              Generate {dummyCount} Rows
            </button>
            {outputText && <CopyButton text={outputText} />}
          </div>
          <textarea
            readOnly
            rows={12}
            value={outputText}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 font-mono text-xs"
          />
        </Panel>
      )}
    </div>
  );
}
