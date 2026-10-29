import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Search,
  Zap,
  BookOpen,
  Code2,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  ExternalLink,
  Plus,
  X,
  MessageSquare,
  Sparkles,
  Play,
  Tv,
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import {
  useSynthesizeVideoMutation,
  useVideoQAMutation,
} from '../hooks/useVideoCuratorMutations'
import { videoFormSchema, type SummaryMode } from '../types'
import { EmbeddedVideoCompanion } from './EmbeddedVideoCompanion'
import { extractVideoId } from '@/lib/utils'

export function CommandDeck() {
  const {
    videoUrl,
    setVideoUrl,
    config,
    setConfigMode,
    toggleModifier,
    customPromptEnabled,
    setCustomPromptEnabled,
    setCustomPrompt,
    status,
    activeDraft,
    qaHistory,
    isPlayerOpen,
    togglePlayer,
    seekToTimestamp,
    isFloatingPlayer,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()
  const [validationError, setValidationError] = useState<string | null>(null)
  const [qaInput, setQaInput] = useState('')

  const synthesizeMutation = useSynthesizeVideoMutation()
  const qaMutation = useVideoQAMutation()

  const isSynthesizing = status === 'PROCESSING' || synthesizeMutation.isPending

  const detectedVideoId = extractVideoId(videoUrl.trim())

  const modes: { id: SummaryMode; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'cheatsheet',
      label: 'Cheat-Sheet',
      desc: 'Ringkas & to-the-point',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'deepdive',
      label: 'Deep Dive',
      desc: 'Komprehensif & mental model',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    {
      id: 'code_action',
      label: 'Code & Action',
      desc: 'Sintaksis & checklist praktis',
      icon: <Code2 className="w-3.5 h-3.5" />,
    },
  ]

  const modifiers: {
    key: 'include_timestamps' | 'include_pitfalls' | 'include_code'
    label: string
    icon: React.ReactNode
  }[] = [
    {
      key: 'include_timestamps',
      label: 'Timestamp [MM:SS]',
      icon: <Clock className="w-3 h-3" />,
    },
    {
      key: 'include_pitfalls',
      label: 'Common Pitfalls',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    {
      key: 'include_code',
      label: 'Practical Snippets',
      icon: <Code2 className="w-3 h-3" />,
    },
  ]

  const handleSynthesize = (e: React.FormEvent) => {
    e.preventDefault()

    const parseResult = videoFormSchema.safeParse({ video_url: videoUrl })
    if (!parseResult.success) {
      setValidationError(parseResult.error.issues[0]?.message || 'URL YouTube tidak valid.')
      return
    }

    setValidationError(null)
    synthesizeMutation.mutate({
      video_url: videoUrl.trim(),
      config,
    })
  }

  const handleQASubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetVideoId = activeDraft?.video_id || detectedVideoId
    if (!qaInput.trim() || !targetVideoId || qaMutation.isPending) return

    qaMutation.mutate(
      {
        video_id: targetVideoId,
        question: qaInput.trim(),
      },
      {
        onSuccess: () => setQaInput(''),
      }
    )
  }

  return (
    <section
      className={`w-full lg:w-[390px] shrink-0 border-r flex flex-col h-full min-h-0 overflow-hidden select-none transition-colors ${
        isDark
          ? 'bg-[#141419] border-[#27272a] text-[#f4f4f5]'
          : 'bg-[#ffffff] border-[#e4e4e7] text-[#18181b]'
      }`}
    >
      {/* Top Header / Title */}
      <div className={`px-5 pt-5 pb-3 border-b ${isDark ? 'border-[#27272a]' : 'border-[#f4f4f5]'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
            Command Deck
          </span>
          {(detectedVideoId || activeDraft?.video_id) && (
            <button
              type="button"
              onClick={() => togglePlayer()}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                isPlayerOpen
                  ? isDark
                    ? 'bg-white text-black border-white'
                    : 'bg-[#17171c] text-white border-[#17171c]'
                  : isDark
                    ? 'bg-[#1f1f25] text-zinc-300 border-[#27272a] hover:bg-[#27272a]'
                    : 'bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7] hover:bg-[#eeece7]'
              }`}
              title={isPlayerOpen ? 'Sembunyikan Pemutar Video' : 'Tampilkan Pemutar Video'}
            >
              <Tv className="w-3 h-3" />
              <span>{isPlayerOpen ? 'Player Aktif' : 'Player'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Command Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24">
        {/* Omni-Input Spotlight Form */}
        <form onSubmit={handleSynthesize} className="space-y-2">
          <div className="relative flex items-center">
            <Search className={`w-4 h-4 absolute left-3.5 pointer-events-none ${isDark ? 'text-zinc-500' : 'text-[#71717a]'}`} />
            <input
              type="text"
              placeholder="Tempel URL YouTube atau ID video..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value)
                if (validationError) setValidationError(null)
              }}
              disabled={isSynthesizing}
              className={`w-full pl-9 pr-8 py-2.5 border rounded-xl text-xs focus:outline-none transition-all ${
                validationError
                  ? 'border-rose-400 focus:ring-1 focus:ring-rose-400'
                  : isDark
                    ? 'bg-[#1a1a20] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                    : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#17171c] focus:bg-[#ffffff]'
              }`}
            />
            {videoUrl && (
              <button
                type="button"
                onClick={() => setVideoUrl('')}
                className={`absolute right-2.5 p-1 rounded-md transition-colors ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-[#a1a1aa] hover:text-[#18181b]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {validationError && (
            <p className="text-[11px] text-rose-500 font-medium pl-1">{validationError}</p>
          )}
        </form>

        {/* Docked Embedded Video Player */}
        {!isFloatingPlayer && (
          <EmbeddedVideoCompanion
            videoId={activeDraft?.video_id || detectedVideoId}
            mode="docked"
          />
        )}

        {/* Mini Video Preview Card */}
        {detectedVideoId && (
          <div
            className={`border rounded-xl p-3 flex gap-3 items-center ${
              isDark ? 'bg-[#1a1a20] border-[#27272a]' : 'bg-[#f9f9fb] border-[#e4e4e7]'
            }`}
          >
            <div className="relative w-20 h-12 bg-black rounded-lg overflow-hidden shrink-0 shadow-xs">
              <img
                src={`https://img.youtube.com/vi/${detectedVideoId}/hqdefault.jpg`}
                alt="Thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                <span>ID: {detectedVideoId}</span>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${detectedVideoId}`}
                target="_blank"
                rel="noreferrer"
                className={`text-xs font-medium hover:underline flex items-center gap-1 mt-0.5 truncate ${
                  isDark ? 'text-blue-400' : 'text-[#18181b]'
                }`}
              >
                <span>Buka Video Asli</span>
                <ExternalLink className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-[#71717a]'}`} />
              </a>
            </div>
          </div>
        )}

        {/* Depth Directives (Pills) */}
        <div className="space-y-2">
          <div className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
            Depth Directives
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {modes.map((mode) => {
              const isSelected = config.mode === mode.id
              return (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => setConfigMode(mode.id)}
                  disabled={isSynthesizing}
                  className={`py-2 px-2.5 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                    isSelected
                      ? isDark
                        ? 'bg-white text-black shadow-xs font-semibold'
                        : 'bg-[#17171c] text-white shadow-xs'
                      : isDark
                        ? 'bg-transparent border border-[#27272a] text-zinc-400 hover:text-white hover:border-[#3f3f46]'
                        : 'bg-transparent border border-[#e4e4e7] text-[#52525b] hover:border-[#17171c] hover:text-[#18181b]'
                  }`}
                  title={mode.desc}
                >
                  {mode.icon}
                  <span className="truncate">{mode.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Modular Modifiers (Chips) */}
        <div className="space-y-2">
          <div className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
            Modular Modifiers
          </div>
          <div className="flex flex-wrap gap-1.5">
            {modifiers.map((mod) => {
              const isActive = config[mod.key]
              return (
                <button
                  type="button"
                  key={mod.key}
                  onClick={() => toggleModifier(mod.key)}
                  disabled={isSynthesizing}
                  className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isActive
                      ? isDark
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-[#17171c] text-white border-[#17171c]'
                      : isDark
                        ? 'bg-[#1a1a20] text-zinc-400 border-[#27272a] hover:text-white'
                        : 'bg-white text-[#71717a] border-[#e4e4e7] hover:text-[#18181b] hover:border-[#d4d4d8]'
                  }`}
                >
                  {mod.icon}
                  <span>{mod.label}</span>
                </button>
              )
            })}

            {/* Custom Prompt Toggle Pill */}
            <button
              type="button"
              onClick={() => setCustomPromptEnabled(!customPromptEnabled)}
              disabled={isSynthesizing}
              className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                customPromptEnabled
                  ? 'bg-[#ff7759] text-white border-[#ff7759]'
                  : isDark
                    ? 'bg-[#1a1a20] text-zinc-400 border-[#27272a] hover:text-[#ff7759]'
                    : 'bg-white text-[#71717a] border-[#e4e4e7] hover:text-[#ff7759] hover:border-[#ffad9b]'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Prompt Khusus...</span>
            </button>
          </div>

          {/* Expandable Custom Prompt Input */}
          {customPromptEnabled && (
            <div className="pt-1">
              <input
                type="text"
                placeholder="Tuliskan arahan tambahan (misal: fokus ke arsitektur microservices)..."
                value={config.custom_prompt || ''}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isSynthesizing}
                className={`w-full px-3 py-2 border rounded-lg text-xs placeholder-[#a1a1aa] focus:outline-none ${
                  isDark
                    ? 'bg-[#1a1a20] border-[#ff7759] text-white'
                    : 'bg-[#f9f9fb] border-[#ffad9b] text-[#18181b] focus:border-[#ff7759]'
                }`}
              />
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            type="button"
            onClick={handleSynthesize}
            disabled={isSynthesizing || !videoUrl.trim()}
            className={`w-full py-3 px-6 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
              isSynthesizing
                ? 'bg-[#71717a] text-white cursor-wait'
                : isDark
                  ? 'bg-white hover:bg-zinc-200 text-black font-semibold'
                  : 'bg-[#17171c] hover:bg-black text-white'
            }`}
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mensintesis Materi Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sintesis Materi (Review-First)</span>
              </>
            )}
          </button>
        </div>

        <hr className={isDark ? 'border-[#27272a]' : 'border-[#f4f4f5]'} />

        {/* Floating Ask & Jump Console */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              <MessageSquare className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-[#18181b]'}`} />
              <span>Ask & Jump Q&A</span>
            </div>
            {(activeDraft?.video_id || detectedVideoId) && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isDark ? 'bg-[#27272a] text-zinc-300' : 'bg-[#f4f4f5] text-[#52525b]'
                }`}
              >
                {activeDraft?.video_id || detectedVideoId}
              </span>
            )}
          </div>

          {/* Dialogue Balloons List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {qaHistory.length === 0 ? (
              <div
                className={`py-6 text-center text-xs border border-dashed rounded-xl px-4 ${
                  isDark
                    ? 'border-[#27272a] bg-[#1a1a20] text-zinc-500'
                    : 'border-[#e4e4e7] bg-[#f9f9fb] text-[#a1a1aa]'
                }`}
              >
                Tanyakan bagian tertentu dari materi (misal: "Bagian mana yang bahas rumus X?")
              </div>
            ) : (
              qaHistory.map((item) => (
                <div key={item.id} className="space-y-1.5 text-xs">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div
                      className={`px-3 py-2 rounded-2xl rounded-tr-xs max-w-[85%] text-xs ${
                        isDark ? 'bg-zinc-700 text-white' : 'bg-[#17171c] text-white'
                      }`}
                    >
                      {item.question}
                    </div>
                  </div>

                  {/* Agent Answer */}
                  <div className="flex justify-start">
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl rounded-tl-xs max-w-[90%] space-y-1 ${
                        isDark
                          ? 'bg-[#1f1f25] border border-[#27272a] text-zinc-200'
                          : 'bg-[#f4f4f5] border border-[#e4e4e7] text-[#18181b]'
                      }`}
                    >
                      <div className="prose prose-slate max-w-none text-xs leading-relaxed dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {item.answer}
                        </ReactMarkdown>
                      </div>
                      {item.timestamp_reference && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => seekToTimestamp(item.timestamp_reference!)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#003c33]/50 text-emerald-300 border border-emerald-500/40 hover:bg-[#003c33]/80 transition-colors cursor-pointer group/jump"
                            title="Lompat dan putar video tepat di detik ini"
                          >
                            <Play className="w-2.5 h-2.5 fill-current group-hover/jump:scale-110 transition-transform" />
                            <span>Jump {item.timestamp_reference}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ask Input Bar */}
          <form onSubmit={handleQASubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Tanyakan hal spesifik materi..."
              value={qaInput}
              onChange={(e) => setQaInput(e.target.value)}
              disabled={!(activeDraft?.video_id || detectedVideoId) || qaMutation.isPending}
              className={`w-full pl-3 pr-9 py-2 border rounded-xl text-xs transition-all disabled:opacity-50 focus:outline-none ${
                isDark
                  ? 'bg-[#1a1a20] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                  : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#17171c] focus:bg-white'
              }`}
            />
            <button
              type="submit"
              disabled={
                !qaInput.trim() ||
                !(activeDraft?.video_id || detectedVideoId) ||
                qaMutation.isPending
              }
              className={`absolute right-1.5 p-1.5 rounded-lg transition-opacity cursor-pointer disabled:opacity-40 ${
                isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-[#17171c] text-white hover:bg-black'
              }`}
            >
              {qaMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
