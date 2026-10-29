import React, { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Search,
  Plus,
  Bell,
  Play,
  Command,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Settings as SettingsIcon,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
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

  const handleSidebarClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar()
    } else {
      toggleSidebar()
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = localSearch.trim()
    if (!trimmed) return

    // 1. Detect direct YouTube URL or raw 11-char ID
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const rawIdRegex = /^[a-zA-Z0-9_-]{11}$/
    const ytMatch = trimmed.match(ytRegex)
    const rawMatch = trimmed.match(rawIdRegex)

    if (ytMatch || rawMatch) {
      const vid = ytMatch ? ytMatch[1] : trimmed
      const fullUrl = `https://www.youtube.com/watch?v=${vid}`
      setVideoUrl(fullUrl)
      setActiveStage('curate')
      synthesizeMutation.mutate({
        video_url: fullUrl,
        config,
      })
      toast.info(`Membuka dan menyintesis materi video YouTube: ${vid}`)
      return
    }

    // 2. Execute live YouTube discovery search
    setOmniSearchQuery(trimmed)
    setRadarQuery(trimmed)
    discoverRadarMutation.mutate({ query: trimmed })
    if (activeStage !== 'home' && activeStage !== 'radar') {
      setActiveStage('home')
    }
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    setOmniSearchQuery('')
  }

  return (
    <header
      className={`h-14 border-b px-4 flex items-center justify-between select-none z-30 transition-colors shrink-0 ${
        isDark
          ? 'bg-[#0d0d11] border-[#27272a] text-[#f4f4f5]'
          : 'bg-[#ffffff] border-[#e4e4e7] text-[#18181b]'
      }`}
    >
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3">
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

      {/* Center: Omni Search Bar (Supports any YouTube query or URL) */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center max-w-md lg:max-w-xl w-full mx-4"
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
      <div className="flex items-center gap-2 relative">
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
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[11px]">Autonomous Radar Ready</p>
                    <p className="text-[10px] text-zinc-400">
                      Grounded on your my_focus.md active directives.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile / Settings Trigger Avatar */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-white text-[11px] font-bold cursor-pointer ring-1 ring-zinc-300 dark:ring-zinc-700 hover:opacity-90 transition-opacity"
            title="User Profile & Quick Options"
          >
            PK
          </button>

          {isProfileOpen && (
            <div
              className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border p-2 space-y-1 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150 ${
                isDark
                  ? 'bg-[#181820] border-[#27272a] text-[#f4f4f5]'
                  : 'bg-white border-[#e4e4e7] text-[#18181b]'
              }`}
            >
              <div className="px-3 py-2 border-b border-zinc-200/20">
                <p className="font-bold text-xs">PKI Curator</p>
                <p className="text-[10px] text-zinc-400">Local-First PKM Learner</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveStage('settings')
                  setIsProfileOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-[#27272a]' : 'hover:bg-[#f4f4f5]'
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Engine Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVaultSettingsOpen(true)
                  setIsProfileOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-[#27272a]' : 'hover:bg-[#f4f4f5]'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>Configure Obsidian Path</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
