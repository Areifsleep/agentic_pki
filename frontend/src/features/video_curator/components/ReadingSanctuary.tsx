import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Copy,
  Check,
  FolderDown,
  ExternalLink,
  BookOpen,
  Clock,
  Sparkles,
  Loader2,
  Tag,
  Play,
  Tv,
  BrainCircuit,
} from 'lucide-react'
import { toast } from 'sonner'
import { CodeBlock } from './CodeBlock'
import { ActiveRecallStudio } from './ActiveRecallStudio'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import { useSaveVaultMutation } from '../hooks/useVideoCuratorMutations'

export function ReadingSanctuary() {
  const {
    activeNote,
    activeDraft,
    isSavedToVault,
    savedVaultInfo,
    status,
    isPlayerOpen,
    togglePlayer,
    seekToTimestamp,
    activeQuiz,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()

  const [activeTab, setActiveTab] = useState<'reader' | 'quiz'>('reader')
  const [copied, setCopied] = useState(false)
  const [editedCategory, setEditedCategory] = useState<string>('')
  const [prevNoteId, setPrevNoteId] = useState<string>('')
  const saveVaultMutation = useSaveVaultMutation()

  // Reset edited category state when active note changes
  const currentNoteId = activeNote ? `${activeNote.title}_${activeNote.category}` : ''
  if (currentNoteId !== prevNoteId) {
    setPrevNoteId(currentNoteId)
    setEditedCategory('')
  }

  // Parse YAML Frontmatter, extract clean markdown body, and linkify timestamps
  const { frontmatter, cleanMarkdown, readingMinutes } = useMemo(() => {
    if (!activeNote?.content) {
      return { frontmatter: null, cleanMarkdown: '', readingMinutes: 1 }
    }

    const content = activeNote.content
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    let fmData: Record<string, string> = {}
    let body = content

    if (fmMatch) {
      body = content.slice(fmMatch[0].length)
      const lines = fmMatch[1].split('\n')
      for (const line of lines) {
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim()
          const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
          fmData[key] = val
        }
      }
    }

    // Word count calculation
    const words = body.trim().split(/\s+/).length
    const minutes = Math.max(1, Math.ceil(words / 200))

    return {
      frontmatter: Object.keys(fmData).length ? fmData : null,
      cleanMarkdown: body,
      readingMinutes: minutes,
    }
  }, [activeNote?.content])

  // Convert raw timestamp patterns [MM:SS] to Markdown links: [#jump-MM:SS](#jump-MM:SS)
  const interactiveMarkdown = useMemo(() => {
    if (!cleanMarkdown) return ''
    return cleanMarkdown.replace(
      /\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\()/g,
      '[$1](#jump-$1)'
    )
  }, [cleanMarkdown])

  const currentCategory =
    editedCategory || activeNote?.category || frontmatter?.category || 'General'

  const handleCopy = () => {
    if (!activeNote?.content) return
    navigator.clipboard.writeText(activeNote.content)
    setCopied(true)
    toast.success('Konten Markdown berhasil disalin ke clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToVault = () => {
    if (!activeNote) return

    saveVaultMutation.mutate({
      category: currentCategory,
      title: activeNote.title,
      content: activeNote.content,
      video_id: activeDraft?.video_id,
      transcript_text: activeDraft?.markdown_content,
      index_summary: activeDraft?.index_summary,
      tags: activeDraft?.tags,
      quiz_data: activeQuiz || undefined,
    })
  }

  const handleOpenInObsidian = (filePath: string) => {
    const obsidianUri = `obsidian://open?path=${encodeURIComponent(filePath)}`
    window.open(obsidianUri, '_self')
  }

  // Empty Zen State
  if (!activeNote) {
    return (
      <section
        className={`flex-1 h-full min-h-0 overflow-y-auto flex flex-col items-center justify-center p-8 text-center select-none transition-colors ${
          isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#f9f9fb] text-[#18181b]'
        }`}
      >
        <div className="max-w-md space-y-4">
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-xs ${
              isDark ? 'bg-[#17171c] border-[#27272a] text-white' : 'bg-white border-[#e4e4e7] text-[#18181b]'
            }`}
          >
            <BookOpen className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5">
            <h2 className={`text-xl font-normal tracking-tight ${isDark ? 'text-white' : 'text-[#17171c]'}`}>
              Belum Ada Materi Terpilih
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              {status === 'PROCESSING'
                ? 'Agen sedang mengekstrak materi dan merangkum transkrip...'
                : 'Pilih catatan dari riwayat vault atau masukkan tautan YouTube di panel kiri untuk mulai membaca.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  const displayTitle = activeNote.title || frontmatter?.title || 'Catatan Video'
  const finalFilePath = savedVaultInfo?.file_path || activeNote.file_path

  return (
    <section
      className={`flex-1 h-full min-h-0 overflow-hidden relative flex flex-col transition-colors ${
        isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#ffffff] text-[#18181b]'
      }`}
    >
      {/* Top Sanctuary Navigation Bar */}
      <div
        className={`px-8 py-3 border-b flex items-center justify-between shrink-0 z-20 transition-colors ${
          isDark ? 'bg-[#141419] border-[#27272a]' : 'bg-white border-[#f4f4f5]'
        }`}
      >
        {/* Sub-tab Switcher: Reader vs Active Recall */}
        <div
          className={`flex items-center gap-1.5 p-1 rounded-xl border ${
            isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-[#f4f4f5] border-[#e4e4e7]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('reader')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reader'
                ? isDark
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'bg-white text-[#18181b] shadow-xs'
                : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ringkasan Catatan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'quiz'
                ? isDark
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'bg-white text-[#18181b] shadow-xs'
                : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Recall & Quiz</span>
            {activeQuiz && (
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-semibold ${
                  isDark ? 'bg-emerald-500 text-black' : 'bg-[#17171c] text-white'
                }`}
              >
                {activeQuiz.total_questions}
              </span>
            )}
          </button>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Video Player Toggle */}
          <button
            type="button"
            onClick={() => togglePlayer()}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlayerOpen
                ? isDark
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#17171c] text-white border-[#17171c]'
                : isDark
                  ? 'bg-[#17171c] text-zinc-300 border-[#27272a] hover:bg-[#27272a]'
                  : 'bg-white text-[#52525b] border-[#e4e4e7] hover:bg-[#f4f4f5]'
            }`}
            title={isPlayerOpen ? 'Sembunyikan Pemutar Video' : 'Tampilkan Pemutar Video'}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isPlayerOpen ? 'Player Aktif' : 'Pemutar Video'}
            </span>
          </button>

          {/* Copy Markdown */}
          <button
            type="button"
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-[#17171c] text-zinc-300 border-[#27272a] hover:text-white hover:bg-[#27272a]'
                : 'text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] border-[#e4e4e7]'
            }`}
            title="Salin Markdown Lengkap"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 hidden sm:inline">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salin</span>
              </>
            )}
          </button>

          {/* Open in Obsidian */}
          {finalFilePath && (
            <button
              type="button"
              onClick={() => handleOpenInObsidian(finalFilePath)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'bg-[#27272a] text-white border-[#3f3f46] hover:bg-[#3f3f46]'
                  : 'text-[#18181b] bg-[#f4f4f5] hover:bg-[#eeece7] border-[#e4e4e7]'
              }`}
              title="Buka Langsung di Obsidian"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka di Obsidian</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'quiz' ? (
        <div className="flex-1 overflow-hidden">
          <ActiveRecallStudio />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Main Document Reading Canvas */}
          <div className="max-w-3xl w-full mx-auto px-8 pt-6 pb-24 space-y-7">
            {/* Review-First Archiving Banner */}
            <div
              className={`border rounded-2xl p-4 transition-all ${
                isDark
                  ? 'border-[#27272a] bg-[#141419]'
                  : 'border-[#e4e4e7] bg-[#f9f9fb]'
              }`}
            >
              {!isSavedToVault && !activeNote.is_vault_file ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className={`text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-[#17171c]'}`}>
                        Mode Pratinjau (Review First)
                      </span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      Periksa isi rangkuman. Ubah folder kategori jika perlu sebelum diarsipkan ke vault.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 border rounded-xl px-2.5 py-1 text-xs ${
                        isDark ? 'bg-[#1c1c22] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
                      }`}
                    >
                      <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>Folder:</span>
                      <input
                        type="text"
                        value={currentCategory}
                        onChange={(e) => setEditedCategory(e.target.value)}
                        className={`w-28 text-xs font-medium focus:outline-none ${
                          isDark ? 'bg-transparent text-white' : 'bg-transparent text-[#18181b]'
                        }`}
                        placeholder="Nama Folder"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveToVault}
                      disabled={saveVaultMutation.isPending}
                      className={`text-xs font-medium py-2 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                        isDark
                          ? 'bg-white hover:bg-zinc-200 text-black font-semibold'
                          : 'bg-[#17171c] hover:bg-black text-white'
                      }`}
                    >
                      {saveVaultMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <FolderDown className="w-3.5 h-3.5" />
                          <span>Simpan ke Vault</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className={`font-medium shrink-0 ${isDark ? 'text-emerald-400' : 'text-[#003c33]'}`}>
                      Diarsipkan ke Obsidian Vault:
                    </span>
                    <span className={`font-mono truncate text-[11px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      {finalFilePath || `${currentCategory}/${activeNote.title}.md`}
                    </span>
                  </div>
                  {finalFilePath && (
                    <button
                      type="button"
                      onClick={() => handleOpenInObsidian(finalFilePath)}
                      className="text-emerald-500 hover:underline font-medium shrink-0 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <span>Obsidian</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Editorial Header */}
            <header className={`space-y-4 pt-2 border-b pb-6 ${isDark ? 'border-[#27272a]' : 'border-[#f4f4f5]'}`}>\n              {/* Metadata Row */}
              <div className={`flex flex-wrap items-center gap-2.5 text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium font-mono ${
                    isDark ? 'bg-[#27272a] text-zinc-200' : 'bg-[#eeece7] text-[#17171c]'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {currentCategory}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{readingMinutes} Menit Baca
                </span>
                {activeNote.execution_time_seconds && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {activeNote.execution_time_seconds}s sintesis
                    </span>
                  </>
                )}
              </div>

              {/* Large Editorial Headline */}
              <h1 className={`text-3xl sm:text-4xl font-normal tracking-tight leading-snug ${isDark ? 'text-white' : 'text-[#17171c]'}`}>
                {displayTitle}
              </h1>
            </header>

            {/* Clean Typographic Reading Surface */}
            <article
              className={`prose max-w-none leading-relaxed ${
                isDark
                  ? 'prose-invert text-zinc-300 prose-headings:text-white prose-blockquote:border-zinc-500 prose-blockquote:text-zinc-400 prose-th:border-[#27272a] prose-td:border-[#27272a]'
                  : 'prose-slate text-[#212121] prose-headings:text-[#17171c] prose-blockquote:border-[#17171c] prose-blockquote:text-[#52525b] prose-th:border-[#e4e4e7] prose-td:border-[#f4f4f5]'
              }`}
            >
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
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#003c33]/50 text-emerald-300 text-xs font-mono font-medium hover:bg-[#003c33]/80 transition-colors border border-emerald-500/30 cursor-pointer align-baseline shadow-2xs group/btn"
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
                {interactiveMarkdown}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </section>
  )
}
