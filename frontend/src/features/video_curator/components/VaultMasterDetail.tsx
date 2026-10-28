import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Library,
  Search,
  Calendar,
  Folder,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  BookOpen,
  Send,
  FileText,
  Tag,
  FolderCog,
  BrainCircuit,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { CodeBlock } from './CodeBlock'
import { ActiveRecallStudio } from './ActiveRecallStudio'
import { api } from '@/lib/api'
import { extractVideoId } from '@/lib/utils'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useVaultChatMutation } from '../hooks/useVideoCuratorMutations'
import type { VaultNoteItem, VaultNotesResponse, VideoQuizResponse } from '../types'

export function VaultMasterDetail() {
  const {
    vaultChatHistory,
    setIsVaultSettingsOpen,
    setActiveQuiz,
    resetQuizAnswers,
    seekToTimestamp,
    setVideoUrl,
  } = useVideoCuratorStore()
  const vaultChatMutation = useVaultChatMutation()

  const [activeSubTab, setActiveSubTab] = useState<'reader' | 'quiz' | 'chat'>('reader')
  const [selectedNote, setSelectedNote] = useState<VaultNoteItem | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState<string>('')
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [chatInput, setChatInput] = useState('')
  const [copied, setCopied] = useState(false)

  // Fetch all notes
  const { data: notesData, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['vault-notes'],
    queryFn: async () => {
      const res = await api.get<VaultNotesResponse>('/api/v1/vault/notes')
      return res.data
    },
  })

  const notes = useMemo(() => notesData?.notes || [], [notesData?.notes])

  // Extract all unique categories/tags for tag cloud
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => set.add(n.category))
    return Array.from(set)
  }, [notes])

  // Filter notes by search & tag
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        n.title.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.file_name.toLowerCase().includes(q)
      const matchesTag = selectedTag === 'all' || n.category === selectedTag
      return matchesSearch && matchesTag
    })
  }, [notes, searchQuery, selectedTag])

  // Select note and load content + quiz
  const handleSelectNote = async (note: VaultNoteItem) => {
    setSelectedNote(note)
    setActiveSubTab('reader')
    setIsLoadingContent(true)
    try {
      const res = await api.get<{
        success: boolean
        title: string
        content: string
        file_path: string
      }>(`/api/v1/vault/note?path=${encodeURIComponent(note.file_path)}`)
      if (res.data?.success) {
        const rawContent = res.data.content
        setNoteContent(rawContent)

        // Resolve YouTube video ID
        let vId = note.video_id
        if (!vId) {
          const match = rawContent.match(/(?:source|url):\s*['"]?([^\r\n'"]+)/i)
          if (match) {
            vId = extractVideoId(match[1]) || undefined
          }
          if (!vId) {
            vId = extractVideoId(rawContent) || undefined
          }
        }

        setSelectedVideoId(vId || null)

        if (vId) {
          setVideoUrl(`https://www.youtube.com/watch?v=${vId}`)
          try {
            const quizRes = await api.get<VideoQuizResponse>(
              `/api/v1/vault/quiz?video_id=${vId}`
            )
            if (quizRes.data?.success && quizRes.data.questions?.length > 0) {
              setActiveQuiz(quizRes.data)
              resetQuizAnswers()
            } else {
              setActiveQuiz(null)
            }
          } catch {
            setActiveQuiz(null)
          }
        } else {
          setActiveQuiz(null)
        }
      }
    } catch {
      toast.error('Gagal membaca isi berkas catatan.')
    } finally {
      setIsLoadingContent(false)
    }
  }

  const refreshCurrentNote = async () => {
    if (!selectedNote) return
    try {
      const res = await api.get<{
        success: boolean
        title: string
        content: string
        file_path: string
      }>(`/api/v1/vault/note?path=${encodeURIComponent(selectedNote.file_path)}`)
      if (res.data?.success) {
        setNoteContent(res.data.content)
      }
    } catch {
      // ignore
    }
  }

  // Parse YAML Frontmatter & linkify timestamps for reader
  const { frontmatter, cleanMarkdown } = useMemo(() => {
    if (!noteContent) return { frontmatter: null, cleanMarkdown: '' }
    let body = noteContent
    const fmData: Record<string, string> = {}
    const fmMatch = noteContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    if (fmMatch) {
      body = noteContent.slice(fmMatch[0].length).trim()
      fmMatch[1].split('\n').forEach((line) => {
        const colonIdx = line.indexOf(':')
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim()
          const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
          if (key && val) fmData[key] = val
        }
      })
    }

    const linkifiedBody = body.replace(
      /(?<!\[▶\s*)\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\(#jump-)/g,
      '[▶ $1](#jump-$1)'
    )

    return { frontmatter: fmData, cleanMarkdown: linkifiedBody }
  }, [noteContent])

  const handleCopyMarkdown = async () => {
    if (!noteContent) return
    try {
      await navigator.clipboard.writeText(noteContent)
      setCopied(true)
      toast.success('Disalin ke clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin markdown.')
    }
  }

  const handleOpenObsidian = (filePath: string) => {
    window.open(`obsidian://open?path=${encodeURIComponent(filePath)}`, '_self')
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || vaultChatMutation.isPending) return
    vaultChatMutation.mutate(
      { question: chatInput.trim() },
      { onSuccess: () => setChatInput('') }
    )
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden bg-[#ffffff]">
      {/* Left Master Column (~360px) */}
      <div className="w-full lg:w-[360px] shrink-0 border-r border-[#e4e4e7] flex flex-col h-full overflow-hidden bg-[#ffffff]">
        {/* Master Header */}
        <div className="p-5 border-b border-[#f4f4f5] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-[#18181b]" />
              <h2 className="text-sm font-semibold text-[#17171c]">
                Riwayat Vault
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#52525b]">
                {notes.length} Catatan
              </span>
              <button
                type="button"
                onClick={() => setIsVaultSettingsOpen(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
                title="Pengaturan Lokasi Obsidian Vault"
              >
                <FolderCog className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#a1a1aa] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari judul, tag, atau isi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#f9f9fb] border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#17171c]"
            />
          </div>

          {/* Tag Cloud */}
          {allCategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTag === 'all'
                    ? 'bg-[#17171c] text-white'
                    : 'bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b]'
                }`}
              >
                #all
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedTag(cat)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTag === cat
                      ? 'bg-[#17171c] text-white'
                      : 'bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b]'
                  }`}
                >
                  #{cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Master Note List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoadingNotes ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#71717a] gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Membaca berkas vault...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#71717a] space-y-1">
              <FileText className="w-8 h-8 text-[#d4d4d8] mx-auto mb-2" />
              <p className="font-medium text-[#18181b]">Belum ada catatan</p>
              <p className="text-[11px]">
                {searchQuery
                  ? 'Tidak ada catatan yang cocok dengan pencarian.'
                  : 'Kurasi video di Tab 1 untuk menyimpan catatan.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setIsVaultSettingsOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#18181b] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <FolderCog className="w-3.5 h-3.5" />
                  <span>Kustomisasi Folder Vault</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedNote?.file_path === note.file_path
              return (
                <button
                  key={note.file_path}
                  onClick={() => handleSelectNote(note)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1 group ${
                    isSelected
                      ? 'bg-[#17171c] text-white border-[#17171c] shadow-xs'
                      : 'bg-[#ffffff] border-[#e4e4e7] hover:border-[#17171c] hover:bg-[#f9f9fb]'
                  }`}
                >
                  <h4
                    className={`text-xs font-medium line-clamp-2 ${
                      isSelected ? 'text-white' : 'text-[#18181b]'
                    }`}
                  >
                    {note.title}
                  </h4>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <div
                      className={`flex items-center gap-2 text-[10px] font-mono ${
                        isSelected ? 'text-[#a1a1aa]' : 'text-[#71717a]'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Folder className="w-2.5 h-2.5" />
                        {note.category}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {note.modified_at}
                      </span>
                    </div>
                    {note.quiz_path && (
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                        title="Kuis & Flashcards tersimpan"
                      >
                        <BrainCircuit className="w-2.5 h-2.5" />
                        <span>Kuis</span>
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right Detail Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f9f9fb]">
        {/* Detail Top Sub-Tabs Navigation */}
        <div className="bg-white border-b border-[#e4e4e7] px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#f4f4f5] p-1 rounded-full border border-[#e4e4e7]">
            <button
              onClick={() => setActiveSubTab('reader')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'reader'
                  ? 'bg-white text-[#17171c] shadow-xs'
                  : 'text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Baca Catatan</span>
            </button>
            <button
              onClick={() => setActiveSubTab('quiz')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'quiz'
                  ? 'bg-white text-[#17171c] shadow-xs'
                  : 'text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Active Recall & Kuis</span>
              {selectedNote?.quiz_path && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'chat'
                  ? 'bg-white text-[#17171c] shadow-xs'
                  : 'text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Dialog Global Vault (RAG)</span>
            </button>
          </div>

          {/* Reader Actions when activeSubTab is 'reader' and note is selected */}
          {activeSubTab === 'reader' && selectedNote && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] border border-[#e4e4e7] bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>Salin</span>
              </button>
              <button
                onClick={() => handleOpenObsidian(selectedNote.file_path)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[#18181b] bg-[#eeece7] hover:bg-[#e4e4e7] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Obsidian</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub-Tab 1: Direct Note Reader with Clickable Jump Timestamps */}
        {activeSubTab === 'reader' && (
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            {isLoadingContent ? (
              <div className="h-full flex items-center justify-center text-xs text-[#71717a] gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat catatan...</span>
              </div>
            ) : !selectedNote ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#e4e4e7] flex items-center justify-center shadow-xs">
                  <BookOpen className="w-6 h-6 text-[#17171c]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-[#18181b]">
                    Pilih Catatan untuk Dibaca
                  </h3>
                  <p className="text-xs text-[#71717a] max-w-sm">
                    Pilih salah satu catatan dari panel daftar di sebelah kiri untuk membaca rangkuman secara langsung.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto bg-white border border-[#e4e4e7] rounded-2xl p-8 lg:p-12 shadow-xs space-y-6">
                {/* Header */}
                <header className="space-y-3 border-b border-[#f4f4f5] pb-6">
                  <div className="flex items-center gap-2 text-xs text-[#71717a]">
                    <span className="inline-flex items-center gap-1 bg-[#eeece7] text-[#17171c] px-3 py-1 rounded-full font-mono font-medium">
                      <Tag className="w-3 h-3" />
                      {selectedNote.category}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{selectedNote.modified_at}</span>
                  </div>
                  <h1 className="text-3xl font-normal text-[#17171c] tracking-tight">
                    {selectedNote.title || frontmatter?.title}
                  </h1>
                </header>

                {/* Markdown content with interactive seek buttons */}
                <article className="prose prose-slate max-w-none text-[#212121] leading-relaxed prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-[#17171c] prose-h2:text-2xl prose-h3:text-lg prose-pre:p-0 prose-pre:bg-transparent prose-blockquote:border-l-2 prose-blockquote:border-[#17171c]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: CodeBlock,
                      a: ({ href, children, ...props }) => {
                        if (href?.startsWith('#jump-')) {
                          const ts = href.replace('#jump-', '')
                          return (
                            <button
                              type="button"
                              onClick={() => seekToTimestamp(ts)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#edfce9] text-[#003c33] text-xs font-mono font-medium hover:bg-[#d8f9d0] transition-colors border border-[#b2e5aa] cursor-pointer align-baseline shadow-2xs group/btn"
                              title={`Putar video tepat di ${ts}`}
                            >
                              <Play className="w-2.5 h-2.5 fill-current group-hover/btn:scale-110 transition-transform" />
                              <span>{ts}</span>
                            </button>
                          )
                        }
                        return (
                          <a href={href} target="_blank" rel="noreferrer" {...props}>
                            {children}
                          </a>
                        )
                      },
                    }}
                  >
                    {cleanMarkdown}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}

        {/* Sub-Tab 2: Active Recall Quiz & Flashcards for Vault Notes */}
        {activeSubTab === 'quiz' && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            {!selectedNote ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#e4e4e7] flex items-center justify-center shadow-xs">
                  <BrainCircuit className="w-6 h-6 text-[#17171c]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-[#18181b]">
                    Pilih Catatan untuk Membuka Kuis
                  </h3>
                  <p className="text-xs text-[#71717a] max-w-sm">
                    Pilih salah satu catatan dari panel di sebelah kiri untuk mengulang kuis atau flashcards.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-5">
                <div className="bg-white border border-[#e4e4e7] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                      Sesi Belajar Aktif Vault
                    </span>
                    <h2 className="text-sm sm:text-base font-semibold text-[#17171c]">
                      {selectedNote.title || frontmatter?.title}
                    </h2>
                  </div>
                  {selectedNote.quiz_path ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersimpan di Vault</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-[#71717a] bg-[#f4f4f5] self-start sm:self-auto">
                      <span>Belum ada kuis tersimpan</span>
                    </span>
                  )}
                </div>

                <ActiveRecallStudio
                  videoId={selectedVideoId}
                  markdownContent={noteContent}
                  filePath={selectedNote.file_path}
                  isVaultHistory={true}
                  onQuizSaved={refreshCurrentNote}
                />
              </div>
            )}
          </div>
        )}

        {/* Sub-Tab 3: Vault-Wide Grounded Chat (2-Stage Router RAG) */}
        {activeSubTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-8 max-w-4xl w-full mx-auto justify-between">
            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {vaultChatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#e4e4e7] flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-6 h-6 text-[#17171c]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-[#18181b]">
                      Tanya Lintas Vault
                    </h3>
                    <p className="text-xs text-[#71717a] max-w-md leading-relaxed">
                      Cari tahu relasi atau jawaban dari topik-topik berbeda secara menyeluruh berdasarkan data catatan lokal.
                    </p>
                  </div>
                </div>
              ) : (
                vaultChatHistory.map((item) => (
                  <div key={item.id} className="space-y-2">
                    {/* User Question */}
                    <div className="flex justify-end">
                      <div className="bg-[#17171c] text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[80%] text-xs shadow-xs">
                        {item.question}
                      </div>
                    </div>

                    {/* Agent Answer with Grounded Citations */}
                    <div className="flex justify-start">
                      <div className="bg-white border border-[#e4e4e7] text-[#18181b] px-5 py-4 rounded-2xl rounded-tl-xs max-w-[90%] space-y-2 shadow-xs">
                        <div className="prose prose-slate max-w-none text-xs leading-relaxed prose-headings:font-semibold prose-headings:text-[#17171c] prose-headings:my-2 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-code:font-mono prose-code:text-[#17171c] prose-code:bg-[#f4f4f5] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#17171c] prose-pre:text-white prose-pre:p-3 prose-pre:rounded-xl">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.answer}
                          </ReactMarkdown>
                        </div>
                        {item.cited_files && item.cited_files.length > 0 && (
                          <div className="pt-2 border-t border-[#f4f4f5] flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-[#a1a1aa]">Sitasi Catatan:</span>
                            {item.cited_files.map((file) => (
                              <span
                                key={file}
                                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]"
                              >
                                <FileText className="w-2.5 h-2.5" />
                                {file}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleChatSubmit} className="relative flex items-center bg-white border border-[#e4e4e7] rounded-2xl p-1.5 shadow-sm">
              <input
                type="text"
                placeholder="Tanyakan hal lintas seluruh catatan di vault..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={vaultChatMutation.isPending}
                className="w-full pl-4 pr-12 py-2 text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || vaultChatMutation.isPending}
                className="absolute right-2 p-2 bg-[#17171c] text-white rounded-xl hover:bg-black disabled:opacity-40 transition-opacity cursor-pointer"
              >
                {vaultChatMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
