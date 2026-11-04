import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Trash2,
  FileText,
  Play,
  BrainCircuit,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { extractVideoId } from '@/lib/utils'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useVaultChatMutation } from '../hooks/useVideoCuratorMutations'
import { useTheme } from '../hooks/useTheme'
import { CodeBlock } from './CodeBlock'

function convertTimestampsToLinks(text: string): string {
  if (!text) return ''
  return text.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\()/g, '[$1](#jump-$1)')
}

export function GlobalVaultChatSheet() {
  const {
    isVaultChatOpen,
    setIsVaultChatOpen,
    vaultChatHistory,
    clearVaultChat,
    setActiveNote,
    setActiveStage,
    setVideoUrl,
    seekToTimestamp,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()
  const vaultChatMutation = useVaultChatMutation()

  const [inputQuery, setInputQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isVaultChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [vaultChatHistory, isVaultChatOpen, vaultChatMutation.isPending])

  // Focus input when sheet opens
  useEffect(() => {
    if (isVaultChatOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
    }
  }, [isVaultChatOpen])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = inputQuery.trim()
    if (!trimmed || vaultChatMutation.isPending) return

    setInputQuery('')
    vaultChatMutation.mutate({ question: trimmed })
  }

  const handleOpenCitedFile = async (filePath: string) => {
    try {
      const res = await api.get('/api/v1/vault/note', {
        params: { path: filePath },
      })
      if (res.data?.content) {
        const vid = extractVideoId(res.data.content)
        if (vid) {
          setVideoUrl(`https://www.youtube.com/watch?v=${vid}`)
        }
        setActiveNote({
          title: res.data.title || filePath.split('/').pop()?.replace('.md', '') || 'Catatan Vault',
          category: filePath.includes('/') ? filePath.split('/')[0] : 'General',
          content: res.data.content,
          file_path: res.data.file_path,
          is_vault_file: true,
          video_id: vid || undefined,
        })
        setActiveStage('curate')
        setIsVaultChatOpen(false)
        toast.success(`Membuka "${res.data.title || filePath}" di Reading Sanctuary!`)
      }
    } catch {
      toast.error(`Tidak dapat membuka berkas "${filePath}" dari Obsidian Vault.`)
    }
  }

  const starterSuggestions = [
    'Apa hubungan antara asynchronous I/O dan event loop starvation?',
    'Rangkum konsep arsitektur dan trade-off utama dari video di vault saya',
    'Bagaimana penerapan microservices dan task queue di backend?',
  ]

  // Reverse so oldest message appears at top and newest at bottom
  const orderedHistory = [...vaultChatHistory].reverse()

  return (
    <>
      {/* 1. Global Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsVaultChatOpen(true)}
        className={`fixed bottom-6 right-6 z-40 h-12 px-4 rounded-full shadow-lg flex items-center gap-2.5 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border ${
          isDark
            ? 'bg-[#17171c] text-white hover:bg-[#27272a] border-[#27272a] shadow-black/40'
            : 'bg-white text-[#18181b] hover:bg-[#f4f4f5] border-[#e4e4e7] shadow-zinc-400/20'
        }`}
        title="Tanya Seluruh Vault (Hierarchical Router RAG)"
      >
        <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-500/20 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide">Tanya Vault</span>
        {vaultChatHistory.length > 0 && (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {vaultChatHistory.length}
          </span>
        )}
      </button>

      {/* 2. Slide-Over Sheet (Drawer) */}
      {isVaultChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsVaultChatOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Sheet Drawer Panel */}
          <div
            className={`relative w-full sm:max-w-lg md:max-w-xl h-full flex flex-col shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-right ${
              isDark
                ? 'bg-[#121216] border-l border-[#27272a] text-[#f4f4f5]'
                : 'bg-white border-l border-[#e4e4e7] text-[#18181b]'
            }`}
          >
            {/* Sheet Header */}
            <div
              className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'border-[#27272a] bg-[#141419]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-[#27272a] text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight">Tanya Lintas Vault</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Hierarchical RAG
                    </span>
                  </div>
                  <p className={`text-[11px] truncate max-w-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Katalog catatan & transkrip asli video
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {vaultChatHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={clearVaultChat}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'text-zinc-400 hover:text-rose-400 hover:bg-[#27272a]' : 'text-zinc-500 hover:text-rose-600 hover:bg-[#f4f4f5]'
                    }`}
                    title="Bersihkan riwayat percakapan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsVaultChatOpen(false)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-white hover:bg-[#27272a]' : 'text-zinc-500 hover:text-[#18181b] hover:bg-[#f4f4f5]'
                  }`}
                  title="Tutup sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet Message Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {orderedHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                      isDark ? 'bg-[#17171c] border border-[#27272a]' : 'bg-[#f4f4f5] border border-[#e4e4e7]'
                    }`}
                  >
                    <MessageSquare className="w-6 h-6 text-emerald-500" />
                  </div>

                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-sm font-bold">Dialog Berbasiskan Seluruh Vault</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      AI akan menyaring catatan paling relevan dari hierarki folder Anda, lalu menggabungkannya dengan transkrip asli video untuk menjawab pertanyaan Anda secara mendalam.
                    </p>
                  </div>

                  {/* Starter Chips */}
                  <div className="w-full space-y-2 pt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block text-left">
                      Contoh Pertanyaan:
                    </span>
                    {starterSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setInputQuery(suggestion)
                          vaultChatMutation.mutate({ question: suggestion })
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isDark
                            ? 'bg-[#17171c] border-[#27272a] hover:border-emerald-500/40 text-zinc-300 hover:text-white'
                            : 'bg-[#f9f9fb] border-[#e4e4e7] hover:border-emerald-500/40 text-zinc-700 hover:text-[#18181b]'
                        }`}
                      >
                        <span className="line-clamp-2 leading-snug">{suggestion}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                orderedHistory.map((item) => (
                  <div key={item.id} className="space-y-3">
                    {/* User Question */}
                    <div className="flex justify-end">
                      <div
                        className={`px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] text-xs shadow-xs font-medium ${
                          isDark
                            ? 'bg-white text-black'
                            : 'bg-[#17171c] text-white'
                        }`}
                      >
                        {item.question}
                      </div>
                    </div>

                    {/* Agent Answer Bubble (Parsed with ReactMarkdown) */}
                    <div className="flex justify-start">
                      <div
                        className={`w-full max-w-[95%] border rounded-2xl rounded-tl-xs p-4.5 space-y-3 shadow-xs ${
                          isDark
                            ? 'bg-[#17171c] border-[#27272a] text-zinc-200'
                            : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b]'
                        }`}
                      >
                        {/* Markdown Formatted Answer - Free of Raw Markdown Asterisks */}
                        <div
                          className={`prose max-w-none text-xs leading-relaxed ${
                            isDark
                              ? 'prose-invert text-zinc-200 prose-headings:text-white prose-headings:font-bold prose-headings:text-sm prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-emerald-400 prose-code:text-emerald-300 prose-code:bg-[#27272a] prose-code:px-1 prose-code:py-0.5 prose-code:rounded'
                              : 'prose-slate text-[#18181b] prose-headings:text-[#17171c] prose-headings:font-bold prose-headings:text-sm prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-[#003c33] prose-code:text-[#003c33] prose-code:bg-[#e4e4e7] prose-code:px-1 prose-code:py-0.5 prose-code:rounded'
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
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-[#003c33]/50 text-emerald-300 text-xs font-mono font-medium hover:bg-[#003c33]/80 transition-colors border border-emerald-500/30 cursor-pointer align-baseline"
                                      title={`Putar video tepat di ${ts}`}
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
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
                            {convertTimestampsToLinks(item.answer)}
                          </ReactMarkdown>
                        </div>

                        {/* Grounded RAG Citations */}
                        {item.cited_files && item.cited_files.length > 0 && (
                          <div
                            className={`pt-2.5 border-t flex items-center gap-1.5 flex-wrap ${
                              isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'
                            }`}
                          >
                            <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                              Sitasi Berkas:
                            </span>
                            {item.cited_files.map((file) => (
                              <button
                                key={file}
                                type="button"
                                onClick={() => handleOpenCitedFile(file)}
                                className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer group/cite"
                                title={`Buka "${file}" di Reading Sanctuary`}
                              >
                                <FileText className="w-2.5 h-2.5 shrink-0 group-hover/cite:scale-110 transition-transform" />
                                <span className="truncate max-w-[180px]">{file}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <span className="text-[10px] font-mono text-zinc-500">
                            {item.created_at}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Pending Router RAG Loading State */}
              {vaultChatMutation.isPending && (
                <div className="flex justify-start">
                  <div
                    className={`px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-3 text-xs border animate-pulse ${
                      isDark
                        ? 'bg-[#17171c] border-[#27272a] text-zinc-300'
                        : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]'
                    }`}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[11px] text-emerald-500">
                        2-Stage Hierarchical Router RAG
                      </p>
                      <p className="font-mono text-[10px] text-zinc-400">
                        Memfilter katalog vault & menyintesis catatan + transkrip asli...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Sheet Input Form */}
            <div
              className={`p-4 border-t shrink-0 ${
                isDark ? 'border-[#27272a] bg-[#141419]' : 'border-[#e4e4e7] bg-white'
              }`}
            >
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Tanyakan topik lintas video & catatan vault..."
                  disabled={vaultChatMutation.isPending}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDark
                      ? 'bg-[#1c1c22] border-[#27272a] text-white placeholder-zinc-500 focus:border-emerald-500/50'
                      : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b] placeholder-zinc-400 focus:border-[#17171c]'
                  }`}
                />

                <button
                  type="submit"
                  disabled={!inputQuery.trim() || vaultChatMutation.isPending}
                  className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Kirim Pertanyaan"
                >
                  {vaultChatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
