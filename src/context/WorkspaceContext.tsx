import React, { createContext, useContext, useEffect, useState } from 'react';
import { ToolDef, getToolById } from '../data/toolsCatalog';

export interface WorkspaceTransfer {
  files?: File[];
  text?: string;
  secondaryText?: string;
  signatureDataUrl?: string;
  nonce: number;
}

interface WorkspaceContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeToolId: string; // 'home' or tool id
  activeTool: ToolDef | undefined;
  navigateToTool: (toolId: string, transfer?: Omit<WorkspaceTransfer, 'nonce'>) => void;
  favorites: string[];
  toggleFavorite: (toolId: string) => void;
  recents: string[];
  transfer: WorkspaceTransfer | null;
  clearTransfer: () => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const THEME_KEY = 'tools_with_anik_theme_v1';
const FAV_KEY = 'tools_with_anik_favs_v1';
const REC_KEY = 'tools_with_anik_recents_v1';

function readInitialToolFromHash(): string {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (raw && getToolById(raw)) return raw;
  } catch {
    // ignore
  }
  return 'home';
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [activeToolId, setActiveToolId] = useState<string>(readInitialToolFromHash);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(REC_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [transfer, setTransfer] = useState<WorkspaceTransfer | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveToolId(readInitialToolFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(toolId) ? prev.filter((x) => x !== toolId) : [toolId, ...prev];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navigateToTool = (toolId: string, nextTransfer?: Omit<WorkspaceTransfer, 'nonce'>) => {
    setActiveToolId(toolId);
    try {
      const targetHash = toolId === 'home' ? '' : `#/${toolId}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash || window.location.pathname + window.location.search);
      }
    } catch {
      // ignore history errors in sandboxed iframes
    }
    if (nextTransfer) {
      setTransfer({ ...nextTransfer, nonce: Date.now() });
    }
    if (toolId !== 'home' && getToolById(toolId)) {
      setRecents((prev) => {
        const next = [toolId, ...prev.filter((x) => x !== toolId)].slice(0, 8);
        try {
          localStorage.setItem(REC_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearTransfer = () => setTransfer(null);

  return (
    <WorkspaceContext.Provider
      value={{
        theme,
        toggleTheme,
        activeToolId,
        activeTool: activeToolId === 'home' ? undefined : getToolById(activeToolId),
        navigateToTool,
        favorites,
        toggleFavorite,
        recents,
        transfer,
        clearTransfer,
        commandOpen,
        setCommandOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
