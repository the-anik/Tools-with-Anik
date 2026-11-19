import React, { useState } from 'react';
import { Menu, Search, Sun, Moon, Layers, Home, ChevronDown, ChevronRight, X } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { CATEGORIES, TOOLS_CATALOG, ToolCategory } from './data/toolsCatalog';
import { HomeOverview } from './components/HomeOverview';
import { CommandPalette } from './components/CommandPalette';
import { BrandMark, CategoryIcon } from './components/ui/CategoryIcon';
import { PdfWorkspace } from './components/pdf/PdfWorkspace';
import { PdfBatchWorkspace } from './components/pdf/PdfBatchWorkspace';
import { ImageStudioWorkspace } from './components/tools/ImageStudioWorkspace';
import { NonPdfBatchWorkspace } from './components/tools/NonPdfBatchWorkspace';
import { TextStudioWorkspace } from './components/tools/TextStudioWorkspace';
import { FileDataWorkspace } from './components/tools/FileDataWorkspace';
import { CalculatorWorkspace } from './components/tools/CalculatorWorkspace';
import {
  DevToolsWorkspace,
  ProductivityWorkspace,
  TravelToolsWorkspace,
} from './components/tools/DevProductivityTravelWorkspaces';
import {
  BusinessPrintWorkspace,
  EverydayWorkspace,
} from './components/tools/EverydayBizWorkspaces';

function StudioShell() {
  const { theme, toggleTheme, activeToolId, activeTool, navigateToTool, setCommandOpen } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sideFilter, setSideFilter] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'PDF Workspace': true,
    'Pro Batch Studio': false,
    'Image Studio': false,
    'Text Studio': false,
    'File & Data': false,
    Calculators: false,
    'Developer Tools': false,
    Productivity: false,
    'Travel Tools': false,
    'Everyday Utilities': false,
    'Business & Print': false,
  });

  const toggleCat = (cat: ToolCategory) => {
    setExpandedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const renderWorkspace = () => {
    if (!activeTool || activeToolId === 'home') return <HomeOverview />;
    if (activeTool.engine === 'pdf-batch') return <PdfBatchWorkspace tool={activeTool} />;
    if (activeTool.engine.startsWith('pdf-')) return <PdfWorkspace tool={activeTool} />;
    if (activeTool.engine === 'img-studio') return <ImageStudioWorkspace tool={activeTool} />;
    if (activeTool.engine === 'batch-nonpdf') return <NonPdfBatchWorkspace tool={activeTool} />;
    if (activeTool.engine === 'text-studio') return <TextStudioWorkspace tool={activeTool} />;
    if (activeTool.engine === 'file-data') return <FileDataWorkspace tool={activeTool} />;
    if (activeTool.engine === 'calc') return <CalculatorWorkspace tool={activeTool} />;
    if (activeTool.engine === 'dev-tools') return <DevToolsWorkspace tool={activeTool} />;
    if (activeTool.engine === 'productivity') return <ProductivityWorkspace tool={activeTool} />;
    if (activeTool.engine === 'travel') return <TravelToolsWorkspace tool={activeTool} />;
    if (activeTool.engine === 'everyday') return <EverydayWorkspace tool={activeTool} />;
    if (activeTool.engine === 'business') return <BusinessPrintWorkspace tool={activeTool} />;
    return <HomeOverview />;
  };

  const sideQ = sideFilter.trim().toLowerCase();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Top Bar: clean single-line workspace header */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-2)] hover:bg-[var(--surface-2)] lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => navigateToTool('home')}
            className="flex items-center gap-2.5 shrink-0 whitespace-nowrap rounded-lg py-1 pr-1"
          >
            <BrandMark className="h-8 w-8 shrink-0" />
            <span className="font-display text-[15px] font-extrabold tracking-tight text-[var(--ink)]">
              Tools with Anik
            </span>
          </button>

          {activeTool && (
            <div className="hidden items-center gap-2 text-xs text-[var(--muted)] md:flex min-w-0 pl-1">
              <span aria-hidden="true" className="text-[var(--line-strong)]">/</span>
              <span className="truncate">{activeTool.cat}</span>
              <span aria-hidden="true" className="text-[var(--line-strong)]">/</span>
              <span className="truncate font-semibold text-[var(--ink)]">{activeTool.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label={`Search ${TOOLS_CATALOG.length} tools`}
            className="inline-flex h-9 items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/75 px-3 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Search {TOOLS_CATALOG.length} tools...</span>
            <kbd className="hidden rounded border border-[var(--line-strong)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--muted)] sm:inline">
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => navigateToTool('pdf-batch')}
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold text-white shadow-[var(--shadow-xs)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
          >
            <Layers className="h-3.5 w-3.5" />
            Batch Studio
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors shrink-0"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sticky Independently Scrollable Sidebar */}
        <aside
          aria-label="Tool categories"
          className={`no-print fixed inset-y-14 left-0 z-20 flex w-[264px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] transition-transform duration-200 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
          }`}
        >
          <div className="border-b border-[var(--line)] p-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                navigateToTool('home');
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                activeToolId === 'home'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
              }`}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span>Workspace Home</span>
            </button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                placeholder="Filter navigation..."
                aria-label="Filter navigation"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/70 py-1.5 pl-8 pr-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {CATEGORIES.map((cat) => {
              const catTools = TOOLS_CATALOG.filter(
                (t) =>
                  t.cat === cat.id &&
                  (!sideQ ||
                    t.name.toLowerCase().includes(sideQ) ||
                    t.cat.toLowerCase().includes(sideQ))
              );
              if (sideQ && catTools.length === 0) return null;
              const isOpen = sideQ.length > 0 || expandedCats[cat.id] || activeTool?.cat === cat.id;

              return (
                <div key={cat.id} className="pb-0.5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleCat(cat.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${cat.color}16`, color: cat.color }}
                      >
                        <CategoryIcon category={cat.id} className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-[var(--muted)] shrink-0 pl-1">
                      {catTools.length}
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 ml-3 border-l border-[var(--line)] pl-2 space-y-0.5">
                      {catTools.map((t) => {
                        const isActive = activeToolId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              navigateToTool(t.id);
                              setSidebarOpen(false);
                            }}
                            className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                              isActive
                                ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-ink)]'
                                : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Backdrop on Mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-14 z-10 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Viewport */}
        <main className="min-w-0 flex-1 flex flex-col">
          <div className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {renderWorkspace()}
          </div>
          <footer className="no-print border-t border-[var(--line)] bg-[var(--surface)]/60 px-6 py-4">
            <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--ink-2)]">Tools with Anik</span>
                <span aria-hidden="true">·</span>
                <span>{TOOLS_CATALOG.length} local browser utilities</span>
              </div>
              <span>Runs privately on your device with zero file uploads</span>
            </div>
          </footer>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <StudioShell />
    </WorkspaceProvider>
  );
}
