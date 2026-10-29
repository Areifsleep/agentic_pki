import React, { useState } from 'react'
import {
  X,
  Plus,
  Play,
  Zap,
  BookOpen,
  Code2,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useSynthesizeVideoMutation } from '../hooks/useVideoCuratorMutations'
import { useTheme } from '../hooks/useTheme'
import { videoFormSchema, type SummaryMode } from '../types'

export function AddUrlModal() {
  const {
    isAddUrlOpen,
    setIsAddUrlOpen,
    videoUrl,
    setVideoUrl,
    config,
    setConfigMode,
    toggleModifier,
    customPromptEnabled,
    setCustomPromptEnabled,
    setCustomPrompt,
    status,
    setActiveStage,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()

  const [inputUrl, setInputUrl] = useState(videoUrl)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const synthesizeMutation = useSynthesizeVideoMutation()
  const isSynthesizing = status === 'PROCESSING' || synthesizeMutation.isPending

  if (!isAddUrlOpen) return null

  const handleClose = () => {
    if (!isSynthesizing) {
      setIsAddUrlOpen(false)
      setErrorMsg(null)
    }
  }

  const handleSynthesize = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const parseResult = videoFormSchema.safeParse({ video_url: inputUrl.trim() })
    if (!parseResult.success) {
      setErrorMsg(parseResult.error.issues[0]?.message || 'URL YouTube tidak valid.')
      return
    }

    setVideoUrl(inputUrl.trim())
    setIsAddUrlOpen(false)
    setActiveStage('curate')

    synthesizeMutation.mutate({
      video_url: inputUrl.trim(),
      config,
    })
  }

  const handleStudyAndPlay = () => {
    const parseResult = videoFormSchema.safeParse({ video_url: inputUrl.trim() })
    if (!parseResult.success) {
      setErrorMsg(parseResult.error.issues[0]?.message || 'URL YouTube tidak valid.')
      return
    }

    setVideoUrl(inputUrl.trim())
    setIsAddUrlOpen(false)
    setActiveStage('curate')
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`rounded-2xl max-w-lg w-full border shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isDark
            ? 'bg-[#17171c] border-[#27272a] text-[#f4f4f5]'
            : 'bg-white border-[#e4e4e7] text-[#18181b]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isDark ? 'bg-white text-black' : 'bg-[#17171c] text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                Tambah & Sintesis Video YouTube
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Ekstraksi otomatis transkrip, arsitektur, dan ringkasan AI
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSynthesizing}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSynthesize} className="p-6 space-y-5">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-[#18181b]'}`}>
              URL Video YouTube
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value)
                setErrorMsg(null)
              }}
              placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all focus:outline-none ${
                isDark
                  ? 'bg-[#121216] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                  : 'bg-white border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#17171c] focus:ring-1 focus:ring-[#17171c]'
              }`}
            />
            {errorMsg && (
              <p className="text-[11px] text-rose-500 font-medium">{errorMsg}</p>
            )}
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-[#18181b]'}`}>
              Format Sintesis
            </label>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setConfigMode(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    config.mode === m.id
                      ? isDark
                        ? 'bg-white text-black border-white shadow-xs font-semibold'
                        : 'bg-[#17171c] text-white border-[#17171c]'
                      : isDark
                        ? 'bg-[#121216] border-[#27272a] text-zinc-300 hover:bg-[#1a1a20]'
                        : 'bg-white border-[#e4e4e7] text-[#18181b] hover:bg-[#f9f9fb]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-medium text-xs">
                    {m.icon}
                    <span>{m.label}</span>
                  </div>
                  <p
                    className={`text-[10px] leading-tight line-clamp-1 ${
                      config.mode === m.id
                        ? isDark
                          ? 'text-zinc-700'
                          : 'text-[#a1a1aa]'
                        : isDark
                          ? 'text-zinc-500'
                          : 'text-[#71717a]'
                    }`}
                  >
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Modifiers */}
          <div className="space-y-1.5">
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-[#18181b]'}`}>
              Struktur Tambahan
            </label>
            <div className="flex flex-wrap gap-2">
              {modifiers.map((mod) => (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => toggleModifier(mod.key)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    config[mod.key]
                      ? isDark
                        ? 'bg-[#003c33]/50 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#edfce9] border-[#c6f6d5] text-[#003c33]'
                      : isDark
                        ? 'bg-[#121216] border-[#27272a] text-zinc-400 hover:text-white'
                        : 'bg-[#f4f4f5] border-transparent text-[#71717a] hover:bg-[#e4e4e7]'
                  }`}
                >
                  {mod.icon}
                  <span>{mod.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instruction Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-[#18181b]'}`}>
                Instruksi Khusus (Opsional)
              </label>
              <button
                type="button"
                onClick={() => setCustomPromptEnabled(!customPromptEnabled)}
                className={`text-[11px] underline cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-[#71717a] hover:text-[#18181b]'
                }`}
              >
                {customPromptEnabled ? 'Sembunyikan' : '+ Tambah'}
              </button>
            </div>
            {customPromptEnabled && (
              <textarea
                value={config.custom_prompt || ''}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="Misal: 'Fokus pada implementasi database pool dan error handling asyncio'..."
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#121216] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                    : 'bg-white border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:border-[#17171c]'
                }`}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div
            className={`pt-2 flex items-center justify-between gap-3 border-t ${
              isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'
            }`}
          >
            <button
              type="button"
              onClick={handleStudyAndPlay}
              className={`px-4 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#27272a] text-zinc-300 hover:bg-[#27272a]'
                  : 'border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5]'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isDark ? 'fill-zinc-300' : 'fill-[#18181b]'}`} />
              <span>Buka Player Saja</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSynthesizing}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-[#71717a] hover:text-[#18181b]'
                }`}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSynthesizing || !inputUrl.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm ${
                  isDark
                    ? 'bg-white hover:bg-zinc-200 text-black font-semibold'
                    : 'bg-[#17171c] hover:bg-black text-white'
                }`}
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mensintesis...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sintesis Materi Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
