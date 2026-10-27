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
} from 'lucide-react'
import { toast } from 'sonner'
import { CodeBlock } from './CodeBlock'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useSaveVaultMutation } from '../hooks/useVideoCuratorMutations'

export function ReadingSanctuary() {
  const {
    activeNote,
    activeDraft,
    isSavedToVault,
    savedVaultInfo,
    status,
  } = useVideoCuratorStore()

  const [copied, setCopied] = useState(false)
  const [editedCategory, setEditedCategory] = useState<string>('')
  const [prevNoteId, setPrevNoteId] = useState<string>('')
  const saveVaultMutation = useSaveVaultMutation()

  // Reset edited category state when active note changes (React render-phase pattern)
  const currentNoteId = activeNote ? `${activeNote.title}_${activeNote.category}` : ''
  if (currentNoteId !== prevNoteId) {
    setPrevNoteId(currentNoteId)
    setEditedCategory('')
  }

  // Parse YAML Frontmatter and extract clean markdown body
  const { frontmatter, cleanMarkdown, readingMinutes } = useMemo(() => {
    if (!activeNote?.content) {
      return { frontmatter: null, cleanMarkdown: '', readingMinutes: 1 }
    }

    const raw = activeNote.content
    let body = raw
    let fmData: Record<string, string> = {}

    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    if (fmMatch) {
      const fmContent = fmMatch[1]
      body = raw.slice(fmMatch[0].length).trim()

      // Simple key-value parser for basic YAML lines
      fmContent.split('\n').forEach((line) => {
        const colonIdx = line.indexOf(':')
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim()
          const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
          if (key && val) {
            fmData[key] = val
          }
        }
      })
    }

    // Estimate reading time (~200 words/min)
    const wordCount = body.split(/\s+/).filter(Boolean).length
    const minutes = Math.max(1, Math.ceil(wordCount / 200))

    return { frontmatter: fmData, cleanMarkdown: body, readingMinutes: minutes }
  }, [activeNote?.content])

  // Sync category state with note
  const currentCategory = editedCategory || frontmatter?.category || activeNote?.category || 'General'

  const handleCopy = async () => {
    if (!activeNote?.content) return
    try {
      await navigator.clipboard.writeText(activeNote.content)
      setCopied(true)
      toast.success('Markdown berhasil disalin ke clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin markdown.')
    }
  }

  const handleSaveToVault = () => {
    if (!activeNote) return
    saveVaultMutation.mutate({
      category: currentCategory.trim() || 'General',
      title: activeNote.title,
      content: activeNote.content,
      video_id: activeDraft?.video_id,
      index_summary: activeDraft?.index_summary,
      tags: activeDraft?.tags,
    })
  }

  const handleOpenInObsidian = (filePath: string) => {
    const obsidianUri = `obsidian://open?path=${encodeURIComponent(filePath)}`
    window.open(obsidianUri, '_self')
  }

  // Empty Zen State
  if (!activeNote) {
    return (
      <section className="flex-1 h-screen overflow-y-auto bg-[#f9f9fb] flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="max-w-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#e4e4e7] flex items-center justify-center mx-auto text-[#18181b] shadow-xs">
            <BookOpen className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-normal text-[#17171c] tracking-tight">
              Belum Ada Materi Terpilih
            </h2>
            <p className="text-xs text-[#71717a] leading-relaxed">
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
    <section className="flex-1 h-screen overflow-y-auto bg-[#ffffff] relative flex flex-col">
      {/* Floating Action Tools (Hover FABs at top-right) */}
      <div className="sticky top-4 right-6 z-20 flex justify-end px-8 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-xs border border-[#e4e4e7] rounded-full p-1.5 shadow-sm">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-[#52525b] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Salin Markdown Lengkap"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Markdown</span>
              </>
            )}
          </button>

          {finalFilePath && (
            <button
              onClick={() => handleOpenInObsidian(finalFilePath)}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-[#18181b] bg-[#f4f4f5] hover:bg-[#eeece7] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Buka Langsung di Obsidian"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Obsidian</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Document Reading Canvas */}
      <div className="max-w-3xl w-full mx-auto px-8 pt-8 pb-24 space-y-7">
        {/* Review-First Archiving Banner */}
        <div className="border border-[#e4e4e7] rounded-2xl p-4 bg-[#f9f9fb] transition-all">
          {!isSavedToVault && !activeNote.is_vault_file ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-[#17171c]">
                    Mode Pratinjau (Review First)
                  </span>
                </div>
                <p className="text-[11px] text-[#71717a]">
                  Periksa isi rangkuman. Ubah folder kategori jika perlu sebelum diarsipkan ke vault.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-[#e4e4e7] rounded-xl px-2.5 py-1 text-xs">
                  <span className="text-[#a1a1aa] text-[11px]">Folder:</span>
                  <input
                    type="text"
                    value={currentCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-28 text-xs font-medium text-[#18181b] focus:outline-none"
                    placeholder="Nama Folder"
                  />
                </div>

                <button
                  onClick={handleSaveToVault}
                  disabled={saveVaultMutation.isPending}
                  className="bg-[#17171c] hover:bg-black text-white text-xs font-medium py-2 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
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
                <span className="font-medium text-[#003c33] shrink-0">
                  Diarsipkan ke Obsidian Vault:
                </span>
                <span className="font-mono text-[#71717a] truncate text-[11px]">
                  {finalFilePath || `${currentCategory}/${activeNote.title}.md`}
                </span>
              </div>
              {finalFilePath && (
                <button
                  onClick={() => handleOpenInObsidian(finalFilePath)}
                  className="text-[#1863dc] hover:underline font-medium shrink-0 flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <span>Obsidian</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Editorial Header */}
        <header className="space-y-4 pt-2 border-b border-[#f4f4f5] pb-6">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#71717a]">
            <span className="inline-flex items-center gap-1 bg-[#eeece7] text-[#17171c] px-3 py-1 rounded-full text-xs font-medium font-mono">
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
          <h1 className="text-3xl sm:text-4xl font-normal text-[#17171c] tracking-tight leading-snug">
            {displayTitle}
          </h1>
        </header>

        {/* Clean Typographic Reading Surface (Frontmatter Stripped) */}
        <article className="prose prose-slate max-w-none text-[#212121] leading-relaxed prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-[#17171c] prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:my-4 prose-p:leading-relaxed prose-blockquote:border-l-2 prose-blockquote:border-[#17171c] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-[#52525b] prose-pre:p-0 prose-pre:bg-transparent prose-table:border-collapse prose-th:border-b prose-th:border-[#e4e4e7] prose-th:py-2 prose-td:border-b prose-td:border-[#f4f4f5] prose-td:py-2">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
            }}
          >
            {cleanMarkdown}
          </ReactMarkdown>
        </article>
      </div>
    </section>
  )
}
