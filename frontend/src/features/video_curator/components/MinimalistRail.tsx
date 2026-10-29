import {
  Home,
  Sparkles,
  Layers,
  Target,
  BookOpen,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  HardDrive,
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import type { ActiveStage } from '../types'

interface MinimalistRailProps {
  backendOnline: boolean | null
}

export function MinimalistRail({ backendOnline }: MinimalistRailProps) {
  const {
    activeStage,
    setActiveStage,
    isSidebarExpanded,
    toggleSidebar,
    vaultPath,
  } = useVideoCuratorStore()
  const { isDark } = useTheme()

  const navItems: {
    id: ActiveStage
    label: string
    subLabel: string
    icon: typeof Home
    badge?: string
  }[] = [
    {
      id: 'home',
      label: 'Home Feed',
      subLabel: 'Curated Radar',
      icon: Home,
    },
    {
      id: 'curate',
      label: 'Command Deck',
      subLabel: 'Synthesis Workspace',
      icon: Sparkles,
      badge: 'Active AI',
    },
    {
      id: 'vault',
      label: 'My Vault',
      subLabel: 'Obsidian Notes',
      icon: Layers,
    },
    {
      id: 'focus',
      label: 'Focus Studio',
      subLabel: 'Directive Grounding',
      icon: Target,
    },
    {
      id: 'library',
      label: 'Library',
      subLabel: 'Timestamps & Sheets',
      icon: BookOpen,
    },
    {
      id: 'history',
      label: 'History',
      subLabel: 'Cognitive Retention',
      icon: History,
    },
    {
      id: 'settings',
      label: 'Settings',
      subLabel: 'AI & Engine Config',
      icon: Settings,
    },
  ]

  const isItemActive = (id: ActiveStage) => {
    if (id === 'home') {
      return activeStage === 'home' || activeStage === 'radar'
    }
    return activeStage === id
  }

  return (
    <aside
      className={`shrink-0 border-r flex flex-col justify-between py-3 select-none z-20 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? 'w-64 px-3' : 'w-18 px-2'
      } ${
        isDark
          ? 'bg-[#0d0d11] border-[#27272a]'
          : 'bg-[#ffffff] border-[#e4e4e7]'
      }`}
    >
      {/* Top Section / Header when expanded */}
      <div className="flex flex-col gap-3 w-full">
        {isSidebarExpanded && (
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Workspace Navigator
            </span>
            <button
              type="button"
              onClick={() => toggleSidebar(false)}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-[#1f1f23]'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-[#f4f4f5]'
              }`}
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.id)

            if (!isSidebarExpanded) {
              // Collapsed Mini Rail Item (~72px width)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveStage(item.id)}
                  className={`w-full py-2.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group relative ${
                    active
                      ? isDark
                        ? 'bg-[#1f1f23] text-white shadow-xs'
                        : 'bg-[#f4f4f5] text-[#18181b] shadow-xs'
                      : isDark
                        ? 'text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181b]'
                        : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                  }`}
                  title={`${item.label} — ${item.subLabel}`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-4.5 h-4.5 transition-transform group-hover:scale-110 ${
                        active
                          ? isDark
                            ? 'text-white'
                            : 'text-[#18181b]'
                          : 'text-[#71717a]'
                      }`}
                    />
                    {item.id === 'curate' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-tight text-center leading-none truncate max-w-full ${
                      active
                        ? isDark
                          ? 'text-white font-semibold'
                          : 'text-[#18181b] font-semibold'
                        : 'text-[#71717a]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              )
            }

            // Expanded Full Sidebar Item (~256px width)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveStage(item.id)}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left ${
                  active
                    ? isDark
                      ? 'bg-[#1f1f23] text-white shadow-xs font-semibold'
                      : 'bg-[#f4f4f5] text-[#18181b] shadow-xs font-semibold'
                    : isDark
                      ? 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
                      : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      active
                        ? isDark
                          ? 'bg-[#27272a] text-white'
                          : 'bg-white text-[#18181b] shadow-xs'
                        : isDark
                          ? 'bg-[#141419] text-[#71717a] group-hover:text-white'
                          : 'bg-[#f4f4f5] text-[#71717a] group-hover:text-[#18181b]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs leading-snug truncate">{item.label}</div>
                    <div
                      className={`text-[10px] font-normal leading-tight truncate ${
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      }`}
                    >
                      {item.subLabel}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 uppercase font-semibold ${
                      active
                        ? 'bg-emerald-500 text-black'
                        : isDark
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-2 w-full pt-3 border-t border-inherit">
        {isSidebarExpanded ? (
          <div className="space-y-2 px-1">
            {/* Vault link info */}
            <div
              className={`p-2 rounded-xl border flex items-center gap-2 text-[11px] ${
                isDark
                  ? 'bg-[#141419] border-[#27272a] text-zinc-400'
                  : 'bg-[#f9f9fb] border-[#e4e4e7] text-zinc-600'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <div className="truncate">
                <div className="text-[10px] font-semibold uppercase tracking-wider">Vault Linked</div>
                <div className="font-mono text-[10px] truncate text-zinc-400">
                  {vaultPath || 'Default Vault'}
                </div>
              </div>
            </div>

            {/* Engine Status & Collapse Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendOnline
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                      : 'bg-rose-500'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  }`}
                >
                  {backendOnline ? 'Engine Online' : 'Engine Offline'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleSidebar(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'hover:bg-[#1f1f23] text-zinc-400 hover:text-white'
                    : 'hover:bg-[#f4f4f5] text-zinc-600 hover:text-zinc-900'
                }`}
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSidebar(true)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-[#1f1f23]'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-[#f4f4f5]'
              }`}
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                backendOnline
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-rose-500'
              }`}
              title={backendOnline ? 'StudyTube Engine Online' : 'StudyTube Engine Offline'}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
