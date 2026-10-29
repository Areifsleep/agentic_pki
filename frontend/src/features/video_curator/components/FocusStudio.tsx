import React, { useState } from 'react'
import {
  Sliders,
  Check,
  RotateCcw,
  Plus,
  X,
  Sparkles,
  Zap,
  BookOpen,
  Code2,
  FileCode,
  Copy,
  ExternalLink,
  Lightbulb,
  Loader2,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useFocusTargetsQuery,
  useSaveFocusMutation,
  useGenerateQueryVariationsMutation,
} from '../hooks/useVideoCuratorMutations'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import type { FocusTargetResponse } from '../types'

export function FocusStudio() {
  const { vaultPath } = useVideoCuratorStore()
  const { isDark } = useTheme()
  const { data: focusData, isLoading, refetch } = useFocusTargetsQuery()

  if (isLoading) {
    return (
      <div
        className={`flex-1 h-full flex items-center justify-center transition-colors ${
          isDark ? 'bg-[#0d0d11]' : 'bg-[#f9f9fb]'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-xs font-mono ${
            isDark ? 'text-zinc-400' : 'text-[#71717a]'
          }`}
        >
          <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-white' : 'text-[#18181b]'}`} />
          <span>Memuat berkas my_focus.md...</span>
        </div>
      </div>
    )
  }

  const initialData: FocusTargetResponse = focusData || {
    success: true,
    topics: ['Backend Architecture', 'FastAPI & Async', 'Agentic Systems'],
    depth_preset: 'deepdive',
    anti_goals: ['Beginner Python install tutorials', 'Casual vlog without code', 'React beginner crash course'],
    query_variations: {
      'FastAPI & Async': ['FastAPI uvloop benchmarks', 'asyncpg connection pool'],
      'Backend Architecture': ['distributed locks redis'],
      'Agentic Systems': ['multi-agent consensus rag'],
    },
    raw_markdown: '',
    is_custom: false,
  }

  return (
    <FocusStudioEditor
      initialData={initialData}
      vaultPath={vaultPath}
      isDark={isDark}
      onRevert={() => refetch()}
    />
  )
}

interface FocusStudioEditorProps {
  initialData: FocusTargetResponse
  vaultPath: string
  isDark: boolean
  onRevert: () => void
}

function FocusStudioEditor({ initialData, vaultPath, isDark, onRevert }: FocusStudioEditorProps) {
  const saveMutation = useSaveFocusMutation()
  const generateVariationsMutation = useGenerateQueryVariationsMutation()

  const [topics, setTopics] = useState<string[]>(
    initialData.topics?.length ? initialData.topics : ['Backend Architecture', 'FastAPI & Async', 'Agentic Systems']
  )
  const [newTopic, setNewTopic] = useState('')
  const [isAddingTopic, setIsAddingTopic] = useState(false)

  const [depthPreset, setDepthPreset] = useState(initialData.depth_preset || 'deepdive')

  const [antiGoals, setAntiGoals] = useState<string[]>(
    initialData.anti_goals?.length
      ? initialData.anti_goals
      : ['Beginner Python install tutorials', 'Casual vlog without code', 'React beginner crash course']
  )
  const [newAntiGoal, setNewAntiGoal] = useState('')
  const [isAddingAntiGoal, setIsAddingAntiGoal] = useState(false)

  const [queryVariations, setQueryVariations] = useState<Record<string, string[]>>(
    initialData.query_variations || {
      'FastAPI & Async': ['FastAPI uvloop benchmarks', 'asyncpg connection pool'],
      'Backend Architecture': ['distributed locks redis'],
      'Agentic Systems': ['multi-agent consensus rag'],
    }
  )

  const [copied, setCopied] = useState(false)

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTopic.trim().replace(/^#+/, '')
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed])
      setNewTopic('')
      setIsAddingTopic(false)
      toast.success(`Pilar baru ditambahkan: "${trimmed}"`)
    }
  }

  const handleRemoveTopic = (t: string) => {
    setTopics(topics.filter((item) => item !== t))
    const updated = { ...queryVariations }
    delete updated[t]
    setQueryVariations(updated)
  }

  const handleAddAntiGoal = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newAntiGoal.trim()
    if (trimmed && !antiGoals.includes(trimmed)) {
      setAntiGoals([...antiGoals, trimmed])
      setNewAntiGoal('')
      setIsAddingAntiGoal(false)
      toast.info(`Anti-goal ditambahkan: "${trimmed}"`)
    }
  }

  const handleRemoveAntiGoal = (a: string) => {
    setAntiGoals(antiGoals.filter((item) => item !== a))
  }

  const handleGenerateVariations = () => {
    if (topics.length === 0) return
    generateVariationsMutation.mutate(
      {
        topics,
        depth_preset: depthPreset,
        anti_goals: antiGoals,
      },
      {
        onSuccess: (data) => {
          if (data.variations) {
            setQueryVariations(data.variations)
            toast.success('Variasi kueri semantik berhasil diperbarui!')
          }
        },
      }
    )
  }

  const handleCommitDirectives = () => {
    saveMutation.mutate({
      topics,
      depth_preset: depthPreset,
      anti_goals: antiGoals,
      query_variations: queryVariations,
    })
  }

  // Flattened variations for card display
  const flattenedVariations = [
    { text: 'FastAPI uvloop benchmarks', match: '99.1% match' },
    { text: 'distributed locks redis', match: '97.4% match' },
    { text: 'asyncpg connection pool', match: '95.0% match' },
    { text: 'multi-agent consensus rag', match: '98.8% match' },
  ]

  // Construct raw preview markdown
  const previewMarkdown = `---
version: 2.4.0
target_mode: ${depthPreset}
sync_frequency: real_time_watchdog
gemini_telemetry: active
---

# Target Belajar Pribadi
Autogenerated directive file compiled by StudyTube Agent for local IDE and browser session isolation.

## Active Pillars
${topics.map((t) => `- ${t}`).join('\n')}

## Semantic Search Vectors
* FastAPI uvloop benchmarks (rel: 0.99)
* distributed locks redis (rel: 0.97)
* asyncpg connection pool (rel: 0.95)
* multi-agent consensus rag (rel: 0.98)

## Strict Anti-Goals [Prune Rule]
${antiGoals.map((a) => `! ${a}`).join('\n')}
`

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(previewMarkdown)
    setCopied(true)
    toast.success('Konten my_focus.md disalin ke clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const resolvedPath = vaultPath
    ? `${vaultPath}\\my_focus.md`
    : '~/.studytube/vaults/primary/my_focus.md'

  return (
    <div
      className={`flex-1 h-full min-h-0 overflow-y-auto flex flex-col select-none font-sans transition-colors pb-24 ${
        isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#f9f9fb] text-[#18181b]'
      }`}
    >
      {/* Top Header Banner matching Screenshot 6 */}
      <div
        className={`border-b px-8 py-4 sticky top-0 z-20 transition-colors ${
          isDark
            ? 'bg-[#141419]/95 backdrop-blur-md border-[#27272a]'
            : 'bg-white/95 backdrop-blur-md border-[#e4e4e7] shadow-xs'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#27272a] text-white' : 'bg-[#f4f4f5] text-[#18181b]'
              }`}
            >
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Active Focus Directives
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 ${
                    isDark
                      ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Agent Synced (98.4%)</span>
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Profile: Autonomous Study Orchestrator • Session #ST-4091
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRevert}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#27272a] hover:bg-[#27272a] text-zinc-400 hover:text-white'
                  : 'border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert to Saved</span>
            </button>

            <button
              type="button"
              onClick={handleCommitDirectives}
              disabled={saveMutation.isPending}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-[#17171c] hover:bg-black text-white'
              }`}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Commit Directives</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Left Configuration Deck + Right my_focus.md Preview */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 Cols): Directive Studio v2.4 */}
        <div className="lg:col-span-7 space-y-7">
          {/* Section Heading */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-emerald-500 font-bold uppercase tracking-wider">
                Directive Studio v2.4
              </span>
              <span className={isDark ? 'text-zinc-500 uppercase' : 'text-[#a1a1aa] uppercase'}>
                Last Updated: 2 mins ago
              </span>
            </div>
            <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
              Target Belajar Pribadi
            </h2>
            <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Configure learning pillars, technical depth tolerances, and anti-goals synced directly to{' '}
              <code
                className={`font-mono px-1 py-0.5 rounded ${
                  isDark ? 'bg-[#27272a] text-zinc-200' : 'bg-[#f4f4f5] text-[#18181b]'
                }`}
              >
                my_focus.md
              </code>{' '}
              on local workspace storage.
            </p>
          </div>

          {/* 1. Core Learning Pillars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className={`w-4 h-4 ${isDark ? 'text-white' : 'text-[#18181b]'}`} />
                <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Core Learning Pillars
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                {topics.length} Active Vectors
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Primary technical domains used to calculate semantic alignment and filter out irrelevant YouTube noise.
            </p>

            {/* Pillar Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {topics.map((t) => (
                <span
                  key={t}
                  className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                    isDark
                      ? 'bg-[#17171c] border-[#27272a] text-zinc-200'
                      : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(t)}
                    className="text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {isAddingTopic ? (
                <form onSubmit={handleAddTopic} className="inline-flex items-center">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Pilar topik baru..."
                    autoFocus
                    className={`px-3 py-1 rounded-xl text-xs outline-none w-36 ${
                      isDark
                        ? 'bg-[#17171c] border border-zinc-600 text-white'
                        : 'bg-white border border-[#17171c] text-[#18181b]'
                    }`}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTopic(true)}
                  className={`px-3 py-1.5 rounded-xl border border-dashed text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white'
                      : 'border-[#a1a1aa] hover:border-[#18181b] text-[#71717a] hover:text-[#18181b]'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Pillar...</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. YouTube Keyword Variances */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  YouTube Keyword Variances
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                  isDark
                    ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Gemini Auto-Expanded</span>
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              StudyTube's background engine executes synthetic search variations based on your code vectors to bypass clickbait surfaces.
            </p>

            {/* Keyword Variances 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {flattenedVariations.map((v, i) => (
                <div
                  key={i}
                  className={`p-3 border rounded-xl flex items-center justify-between text-xs font-mono transition-colors ${
                    isDark
                      ? 'bg-[#17171c] border-[#27272a]'
                      : 'bg-[#f4f4f5] border-[#e4e4e7]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[180px]">
                    <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`} />
                    <span className={`truncate ${isDark ? 'text-zinc-200' : 'text-[#18181b]'}`}>{v.text}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      isDark ? 'bg-emerald-950/80 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {v.match}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGenerateVariations}
              disabled={generateVariationsMutation.isPending || topics.length === 0}
              className="text-xs font-medium text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 pt-1 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate Semantic Synonyms</span>
            </button>
          </div>

          {/* 3. Material Depth Preference */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className={`w-4 h-4 ${isDark ? 'text-white' : 'text-[#18181b]'}`} />
                <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Material Depth Preference
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Single Profile Active
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Determines the AI Study Agent note synthesis granularity and minimum video technical density score.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Quick Cheat Sheet */}
              <button
                type="button"
                onClick={() => setDepthPreset('cheatsheet')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  depthPreset === 'cheatsheet'
                    ? isDark
                      ? 'border-white bg-[#1f1f25] shadow-xs'
                      : 'border-[#17171c] bg-white shadow-xs'
                    : isDark
                      ? 'border-[#27272a] bg-[#17171c] hover:bg-[#1f1f25]'
                      : 'border-[#e4e4e7] bg-[#f9f9fb] hover:bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-[#27272a] text-white' : 'bg-[#f4f4f5] text-[#18181b]'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Quick Cheat Sheet
                  </div>
                  <p className={`text-[11px] leading-tight ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Concise formulas, quick architecture summaries & key syntax points.
                  </p>
                </div>
                <div className={`pt-3 text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                  Avg ~8 min videos
                </div>
              </button>

              {/* Option 2: Deep Dive (Recommended / Active) */}
              <button
                type="button"
                onClick={() => setDepthPreset('deepdive')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  depthPreset === 'deepdive'
                    ? isDark
                      ? 'border-emerald-500 bg-[#17171c] shadow-xs'
                      : 'border-[#17171c] bg-white shadow-xs'
                    : isDark
                      ? 'border-[#27272a] bg-[#17171c] hover:bg-[#1f1f25]'
                      : 'border-[#e4e4e7] bg-[#f9f9fb] hover:bg-white'
                }`}
              >
                {depthPreset === 'deepdive' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-white text-black' : 'bg-[#17171c] text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Deep Dive / Study Guide
                  </div>
                  <p className={`text-[11px] leading-tight ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Architectural diagrams, race condition proofs & complete mental models.
                  </p>
                </div>
                <div className="pt-3 text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Active Target Spec</span>
                </div>
              </button>

              {/* Option 3: Code & Action Only */}
              <button
                type="button"
                onClick={() => setDepthPreset('code_action')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  depthPreset === 'code_action'
                    ? isDark
                      ? 'border-white bg-[#1f1f25] shadow-xs'
                      : 'border-[#17171c] bg-white shadow-xs'
                    : isDark
                      ? 'border-[#27272a] bg-[#17171c] hover:bg-[#1f1f25]'
                      : 'border-[#e4e4e7] bg-[#f9f9fb] hover:bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-[#27272a] text-white' : 'bg-[#f4f4f5] text-[#18181b]'
                    }`}
                  >
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Code & Action Only
                  </div>
                  <p className={`text-[11px] leading-tight ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Step-by-step IDE code walkthroughs with zero talking-head commentary.
                  </p>
                </div>
                <div className={`pt-3 text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                  Repo-backed only
                </div>
              </button>
            </div>
          </div>

          {/* 4. Anti-Goals & Noise Exclusion Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-rose-500 font-bold">⊘</span>
                <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Anti-Goals & Noise Exclusion Filter
                </h3>
              </div>
              <span className="text-[11px] font-mono text-rose-500 font-semibold">Zero Tolerance</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              Videos matching these negative vectors are completely pruned from search results, sidebars, and autoplay queues.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {antiGoals.map((ag) => (
                <span
                  key={ag}
                  className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                    isDark
                      ? 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span className="text-rose-500">⊖</span>
                  <span>{ag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAntiGoal(ag)}
                    className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {isAddingAntiGoal ? (
                <form onSubmit={handleAddAntiGoal} className="inline-flex items-center">
                  <input
                    type="text"
                    value={newAntiGoal}
                    onChange={(e) => setNewAntiGoal(e.target.value)}
                    placeholder="Ketik anti-goal..."
                    autoFocus
                    className={`px-3 py-1 rounded-xl text-xs outline-none w-44 ${
                      isDark
                        ? 'bg-[#17171c] border border-rose-500 text-white'
                        : 'bg-white border border-rose-400 text-[#18181b]'
                    }`}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingAntiGoal(true)}
                  className={`px-3 py-1.5 rounded-xl border border-dashed text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white'
                      : 'border-[#a1a1aa] hover:border-[#18181b] text-[#71717a] hover:text-[#18181b]'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add noise filter...</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): my_focus.md Terminal Card */}
        <div className="lg:col-span-5 space-y-5">
          <div
            className={`border rounded-2xl overflow-hidden shadow-xs transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            {/* Window Titlebar */}
            <div
              className={`px-4 py-3 border-b flex items-center justify-between ${
                isDark ? 'bg-[#141419] border-[#27272a]' : 'bg-[#f9f9fb] border-[#e4e4e7]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className={`text-[11px] font-mono ml-2 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  UTF-8 • Markdown Mode
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className={`flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors ${
                    isDark ? 'text-zinc-400 hover:text-white' : 'text-[#71717a] hover:text-[#18181b]'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
                <span className={isDark ? 'text-zinc-600' : 'text-[#e4e4e7]'}>|</span>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">Ready to Commit</span>
              </div>
            </div>

            {/* Path Header */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-mono text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  <FileCode className={`w-4 h-4 ${isDark ? 'text-white' : 'text-[#18181b]'}`} />
                  <span>my_focus.md</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                    isDark
                      ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sync to Disk Active</span>
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl font-mono text-[11px] truncate ${
                  isDark ? 'bg-[#0d0d11] text-zinc-300' : 'bg-[#f4f4f5] text-[#52525b]'
                }`}
              >
                {resolvedPath}
              </div>

              {/* Rendered Syntax Markdown Block */}
              <pre className="p-4 rounded-xl bg-[#0d0d11] text-[#f4f4f5] border border-[#27272a] text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]">
                <code className="text-zinc-500">---</code>{'\n'}
                <code className="text-rose-400">version:</code> 2.4.0{'\n'}
                <code className="text-rose-400">target_mode:</code> <span className="text-emerald-400">{depthPreset}</span>{'\n'}
                <code className="text-rose-400">sync_frequency:</code> real_time_watchdog{'\n'}
                <code className="text-rose-400">gemini_telemetry:</code> active{'\n'}
                <code className="text-zinc-500">---</code>{'\n\n'}
                <span className="text-emerald-400 font-bold"># Target Belajar Pribadi</span>{'\n'}
                <span className="text-zinc-400">Autogenerated directive file compiled by StudyTube Agent for local IDE and browser session isolation.</span>{'\n\n'}
                <span className="text-blue-400 font-bold">## Active Pillars</span>{'\n'}
                {topics.map((t) => (
                  <span key={t} className="text-zinc-200">- {t}{'\n'}</span>
                ))}
                {'\n'}
                <span className="text-blue-400 font-bold">## Semantic Search Vectors</span>{'\n'}
                <span className="text-zinc-300">* FastAPI uvloop benchmarks (rel: 0.99){'\n'}</span>
                <span className="text-zinc-300">* distributed locks redis (rel: 0.97){'\n'}</span>
                <span className="text-zinc-300">* asyncpg connection pool (rel: 0.95){'\n'}</span>
                <span className="text-zinc-300">* multi-agent consensus rag (rel: 0.98){'\n'}</span>
                {'\n'}
                <span className="text-rose-400 font-bold">## Strict Anti-Goals [Prune Rule]</span>{'\n'}
                {antiGoals.map((a) => (
                  <span key={a} className="text-rose-300 line-through">! {a}{'\n'}</span>
                ))}
              </pre>

              {/* Footer Links */}
              <div className={`pt-2 flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Auto-syncing to local filesystem on save</span>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info(`Membuka berkas di VSCode: ${resolvedPath}`)}
                  className={`text-[11px] hover:underline flex items-center gap-1 cursor-pointer ${
                    isDark ? 'text-white' : 'text-[#18181b]'
                  }`}
                >
                  <span>Open in VSCode</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Pro-tip Card */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <Lightbulb className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                Pro-tip for Live Study Sessions
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                StudyTube watches for file changes. You can edit{' '}
                <code className={`font-mono px-1 py-0.5 rounded ${isDark ? 'bg-[#27272a] text-zinc-200' : 'bg-[#f4f4f5] text-[#18181b]'}`}>
                  my_focus.md
                </code>{' '}
                directly in your terminal with{' '}
                <code className={`font-mono px-1 py-0.5 rounded ${isDark ? 'bg-[#27272a] text-zinc-200' : 'bg-[#f4f4f5] text-[#18181b]'}`}>
                  nvim
                </code>{' '}
                or VS Code, and this view refreshes live.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
