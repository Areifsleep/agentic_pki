import {
  Sparkles,
  Library,
  Target,
  Radar,
  CheckCircle2,
  XCircle,
  FolderCog,
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'

interface MinimalistRailProps {
  backendOnline: boolean | null
}

export function MinimalistRail({ backendOnline }: MinimalistRailProps) {
  const {
    activeStage,
    setActiveStage,
    resetForNewCurate,
    vaultPath,
    setIsVaultSettingsOpen,
  } = useVideoCuratorStore()

  return (
    <aside className="w-14 shrink-0 border-r border-[#e4e4e7] bg-[#ffffff] flex flex-col items-center justify-between py-4 select-none z-30">
      {/* Top Brand Dot */}
      <div className="flex flex-col items-center gap-5">
        <button
          onClick={() => {
            setActiveStage('curate')
            resetForNewCurate()
          }}
          className="w-9 h-9 rounded-full bg-[#17171c] text-white flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          title="Second Brain Curator (Reset & Kurasi Baru)"
        >
          <span className="font-mono text-xs font-semibold tracking-tighter">
            AK
          </span>
        </button>

        {/* 4 Dynamic Stage Navigation Icons */}
        <nav className="flex flex-col items-center gap-2">
          {/* Tab 1: Kurasi Aktif */}
          <button
            onClick={() => setActiveStage('curate')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
              activeStage === 'curate'
                ? 'bg-[#17171c] text-white'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Kurasi Video Aktif (The Focused Stage)"
          >
            <Sparkles className="w-4 h-4" />
            <span className="sr-only">Kurasi Aktif</span>
            <div className="absolute left-14 px-2.5 py-1 bg-[#17171c] text-white text-[11px] font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
              Kurasi Aktif
            </div>
          </button>

          {/* Tab 2: Autonomous Learning Radar */}
          <button
            onClick={() => setActiveStage('radar')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
              activeStage === 'radar'
                ? 'bg-[#17171c] text-white'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Autonomous Learning Radar (Discovery)"
          >
            <Radar className="w-4 h-4" />
            <span className="sr-only">Learning Radar</span>
            <div className="absolute left-14 px-2.5 py-1 bg-[#17171c] text-white text-[11px] font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
              Learning Radar
            </div>
          </button>

          {/* Tab 3: Focus Studio */}
          <button
            onClick={() => setActiveStage('focus')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
              activeStage === 'focus'
                ? 'bg-[#17171c] text-white'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Focus Studio (Target Belajar my_focus.md)"
          >
            <Target className="w-4 h-4" />
            <span className="sr-only">Focus Studio</span>
            <div className="absolute left-14 px-2.5 py-1 bg-[#17171c] text-white text-[11px] font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
              Focus Studio
            </div>
          </button>

          {/* Tab 4: Riwayat Vault & Chat */}
          <button
            onClick={() => setActiveStage('vault')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
              activeStage === 'vault'
                ? 'bg-[#17171c] text-white'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Riwayat Vault & Chat Multi-Catatan"
          >
            <Library className="w-4 h-4" />
            <span className="sr-only">Riwayat & Chat Vault</span>
            <div className="absolute left-14 px-2.5 py-1 bg-[#17171c] text-white text-[11px] font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
              Riwayat & Chat Vault
            </div>
          </button>
        </nav>
      </div>

      {/* Bottom Status & Vault Indicators */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setIsVaultSettingsOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors cursor-pointer group relative"
          title="Pengaturan Lokasi Obsidian Vault"
        >
          <FolderCog className="w-4 h-4 text-[#52525b] group-hover:text-[#18181b]" />
          <div className="absolute left-14 bottom-2 px-2.5 py-1 bg-[#17171c] text-white text-[11px] font-mono rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
            {vaultPath ? `Vault: ${vaultPath}` : 'Atur Obsidian Vault'}
          </div>
        </button>

        <div
          className="group relative flex items-center justify-center w-8 h-8 cursor-help"
          title={backendOnline ? 'Backend Aktif' : 'Backend Terputus'}
        >
          {backendOnline === null ? (
            <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
          ) : backendOnline ? (
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-500/30 animate-ping" />
            </div>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          )}

          <div className="absolute left-14 bottom-0 px-2.5 py-1 bg-[#17171c] text-white text-[11px] font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50 flex items-center gap-1.5">
            {backendOnline ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Backend Online</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-rose-400" />
                <span>Backend Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
