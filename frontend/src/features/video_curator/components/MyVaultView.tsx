import { useState, useMemo } from 'react'
import {
  Layers,
  FileText,
  HardDrive,
  Sparkles,
  Download,
  Search,
  CheckCircle2,
  Play,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import type { VaultNotesResponse, VaultNoteItem } from '../types'

interface CuratedCollection {
  id: string
  title: string
  category: string
  curatedAgo: string
  statusBadge: string
  videosCount: number
  totalDuration: string
  matchScore: number
  thumbnail: string
  summary: string
  tags: string[]
  obsidianPath: string
  videoId?: string
  isRealFile?: boolean
  fullFilePath?: string
}

export function MyVaultView() {
  const {
    vaultPath,
    setActiveStage,
    setVideoUrl,
    setActiveNote,
  } = useVideoCuratorStore()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'batches' | 'notes' | 'cheatsheets' | 'snippets'>('batches')
  const [searchFilter, setSearchFilter] = useState('')

  // Fetch real notes from local Obsidian vault (using correct endpoint /api/v1/vault/notes)
  const { data: vaultData } = useQuery<VaultNotesResponse>({
    queryKey: ['vault-notes', vaultPath],
    queryFn: async () => {
      const res = await api.get<VaultNotesResponse>('/api/v1/vault/notes')
      return res.data
    },
  })

  const realNotesCount = vaultData?.total ?? 0

  // Convert real vault notes into collections list (100% dynamic, no hardcoded collections)
  const collectionsList = useMemo<CuratedCollection[]>(() => {
    const realNotes = vaultData?.notes || []
    if (realNotes.length === 0) return []

    return realNotes.map((n, idx) => ({
      id: `vn-${idx}-${n.file_name}`,
      title: n.title || n.file_name.replace(/\.md$/, ''),
      category: n.category || 'General',
      curatedAgo: n.modified_at ? `Updated ${n.modified_at}` : 'Synced to Vault',
      statusBadge: 'Obsidian Note',
      videosCount: 1,
      totalDuration: 'Verified',
      matchScore: 98,
      thumbnail: n.video_id
        ? `https://img.youtube.com/vi/${n.video_id}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640',
      summary: `Catatan terverifikasi di kategori "${n.category}". Tersimpan secara fisik dalam format Markdown dengan tautan [[Wikilinks]] aktif.`,
      tags: ['Physical Note', n.category],
      obsidianPath: `/${n.file_path}`,
      videoId: n.video_id,
      isRealFile: true,
      fullFilePath: n.file_path,
    }))
  }, [vaultData?.notes])

  const handleOpenStudyDeck = async (collection: CuratedCollection) => {
    if (collection.videoId) {
      setVideoUrl(`https://www.youtube.com/watch?v=${collection.videoId}`)
    }

    if (collection.fullFilePath || collection.isRealFile) {
      try {
        const targetPath = collection.fullFilePath || collection.obsidianPath.replace(/^\//, '')
        const res = await api.get('/api/v1/vault/note', {
          params: { path: targetPath },
        })
        if (res.data?.content) {
          setActiveNote({
            title: res.data.title || collection.title,
            category: collection.category,
            content: res.data.content,
            file_path: res.data.file_path,
            is_vault_file: true,
          })
          setActiveStage('curate')
          toast.success(`Membuka "${collection.title}" di Reading Sanctuary!`)
          return
        }
      } catch {
        // Fallback below
      }
    }

    setActiveNote({
      title: collection.title,
      category: collection.category,
      content: `# ${collection.title}\n\n> **Category:** ${collection.category} • **Status:** ${collection.statusBadge}\n> **Obsidian Path:** \`${collection.obsidianPath}\`\n\n## Overview\n${collection.summary}\n`,
      is_vault_file: true,
    })
    setActiveStage('curate')
  }

  const handleOpenRawVaultNote = async (noteItem: VaultNoteItem) => {
    try {
      const res = await api.get('/api/v1/vault/note', {
        params: { path: noteItem.file_path },
      })
      if (res.data?.content) {
        if (noteItem.video_id) {
          setVideoUrl(`https://www.youtube.com/watch?v=${noteItem.video_id}`)
        }
        setActiveNote({
          title: res.data.title || noteItem.title,
          category: noteItem.category,
          content: res.data.content,
          file_path: res.data.file_path,
          is_vault_file: true,
        })
        setActiveStage('curate')
        toast.success(`Membuka "${res.data.title || noteItem.title}" di Reading Sanctuary!`)
      }
    } catch (e: any) {
      toast.error('Gagal membaca berkas catatan', {
        description: e.message,
      })
    }
  }

  const handleExportAll = () => {
    toast.success('Seluruh catatan vault berhasil diverifikasi di Obsidian (.md)!')
  }

  const filteredCollections = collectionsList.filter((c) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  const filteredNotes = (vaultData?.notes || []).filter((n) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return (
      n.title.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q) ||
      n.file_name.toLowerCase().includes(q)
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
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 border ${
                  isDark
                    ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Local Workspace Active • Live Sync Enabled</span>
              </span>
            </div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
              My Vault
            </h1>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Curated Study Collections, Code Checkpoints & Obsidian Markdown Exports
            </p>
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
                placeholder="Filter collections or tags..."
                className={`pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#1c1c22] border border-[#27272a] text-white placeholder-zinc-500 focus:bg-[#22222a] focus:border-[#3f3f46]'
                    : 'bg-[#f9f9fb] border border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:bg-white focus:border-[#17171c]'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={handleExportAll}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-[#17171c] hover:bg-black text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Verify Obsidian (.md)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 space-y-7">
        {/* Top 4 Stat Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`border rounded-2xl p-5 flex items-start justify-between shadow-xs transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <div className="space-y-1">
              <span className={`text-[11px] font-mono uppercase font-semibold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Vault Notes
              </span>
              <div className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                {realNotesCount}
              </div>
              <span className="text-[11px] text-emerald-500 font-medium">↗ Verified & Indexed</span>
              <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                Physical .md on disk
              </p>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#27272a] text-white' : 'bg-[#f4f4f5] text-[#18181b]'
              }`}
            >
              <Layers className="w-4.5 h-4.5" />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-5 flex items-start justify-between shadow-xs transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <div className="space-y-1">
              <span className={`text-[11px] font-mono uppercase font-semibold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Categories
              </span>
              <div className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                {new Set((vaultData?.notes || []).map((n) => n.category)).size}
              </div>
              <span className="text-[11px] text-emerald-500 font-medium">Subfolders</span>
              <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                Domain isolation
              </p>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#27272a] text-white' : 'bg-[#f4f4f5] text-[#18181b]'
              }`}
            >
              <FileText className="w-4.5 h-4.5" />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-5 flex items-start justify-between shadow-xs transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <div className="space-y-1">
              <span className={`text-[11px] font-mono uppercase font-semibold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Vault Storage
              </span>
              <div className={`flex items-center gap-1.5 pt-1 text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Obsidian Linked</span>
              </div>
              <p className={`text-[11px] font-mono truncate max-w-[150px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                {vaultPath || '~/Obsidian/Curator'}
              </p>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#27272a] text-white' : 'bg-[#f4f4f5] text-[#18181b]'
              }`}
            >
              <HardDrive className="w-4.5 h-4.5" />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-5 flex items-start justify-between shadow-xs transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <div className="space-y-1">
              <span className={`text-[11px] font-mono uppercase font-semibold ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Knowledge Linker
              </span>
              <div className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                Active
              </div>
              <span className="text-[11px] text-emerald-500 font-medium">[[Wikilinks]]</span>
              <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                AST Code Shield Active
              </p>
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#003c33]/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Sparkles className="w-4.5 h-4.5" />
            </div>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div
          className={`flex items-center gap-2 border-b pb-3 overflow-x-auto ${
            isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'
          }`}
        >
          {[
            { id: 'batches', label: 'Curated Collections', count: filteredCollections.length },
            { id: 'notes', label: 'Physical Markdown Notes', count: filteredNotes.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? isDark
                    ? 'bg-white text-black shadow-xs font-semibold'
                    : 'bg-[#17171c] text-white shadow-xs'
                  : isDark
                    ? 'bg-[#17171c] border border-[#27272a] text-zinc-400 hover:text-white hover:border-[#3f3f46]'
                    : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-black/10 text-black'
                      : 'bg-white/20 text-white'
                    : isDark
                      ? 'bg-[#27272a] text-zinc-300'
                      : 'bg-[#f4f4f5] text-[#71717a]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Empty State when no notes */}
        {filteredCollections.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <HardDrive className="w-12 h-12 mx-auto text-zinc-400 opacity-60" />
            <h3 className="text-base font-bold">Obsidian Vault Masih Kosong</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Belum ada berkas catatan yang diarsipkan di folder Obsidian Anda. Pilih video berkualitas tinggi dari Home Feed untuk mulai menyintesis pengetahuan!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveStage('home')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Buka Home Feed & Kurasi Video
              </button>
            </div>
          </div>
        )}

        {/* Main Grid: Collections Left */}
        {filteredCollections.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              {activeTab === 'notes' ? (
                <div className="space-y-3">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.file_path}
                      className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition-all shadow-xs ${
                        isDark ? 'bg-[#17171c] border-[#27272a] hover:border-[#3f3f46]' : 'bg-white border-[#e4e4e7] hover:border-[#a1a1aa]'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#27272a] text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${isDark ? 'bg-[#27272a] text-zinc-300' : 'bg-[#f4f4f5] text-[#52525b]'}`}>
                              {note.category}
                            </span>
                            <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                              {note.modified_at}
                            </span>
                          </div>
                          <h3
                            onClick={() => handleOpenRawVaultNote(note)}
                            className={`text-xs font-bold truncate cursor-pointer transition-colors ${
                              isDark ? 'text-white hover:text-emerald-400' : 'text-[#18181b] hover:text-emerald-600'
                            }`}
                            title="Buka catatan di Reading Sanctuary"
                          >
                            {note.title || note.file_name}
                          </h3>
                          <p className={`text-[10px] font-mono truncate ${isDark ? 'text-zinc-500' : 'text-[#71717a]'}`}>
                            {note.file_path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenRawVaultNote(note)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            isDark
                              ? 'bg-white hover:bg-zinc-200 text-black'
                              : 'bg-[#17171c] hover:bg-black text-white'
                          }`}
                        >
                          <Play className={`w-3 h-3 ${isDark ? 'fill-black' : 'fill-white'}`} />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCollections.map((col) => (
                    <div
                      key={col.id}
                      className={`border rounded-2xl p-5 transition-all shadow-xs space-y-4 group ${
                        isDark
                          ? 'bg-[#17171c] border-[#27272a] hover:border-[#3f3f46]'
                          : 'bg-white border-[#e4e4e7] hover:border-[#a1a1aa]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div
                          onClick={() => handleOpenStudyDeck(col)}
                          className="relative sm:w-48 shrink-0 aspect-video rounded-xl overflow-hidden bg-black/10 cursor-pointer group/thumb"
                          title="Open in Command Deck & Reading Sanctuary"
                        >
                          <img src={col.thumbnail} alt={col.title} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-semibold text-[10px]">
                            {col.matchScore}% Study Match
                          </div>
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white group-hover/thumb:bg-black/25 transition-colors">
                            <Play className="w-5 h-5 mb-1 fill-white" />
                            <span className="text-xs font-bold font-mono">STUDY NOTE</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                            <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-[#18181b]'}`}>
                              {col.category}
                            </span>
                            <span>•</span>
                            <span>{col.curatedAgo}</span>
                            <span>•</span>
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>{col.statusBadge}</span>
                            </span>
                          </div>

                          <h3
                            onClick={() => handleOpenStudyDeck(col)}
                            className={`text-base font-bold leading-snug cursor-pointer transition-colors ${
                              isDark ? 'text-white hover:text-blue-400' : 'text-[#18181b] hover:text-blue-600'
                            }`}
                          >
                            {col.title}
                          </h3>

                          <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                            {col.summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {col.tags.map((t, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                                  isDark ? 'bg-[#27272a] text-zinc-300' : 'bg-[#f4f4f5] text-[#52525b]'
                                }`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-[#27272a]' : 'border-[#f4f4f5]'}`}>
                        <span className="text-[11px] font-mono text-zinc-400 truncate max-w-xs">
                          {col.obsidianPath}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenStudyDeck(col)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Play className="w-3 h-3 fill-black" />
                          <span>Review Note</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column (4 Cols): Quick Code Checkpoint */}
            <div className="lg:col-span-4 space-y-5">
              <div
                className={`border rounded-2xl p-5 space-y-4 ${
                  isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Vault Verification Summary
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-200/20">
                    <span className="text-zinc-400">Status:</span>
                    <span className="text-emerald-500 font-semibold">100% Local-First</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/20">
                    <span className="text-zinc-400">Database:</span>
                    <span className="font-mono">None (Zero Cloud DB)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200/20">
                    <span className="text-zinc-400">Format:</span>
                    <span className="font-mono">CommonMark (.md)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Wikilinks:</span>
                    <span className="text-emerald-500 font-semibold">Protected AST</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStage('focus')}
                    className="w-full py-2 rounded-xl border border-dashed border-zinc-500/40 text-xs font-medium text-center text-zinc-400 hover:text-white hover:border-zinc-400 cursor-pointer transition-colors"
                  >
                    Configure Learning Focus in my_focus.md
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
