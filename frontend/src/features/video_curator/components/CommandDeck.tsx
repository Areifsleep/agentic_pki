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
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import {
  useSynthesizeVideoMutation,
  useVideoQAMutation,
} from '../hooks/useVideoCuratorMutations'
import { videoFormSchema, type SummaryMode } from '../types'

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
  } = useVideoCuratorStore()

  const [validationError, setValidationError] = useState<string | null>(null)
  const [qaInput, setQaInput] = useState('')

  const synthesizeMutation = useSynthesizeVideoMutation()
  const qaMutation = useVideoQAMutation()

  const isSynthesizing = status === 'PROCESSING' || synthesizeMutation.isPending

  // Extract YouTube ID if valid
  const extractVideoId = (url: string): string | null => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})|^[a-zA-Z0-9_-]{11}$/
    )
    return match ? match[1] : null
  }

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
    <section className="w-full lg:w-[390px] shrink-0 border-r border-[#e4e4e7] bg-[#ffffff] flex flex-col h-screen overflow-hidden select-none">
      {/* Top Header / Title */}
      <div className="px-5 pt-5 pb-3 border-b border-[#f4f4f5]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
            Command Deck
          </span>
          {/* <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#edfce9] text-[#003c33] font-medium border border-[#b2e5aa]">
            Level 2 Agent
          </span> */}
        </div>
      </div>

      {/* Scrollable Command Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Omni-Input Spotlight Form */}
        <form onSubmit={handleSynthesize} className="space-y-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Tempel URL YouTube atau ID video..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value)
                if (validationError) setValidationError(null)
              }}
              disabled={isSynthesizing}
              className={`w-full pl-9 pr-8 py-2.5 bg-[#f9f9fb] border rounded-xl text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none transition-all ${
                validationError
                  ? 'border-rose-400 focus:ring-1 focus:ring-rose-400'
                  : 'border-[#e4e4e7] focus:border-[#17171c] focus:bg-[#ffffff]'
              }`}
            />
            {videoUrl && (
              <button
                type="button"
                onClick={() => setVideoUrl('')}
                className="absolute right-2.5 p-1 rounded-md text-[#a1a1aa] hover:text-[#18181b] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {validationError && (
            <p className="text-[11px] text-rose-500 font-medium pl-1">{validationError}</p>
          )}
        </form>

        {/* Mini Video Preview Card */}
        {detectedVideoId && (
          <div className="border border-[#e4e4e7] bg-[#f9f9fb] rounded-xl p-3 flex gap-3 items-center">
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
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#71717a]">
                <span>ID: {detectedVideoId}</span>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${detectedVideoId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#18181b] hover:underline flex items-center gap-1 mt-0.5 truncate"
              >
                <span>Buka Video Asli</span>
                <ExternalLink className="w-3 h-3 text-[#71717a]" />
              </a>
            </div>
          </div>
        )}

        {/* Depth Directives (Pills) */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
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
                      ? 'bg-[#17171c] text-white shadow-xs'
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
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
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
                      ? 'bg-[#17171c] text-white border-[#17171c]'
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
                className="w-full px-3 py-2 bg-[#f9f9fb] border border-[#ffad9b] rounded-lg text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#ff7759]"
              />
            </div>
          )}
        </div>

        {/* Primary Action Button (Near-Black Pill CTA) */}
        <div>
          <button
            type="button"
            onClick={handleSynthesize}
            disabled={isSynthesizing || !videoUrl.trim()}
            className={`w-full py-3 px-6 rounded-full font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
              isSynthesizing
                ? 'bg-[#71717a] text-white cursor-wait'
                : 'bg-[#17171c] hover:bg-black active:scale-[0.99] text-white'
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

        <hr className="border-[#f4f4f5]" />

        {/* Floating Ask & Jump Console */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
              <MessageSquare className="w-3.5 h-3.5 text-[#18181b]" />
              <span>Ask & Jump Q&A</span>
            </div>
            {(activeDraft?.video_id || detectedVideoId) && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f4f4f5] text-[#52525b]">
                {activeDraft?.video_id || detectedVideoId}
              </span>
            )}
          </div>

          {/* Dialogue Balloons List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {qaHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#a1a1aa] border border-dashed border-[#e4e4e7] rounded-xl bg-[#f9f9fb] px-4">
                Tanyakan bagian tertentu dari materi (misal: &quot;Bagian mana yang bahas rumus X?&quot;)
              </div>
            ) : (
              qaHistory.map((item) => (
                <div key={item.id} className="space-y-1.5 text-xs">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="bg-[#17171c] text-white px-3 py-2 rounded-2xl rounded-tr-xs max-w-[85%] text-xs">
                      {item.question}
                    </div>
                  </div>

                  {/* Agent Answer */}
                  <div className="flex justify-start">
                    <div className="bg-[#f4f4f5] border border-[#e4e4e7] text-[#18181b] px-3.5 py-2.5 rounded-2xl rounded-tl-xs max-w-[90%] space-y-1">
                      <div className="prose prose-slate max-w-none text-xs leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-code:font-mono prose-code:text-[#17171c] prose-code:bg-white prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {item.answer}
                        </ReactMarkdown>
                      </div>
                      {item.timestamp_reference && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#edfce9] text-[#003c33] border border-[#b2e5aa]">
                            <Clock className="w-2.5 h-2.5" />
                            Jump: {item.timestamp_reference}
                          </span>
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
              className="w-full pl-3 pr-9 py-2 bg-[#f9f9fb] border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#17171c] focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                !qaInput.trim() ||
                !(activeDraft?.video_id || detectedVideoId) ||
                qaMutation.isPending
              }
              className="absolute right-1.5 p-1.5 bg-[#17171c] text-white rounded-lg hover:bg-black disabled:opacity-40 transition-opacity cursor-pointer"
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
