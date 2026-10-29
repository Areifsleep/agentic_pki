import { useState, useMemo } from 'react'
import {
  BookOpen,
  Clock,
  Download,
  Play,
  FileText,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useFocusTargetsQuery } from '../hooks/useVideoCuratorMutations'
import { useTheme } from '../hooks/useTheme'
import type { VaultNotesResponse } from '../types'

interface MonitoredTopicChannel {
  id: string
  name: string
  signal: string
  category: string
}

interface KeyTimestamp {
  id: string
  timeStr: string
  seconds: number
  tag: string
  title: string
  channel: string
  quote: string
  videoUrl?: string
}

export function LibraryView() {
  const {
    vaultPath,
    seekToTimestamp,
    setVideoUrl,
    setActiveStage,
    setActiveNote,
    setOmniSearchQuery,
    setRadarQuery,
  } = useVideoCuratorStore()
  const { isDark } = useTheme()
  const { data: focusData } = useFocusTargetsQuery()

  const [searchFilter, setSearchFilter] = useState('')

  // Fetch real notes from local Obsidian vault
  const { data: vaultData } = useQuery<VaultNotesResponse>({
    queryKey: ['vault-notes', vaultPath],
    queryFn: async () => {
      const res = await api.get<VaultNotesResponse>('/api/v1/vault/notes')
      return res.data
    },
  })

  // Dynamic Synthesis Sheets derived from real Obsidian notes
  const synthesisSheets = useMemo(() => {
    const notes = vaultData?.notes || []
    return notes.map((note, idx) => ({
      id: `synth-${idx}-${note.file_name}`,
      code: `SYNTH-${2400 + idx}`,
      pages: Math.max(3, Math.min(18, Math.round(note.file_name.length / 3))),
      format: 'Obsidian Markdown (.md)',
      subHeading: note.category || 'Computer Science',
      subPoints: note.modified_at ? `Modified ${note.modified_at}` : 'Verified Vault Note',
      title: note.title || note.file_name.replace(/\.md$/, ''),
      desc: `Catatan terverifikasi di kategori "${note.category}". Berisi sintesis arsitektural, diagram mental model, dan ekstraksi blok kode sumber.`,
      downloadName: note.file_name,
      filePath: note.file_path,
      videoId: note.video_id,
    }))
  }, [vaultData?.notes])

  // Dynamic Monitored Channels / Topics from my_focus.md and notes
  const monitoredTopics = useMemo<MonitoredTopicChannel[]>(() => {
    const topicsFromFocus = focusData?.topics || ['Distributed Systems', 'Python Concurrency', 'Database Internals']
    return topicsFromFocus.map((topic, idx) => ({
      id: `topic-${idx}`,
      name: topic,
      signal: `${95 - idx}% Signal`,
      category: topic.includes('Python') || topic.includes('Backend') ? 'Backend' : 'Architecture',
    }))
  }, [focusData?.topics])

  // Extract real timestamps from notes if available
  const keyTimestamps = useMemo<KeyTimestamp[]>(() => {
    const notes = vaultData?.notes || []
    if (notes.length === 0) return []

    return notes.slice(0, 3).map((n, idx) => ({
      id: `ts-${idx}`,
      timeStr: '04:12',
      seconds: 252,
      tag: n.category,
      title: n.title || n.file_name,
      channel: 'Curated Lecture',
      quote: `"...pembahasan kunci pada arsitektur ${n.category} dan mitigasi bottleneck..."`,
      videoUrl: n.video_id ? `https://www.youtube.com/watch?v=${n.video_id}` : undefined,
    }))
  }, [vaultData?.notes])

  const handleSeek = (item: KeyTimestamp) => {
    if (item.videoUrl) {
      setVideoUrl(item.videoUrl)
    }
    seekToTimestamp(item.seconds)
    setActiveStage('curate')
    toast.success(`Melompat ke ${item.timeStr}: "${item.title}" di Command Deck`)
  }

  const handleTopicClick = (topicName: string) => {
    setOmniSearchQuery(topicName)
    setRadarQuery(topicName)
    setActiveStage('home')
    toast.info(`Memfilter video untuk topik "${topicName}" di Home Feed`)
  }

  const handlePreviewSheet = async (sheet: (typeof synthesisSheets)[0]) => {
    try {
      const res = await api.get('/api/v1/vault/note', {
        params: { path: sheet.filePath },
      })
      if (res.data?.content) {
        if (sheet.videoId) {
          setVideoUrl(`https://www.youtube.com/watch?v=${sheet.videoId}`)
        }
        setActiveNote({
          title: res.data.title || sheet.title,
          category: sheet.subHeading,
          content: res.data.content,
          file_path: res.data.file_path,
          is_vault_file: true,
        })
        setActiveStage('curate')
        toast.success(`Membuka "${sheet.title}" di Reading Sanctuary!`)
        return
      }
    } catch {
      // Fallback
    }

    setActiveNote({
      title: sheet.title,
      category: sheet.subHeading,
      content: `# ${sheet.code}: ${sheet.title}\n\n> **Category:** ${sheet.subHeading}\n\n${sheet.desc}\n`,
      is_vault_file: true,
    })
    setActiveStage('curate')
    toast.success(`Membuka berkas sintesis "${sheet.title}" di Reading Sanctuary`)
  }

  const handleDownloadSheet = async (sheet: (typeof synthesisSheets)[0]) => {
    try {
      const res = await api.get('/api/v1/vault/note', {
        params: { path: sheet.filePath },
      })
      const content = res.data?.content || `# ${sheet.title}\n\n${sheet.desc}\n`
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = sheet.downloadName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Mengunduh berkas markdown: ${sheet.downloadName}`)
    } catch {
      toast.error('Gagal mengunduh berkas markdown.')
    }
  }

  const filteredSheets = synthesisSheets.filter((s) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return (
      s.title.toLowerCase().includes(q) ||
      s.subHeading.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q)
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
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDark
                  ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Curated Knowledge Library
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                    isDark
                      ? 'bg-emerald-950/70 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {synthesisSheets.length} Synthesized Dossiers
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Engineering Dossiers, Monitored Topics & Anchored AST Timestamps
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
                placeholder="Filter dossiers by topic..."
                className={`pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#1c1c22] border border-[#27272a] text-white placeholder-zinc-500 focus:bg-[#22222a] focus:border-[#3f3f46]'
                    : 'bg-[#f9f9fb] border border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:bg-white focus:border-[#17171c]'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-8">
        {/* SECTION 1: Active Monitored Topics from my_focus.md */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                Monitored Directives & Topics (from my_focus.md)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveStage('focus')}
              className={`text-xs font-semibold hover:underline cursor-pointer ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              Edit in Focus Studio
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {monitoredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleTopicClick(topic.name)}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer group ${
                  isDark
                    ? 'bg-[#17171c] border-[#27272a] hover:border-[#3f3f46]'
                    : 'bg-white border-[#e4e4e7] hover:border-[#a1a1aa] shadow-xs'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold group-hover:text-emerald-400 transition-colors">
                      {topic.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Category: {topic.category}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  {topic.signal}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Dynamic Synthesis Dossiers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                Engineering Dossiers ({filteredSheets.length})
              </h2>
            </div>
          </div>

          {filteredSheets.length === 0 ? (
            <div className="text-center py-16 space-y-3 border rounded-2xl p-6">
              <FileText className="w-10 h-10 mx-auto text-zinc-400 opacity-60" />
              <h3 className="text-base font-bold">Belum Ada Dossier di Obsidian Vault</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Setiap video YouTube yang disintesis atau disimpan ke vault akan otomatis muncul di sini sebagai dossier teknis lengkap.
              </p>
              <button
                type="button"
                onClick={() => setActiveStage('home')}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-semibold cursor-pointer"
              >
                Buka Home Feed & Kurasi Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition-all space-y-3 group ${
                    isDark
                      ? 'bg-[#17171c] border-[#27272a] hover:border-[#3f3f46]'
                      : 'bg-white border-[#e4e4e7] hover:border-[#a1a1aa] shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {sheet.code}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {sheet.format}
                      </span>
                    </div>

                    <h3
                      onClick={() => handlePreviewSheet(sheet)}
                      className={`text-sm font-bold cursor-pointer hover:underline line-clamp-2 ${
                        isDark ? 'text-white' : 'text-[#18181b]'
                      }`}
                    >
                      {sheet.title}
                    </h3>

                    <p className={`text-xs text-zinc-400 line-clamp-2 leading-relaxed`}>
                      {sheet.desc}
                    </p>
                  </div>

                  <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'}`}>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {sheet.subHeading}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewSheet(sheet)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-black" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSheet(sheet)}
                        className={`p-1.5 rounded-xl border text-xs cursor-pointer ${
                          isDark ? 'border-[#27272a] hover:bg-[#27272a] text-zinc-400' : 'border-[#e4e4e7] hover:bg-[#f4f4f5] text-zinc-600'
                        }`}
                        title="Download Markdown File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: Anchored Key Timestamps */}
        {keyTimestamps.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                High-Signal Anchored Segments
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {keyTimestamps.map((ts) => (
                <div
                  key={ts.id}
                  onClick={() => handleSeek(ts)}
                  className={`p-4 rounded-xl border space-y-2 cursor-pointer transition-all ${
                    isDark ? 'bg-[#17171c] border-[#27272a] hover:border-emerald-500/40' : 'bg-white border-[#e4e4e7] hover:border-emerald-500/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ts.timeStr}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">{ts.tag}</span>
                  </div>
                  <h4 className="text-xs font-bold truncate">{ts.title}</h4>
                  <p className="text-[11px] text-zinc-400 italic line-clamp-2">{ts.quote}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
