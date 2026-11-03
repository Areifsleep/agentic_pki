import { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Play,
  Search,
  Plus,
  Moon,
  Sun,
  Bell,
  CheckCircle2,
  ExternalLink,
  Command,
  X,
  Loader2,
  Sparkles,
  Layers,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import {
  useDiscoverRadarMutation,
  useSynthesizeVideoMutation,
} from '../hooks/useVideoCuratorMutations'

interface TopHeaderProps {
  backendOnline: boolean | null
  onToggleSidebar?: () => void
}

export function TopHeader({ backendOnline, onToggleSidebar }: TopHeaderProps) {
  const {
    activeStage,
    setActiveStage,
    omniSearchQuery,
    setOmniSearchQuery,
    setRadarQuery,
    setIsAddUrlOpen,
    toggleSidebar,
    setIsVaultSettingsOpen,
    setVideoUrl,
    config,
  } = useVideoCuratorStore()

  const { isDark, toggleTheme } = useTheme()
  const [localSearch, setLocalSearch] = useState(omniSearchQuery)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const discoverRadarMutation = useDiscoverRadarMutation()
  const synthesizeMutation = useSynthesizeVideoMutation()

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Keep local search input synced with store
  useEffect(() => {
    setLocalSearch(omniSearchQuery)
  }, [omniSearchQuery])

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder^="Search any YouTube"]'
        )
        searchInput?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSidebarClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar()
    } else {
      toggleSidebar()
    }
  }

  // Dual-purpose search submission:
  // 1. If it looks like a YouTube URL or Video ID -> synthesize directly in Command Deck
  // 2. Otherwise -> search YouTube via Radar
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = localSearch.trim()
    if (!query) return

    setOmniSearchQuery(query)

    const isYouTubeUrl =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(query)
    const isRawVideoId = /^[a-zA-Z0-9_-]{11}$/.test(query)

    if (isYouTubeUrl || isRawVideoId) {
      const fullUrl = isYouTubeUrl
        ? query
        : `https://www.youtube.com/watch?v=${query}`
      setVideoUrl(fullUrl)
      setActiveStage('curate')
      synthesizeMutation.mutate({
        video_url: fullUrl,
        config,
      })
    } else {
      // General YouTube Topic Radar Query
      setRadarQuery(query)
      setActiveStage('home')
      discoverRadarMutation.mutate({ query })
    }
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    setOmniSearchQuery('')
  }

  return (
    <header
      className={`h-14 border-b px-4 flex items-center justify-between select-none z-30 transition-colors shrink-0 gap-4 ${
        isDark
          ? 'bg-[#0d0d11] border-[#27272a] text-[#f4f4f5]'
          : 'bg-[#ffffff] border-[#e4e4e7] text-[#18181b]'
      }`}
    >
      {/* Left: Hamburger, Brand, Command Deck & Agent Synced */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={handleSidebarClick}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-white'
              : 'hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b]'
          }`}
          title="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand: StudyTube */}
        <div
          onClick={() => setActiveStage('home')}
          className="flex items-center gap-2 cursor-pointer group"
          title="Back to Home Feed"
        >
          <div className="w-6 h-4.5 bg-[#ff0000] rounded-sm flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Play className="w-2.5 h-2.5 fill-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight font-sans">
            StudyTube
          </span>
        </div>

        {/* Command Deck Quick Nav Chip */}
        <button
          type="button"
          onClick={() => setActiveStage('curate')}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            activeStage === 'curate'
              ? isDark
                ? 'bg-[#27272a] border-emerald-500/50 text-emerald-400 font-semibold'
                : 'bg-[#f4f4f5] border-emerald-500/50 text-emerald-700 font-semibold'
              : isDark
                ? 'bg-[#141419] border-[#27272a] text-zinc-400 hover:text-white hover:border-[#3f3f46]'
                : 'bg-white border-[#e4e4e7] text-zinc-600 hover:text-zinc-900 hover:border-[#d4d4d8]'
          }`}
          title="Open Video Synthesis Command Deck & Sanctuary"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Command Deck</span>
        </button>

        {/* Agent Synced Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            backendOnline
              ? isDark
                ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                : 'bg-[#edfce9] border-[#c6f6d5] text-[#003c33]'
              : isDark
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span>{backendOnline ? 'Agent Synced' : 'Agent Offline'}</span>
        </div>
      </div>

      {/* Center: Omni Search Bar (Fills available empty space) */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center flex-1 min-w-0"
      >
        <div className="relative w-full flex items-center">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search any YouTube video, topic, or paste URL to synthesize..."
            className={`w-full pl-4 pr-16 py-1.5 rounded-full text-xs font-normal transition-all outline-none border ${
              isDark
                ? 'bg-[#17171c] border-[#2e2e36] text-[#f4f4f5] placeholder-[#71717a] focus:border-[#52525b]'
                : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#17171c] focus:bg-white'
            }`}
          />
          {localSearch ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className={`absolute right-10 p-1 rounded-full cursor-pointer transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'
              }`}
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-10 flex items-center pointer-events-none">
              <kbd
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border flex items-center gap-0.5 ${
                  isDark
                    ? 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa]'
                    : 'bg-[#e4e4e7] border-[#d4d4d8] text-[#71717a]'
                }`}
              >
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
          )}
          <button
            type="submit"
            className={`absolute right-1.5 p-1 rounded-full cursor-pointer transition-colors ${
              isDark
                ? 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#e4e4e7]'
            }`}
            title="Search YouTube"
          >
            {discoverRadarMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </form>

      {/* Right: + Add URL CTA, Quick Theme Toggle, Notifications, Profile Avatar */}
      <div className="flex items-center gap-2 relative shrink-0">
        <button
          type="button"
          onClick={() => setIsAddUrlOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-xs ${
            isDark
              ? 'bg-white hover:bg-zinc-200 text-[#0d0d11]'
              : 'bg-[#17171c] hover:bg-black text-white'
          }`}
          title="Add New YouTube URL to Curate"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add URL</span>
        </button>

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isDark
              ? 'text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23]'
              : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-2 rounded-full transition-colors cursor-pointer relative ${
              isDark
                ? 'text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23]'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-[#0d0d11]" />
          </button>

          {isNotificationsOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                isDark
                  ? 'bg-[#181820] border-[#27272a] text-[#f4f4f5]'
                  : 'bg-white border-[#e4e4e7] text-[#18181b]'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/20">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-xs">Curator Activity</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Live</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[11px]">Obsidian Vault Linked</p>
                    <p className="text-[10px] text-zinc-400">
                      Auto-linking and markdown writer active.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[11px]">Agentic Radar Online</p>
                    <p className="text-[10px] text-zinc-400">
                      YouTube wide scraping & micro-triage enabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Popover */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-semibold hover:border-emerald-500 transition-colors cursor-pointer"
            title="User Profile & Quick Settings"
          >
            PK
          </button>

          {isProfileOpen && (
            <div
              className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-xl border p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 ${
                isDark
                  ? 'bg-[#181820] border-[#27272a] text-[#f4f4f5]'
                  : 'bg-white border-[#e4e4e7] text-[#18181b]'
              }`}
            >
              <div className="p-2 border-b border-zinc-200/20">
                <p className="font-bold text-xs">PKI Interactive Scholar</p>
                <p className="text-[10px] text-zinc-400">Level 2 Tool-Using Agent Companion</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false)
                  setActiveStage('vault')
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#27272a]' : 'hover:bg-[#f4f4f5]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>My Vault Notes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false)
                  setIsVaultSettingsOpen(true)
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#27272a]' : 'hover:bg-[#f4f4f5]'
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Obsidian Vault Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false)
                  setActiveStage('focus')
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#27272a]' : 'hover:bg-[#f4f4f5]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Edit my_focus.md</span>
              </button>

              <div className="border-t border-zinc-200/20 pt-1">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-[#27272a] text-zinc-400' : 'hover:bg-[#f4f4f5] text-zinc-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Documentation & SRS</span>
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
