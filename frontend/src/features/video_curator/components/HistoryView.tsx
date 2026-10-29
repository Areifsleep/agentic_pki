import { useState, useEffect } from 'react'
import {
  Search,
  Trash2,
  Play,
  FileText,
  X,
  Clock,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'

interface HistoryItem {
  id: string
  title: string
  channel: string
  views?: string
  watchedAgo: string
  duration: string
  matchBadge?: string
  thumbnail: string
  retention?: string
  flashcardBadge?: string
  extraBadge?: string
  resumeTime?: string
  notesCount?: number
  timeline: 'today' | 'yesterday' | 'last_week'
  category: string
  videoUrl?: string
  videoId?: string
}

export function HistoryView() {
  const {
    setVideoUrl,
    setActiveStage,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedTimeline, setSelectedTimeline] = useState<'all' | 'today' | 'yesterday' | 'last_week'>('all')

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('studytube_watch_history')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setHistoryItems(parsed)
          return
        }
      }
    } catch {
      // Ignore parse error
    }
    setHistoryItems([])
  }

  useEffect(() => {
    loadHistory()

    const handleHistoryUpdate = () => {
      loadHistory()
    }
    window.addEventListener('studytube_history_updated', handleHistoryUpdate)
    return () => window.removeEventListener('studytube_history_updated', handleHistoryUpdate)
  }, [])

  const handleClearHistory = () => {
    if (confirm('Yakin ingin menghapus seluruh riwayat video yang pernah ditonton?')) {
      localStorage.removeItem('studytube_watch_history')
      setHistoryItems([])
      window.dispatchEvent(new Event('studytube_history_updated'))
      toast.success('Seluruh riwayat video lokal berhasil dihapus.')
    }
  }

  const handleRemoveItem = (id: string) => {
    const next = historyItems.filter((i) => i.id !== id)
    setHistoryItems(next)
    localStorage.setItem('studytube_watch_history', JSON.stringify(next))
    window.dispatchEvent(new Event('studytube_history_updated'))
    toast.success('Video dihapus dari riwayat.')
  }

  const handleResume = (item: HistoryItem) => {
    const url = item.videoUrl || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : '')
    if (!url) return
    setVideoUrl(url)
    setActiveStage('curate')
    toast.info(`Melanjutkan video: "${item.title}"`)
  }

  const handleOpenStudySanctuary = (item: HistoryItem) => {
    const url = item.videoUrl || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : '')
    if (url) setVideoUrl(url)
    setActiveStage('vault')
    toast.info(`Membuka catatan vault untuk "${item.title}"`)
  }

  const filteredItems = historyItems.filter((item) => {
    if (selectedTimeline !== 'all' && item.timeline !== selectedTimeline) return false
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.channel.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    )
  })

  return (
    <div
      className={`flex-1 h-full min-h-0 overflow-y-auto flex flex-col select-none font-sans transition-colors pb-24 ${
        isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#f9f9fb] text-[#18181b]'
      }`}
    >
      {/* Top Header Banner */}
      <div
        className={`border-b px-8 py-5 sticky top-0 z-20 transition-colors ${
          isDark
            ? 'bg-[#141419]/95 backdrop-blur-md border-[#27272a]'
            : 'bg-white/95 backdrop-blur-md border-[#e4e4e7] shadow-xs'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDark
                  ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Learning History & Memory Trace
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                    isDark
                      ? 'bg-emerald-950/70 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {historyItems.length} Videos
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Local-first retention log. Videos studied, synthesized notes, and active recall records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                className={`w-4 h-4 absolute left-3 top-2.5 pointer-events-none ${
                  isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'
                }`}
              />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter history by topic or channel..."
                className={`pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#1c1c22] border border-[#27272a] text-white placeholder-zinc-500 focus:bg-[#22222a] focus:border-[#3f3f46]'
                    : 'bg-[#f9f9fb] border border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:bg-white focus:border-[#17171c]'
                }`}
              />
            </div>

            {historyItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border ${
                  isDark
                    ? 'border-rose-500/20 text-rose-400 hover:bg-rose-950/30'
                    : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
                title="Hapus riwayat lokal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-6">
        {/* Timeline Tabs */}
        <div className="flex items-center gap-2 border-b pb-3 border-zinc-200/20">
          {[
            { id: 'all', label: 'All History' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last_week', label: 'Earlier' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTimeline(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedTimeline === tab.id
                  ? isDark
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#17171c] text-white font-semibold'
                  : isDark
                    ? 'text-zinc-400 hover:text-white hover:bg-[#1f1f25]'
                    : 'text-zinc-600 hover:text-black hover:bg-[#f4f4f5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <Clock className="w-12 h-12 mx-auto text-zinc-400 opacity-60" />
            <h3 className="text-base font-bold">
              {searchFilter
                ? `Tidak ada riwayat tontonan yang cocok dengan "${searchFilter}"`
                : 'Belum Ada Riwayat Video'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Setiap video YouTube yang Anda pelajari, sintesis, atau tambahkan ke Obsidian Vault akan otomatis tercatat di sini secara lokal tanpa ketergantungan cloud.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveStage('home')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Jelajahi Video di Home Feed
              </button>
            </div>
          </div>
        )}

        {/* Real History Items List */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`border rounded-2xl p-4 flex flex-col md:flex-row gap-5 items-start justify-between transition-colors group ${
                isDark ? 'bg-[#17171c] border-[#27272a] hover:border-[#3f3f46]' : 'bg-white border-[#e4e4e7] hover:border-[#d4d4d8] shadow-xs'
              }`}
            >
              <div className="flex gap-4 flex-1">
                {/* Thumbnail */}
                <div
                  onClick={() => handleResume(item)}
                  className="relative w-44 aspect-video rounded-xl overflow-hidden bg-black/40 shrink-0 cursor-pointer group/thumb"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                    {item.duration}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {item.watchedAgo}
                    </span>
                  </div>

                  <h3
                    onClick={() => handleResume(item)}
                    className="text-sm font-bold line-clamp-2 hover:underline cursor-pointer"
                  >
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">{item.channel}</span>
                    {item.views && (
                      <>
                        <span>•</span>
                        <span>{item.views}</span>
                      </>
                    )}
                  </div>

                  {item.retention && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-500 font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{item.retention}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleResume(item)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Play className="w-3 h-3 fill-black" />
                  <span>Study Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenStudySanctuary(item)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                    isDark ? 'border-[#27272a] text-zinc-400 hover:text-white hover:bg-[#27272a]' : 'border-[#e4e4e7] text-zinc-600 hover:text-black hover:bg-[#f4f4f5]'
                  }`}
                  title="Open Sanctuary Notes"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                    isDark ? 'border-[#27272a] text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20' : 'border-[#e4e4e7] text-zinc-500 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title="Remove from history"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
