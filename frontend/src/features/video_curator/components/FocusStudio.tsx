import React, { useState } from 'react'
import {
  Target,
  Plus,
  X,
  FolderSync,
  Layers,
  ShieldAlert,
  Loader2,
  FileCode,
  Sparkles,
  BookOpen,
  Zap,
  Code2,
  RefreshCw,
} from 'lucide-react'
import {
  useFocusTargetsQuery,
  useSaveFocusMutation,
  useGenerateQueryVariationsMutation,
} from '../hooks/useVideoCuratorMutations'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import type { FocusTargetResponse } from '../types'

interface FocusStudioEditorProps {
  initialData: FocusTargetResponse
  vaultPath: string
}

function FocusStudioEditor({ initialData, vaultPath }: FocusStudioEditorProps) {
  const saveMutation = useSaveFocusMutation()
  const generateVariationsMutation = useGenerateQueryVariationsMutation()

  const [topics, setTopics] = useState<string[]>(initialData.topics || [])
  const [newTopic, setNewTopic] = useState('')
  const [depthPreset, setDepthPreset] = useState(initialData.depth_preset || 'deepdive')
  const [antiGoals, setAntiGoals] = useState<string[]>(initialData.anti_goals || [])
  const [newAntiGoal, setNewAntiGoal] = useState('')
  const [queryVariations, setQueryVariations] = useState<Record<string, string[]>>(
    initialData.query_variations || {}
  )

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTopic.trim().replace(/^#+/, '')
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed])
      setNewTopic('')
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
          }
        },
      }
    )
  }

  const handleSaveToVault = () => {
    saveMutation.mutate({
      topics,
      depth_preset: depthPreset,
      anti_goals: antiGoals,
      query_variations: queryVariations,
    })
  }

  // Generate live preview markdown
  const variationsMarkdown =
    Object.keys(queryVariations).length > 0
      ? `\n\n## Variasi Kueri Eksplorasi\n` +
        Object.entries(queryVariations)
          .map(([top, list]) => `### ${top}\n${list.map((v) => `- ${v}`).join('\n')}`)
          .join('\n\n')
      : ''

  const previewMarkdown = `# Target Belajar & Panduan Kurasi (My Focus)

> Berkas ini menjadi acuan agen dalam mengevaluasi relevansi video (Learning Radar) dan sintesis materi.

## Pilar Topik Utama
${topics.map((t) => `- #${t}`).join('\n') || '- #General Knowledge'}

## Preferensi Kedalaman
- ${depthPreset}

## Anti-Goals (Hal yang Dihindari)
${antiGoals.map((a) => `- ${a}`).join('\n') || '- Video bertele-tele tanpa substansi'}${variationsMarkdown}
`

  const depthOptions = [
    {
      id: 'cheatsheet',
      label: 'Quick Cheat-Sheet',
      desc: 'Ringkas, takeaway kunci & to-the-point',
      icon: <Zap className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'deepdive',
      label: 'Deep Dive / Study Guide',
      desc: 'Komprehensif, arsitektur & mental model',
      icon: <BookOpen className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'code_action',
      label: 'Code & Action Only',
      desc: 'Sintaksis teknis, terminal & checklist aksi',
      icon: <Code2 className="w-4 h-4 text-emerald-600" />,
    },
  ]

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden bg-[#ffffff]">
      {/* Left Configuration Deck */}
      <div className="w-full lg:w-[500px] shrink-0 border-r border-[#e4e4e7] p-8 flex flex-col h-full overflow-y-auto space-y-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#71717a] mb-1">
            <Target className="w-3.5 h-3.5 text-[#18181b]" />
            <span>Focus Studio</span>
          </div>
          <h2 className="text-2xl font-normal text-[#17171c] tracking-tight">
            Target Belajar Pribadi
          </h2>
          <p className="text-xs text-[#71717a] mt-1 leading-relaxed">
            Atur pilar minat dan batasan materi. Konfigurasi ini langsung disinkronkan ke berkas fisik{' '}
            <code className="text-[#17171c] font-mono bg-[#f4f4f5] px-1 py-0.5 rounded">my_focus.md</code>{' '}
            dan dijadikan acuan semantik oleh agen.
          </p>
        </div>

        {/* 1. Pilar Topik Utama */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#18181b] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#1863dc]" />
              <span>Pilar Topik Utama (Pill Chips)</span>
            </label>
            <span className="text-[10px] text-[#a1a1aa] font-mono">{topics.length} pilar</span>
          </div>

          {/* Chips list */}
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 bg-[#f4f4f5] border border-[#e4e4e7] text-[#18181b] px-3 py-1 rounded-full text-xs font-medium font-mono"
              >
                <span>#{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(t)}
                  className="hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add topic input */}
          <form onSubmit={handleAddTopic} className="relative flex items-center">
            <input
              type="text"
              placeholder="Ketik nama pilar baru lalu tekan Enter..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#f9f9fb] border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#17171c] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!newTopic.trim()}
              className="absolute right-1.5 p-1.5 bg-[#17171c] text-white rounded-lg hover:bg-black disabled:opacity-40 transition-opacity cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Variasi Kueri Eksplorasi (AI Pre-Computed) */}
        <div className="space-y-3 p-4 bg-[#f9f9fb] border border-[#e4e4e7] rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181b]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Variasi Kueri YouTube (0 Token saat Cari)</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateVariations}
              disabled={generateVariationsMutation.isPending || topics.length === 0}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#e4e4e7] hover:border-[#17171c] text-[10px] font-medium text-[#18181b] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              {generateVariationsMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Meracik AI...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>{Object.keys(queryVariations).length > 0 ? 'Racik Ulang' : 'Generate AI'}</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#71717a] leading-relaxed">
            Dihasilkan sekali saja menggunakan Gemini saat target disimpan, lalu digunakan oleh Radar secara instan tanpa latensi berantai.
          </p>

          {Object.keys(queryVariations).length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {Object.entries(queryVariations).map(([pillar, varList]) => (
                <div key={pillar} className="text-[11px] space-y-1">
                  <span className="font-semibold text-[#18181b] font-mono">#{pillar}:</span>
                  <ul className="list-disc list-inside text-[#52525b] space-y-0.5 pl-1">
                    {varList.map((v, idx) => (
                      <li key={idx} className="truncate">{v}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-[#a1a1aa] italic">
              Klik &quot;Generate AI&quot; untuk menghasilkan variasi kueri sub-topik pencarian YouTube.
            </div>
          )}
        </div>

        {/* 2. Preferensi Kedalaman */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-[#18181b] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Preferensi Kedalaman Materi</span>
          </label>

          <div className="space-y-2">
            {depthOptions.map((opt) => {
              const isSelected = depthPreset === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDepthPreset(opt.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'border-[#17171c] bg-[#f9f9fb] shadow-xs'
                      : 'border-[#e4e4e7] bg-white hover:border-[#a1a1aa]'
                  }`}
                >
                  <div className="mt-0.5">{opt.icon}</div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-[#18181b]">
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-[#71717a]">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Anti-Goals (Hal yang Dihindari) */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-[#18181b] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Anti-Goals (Materi yang Dihindari)</span>
          </label>

          <div className="space-y-1.5">
            {antiGoals.map((a) => (
              <div
                key={a}
                className="flex items-center justify-between bg-[#f9f9fb] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-[#52525b]"
              >
                <span>- {a}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAntiGoal(a)}
                  className="text-[#a1a1aa] hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAntiGoal} className="relative flex items-center">
            <input
              type="text"
              placeholder="Tambah hal yang dihindari (misal: video tanpa source code)..."
              value={newAntiGoal}
              onChange={(e) => setNewAntiGoal(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#f9f9fb] border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#17171c] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!newAntiGoal.trim()}
              className="absolute right-1.5 p-1.5 bg-[#17171c] text-white rounded-lg hover:bg-black disabled:opacity-40 transition-opacity cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveToVault}
            disabled={saveMutation.isPending}
            className="w-full py-3 px-6 rounded-full bg-[#17171c] hover:bg-black active:scale-[0.99] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyinkronkan ke Obsidian...</span>
              </>
            ) : (
              <>
                <FolderSync className="w-3.5 h-3.5" />
                <span>Simpan Target ke my_focus.md</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Canvas: Live Markdown Preview of my_focus.md */}
      <div className="flex-1 h-full overflow-y-auto bg-[#f9f9fb] p-8 lg:p-12 flex flex-col justify-between">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-4">
            <div className="flex items-center gap-2 text-xs text-[#71717a] font-mono">
              <FileCode className="w-4 h-4 text-[#18181b]" />
              <span>my_focus.md (Pratinjau Berkas Fisik)</span>
            </div>
            <span className="text-[10px] font-mono bg-[#edfce9] text-[#003c33] px-2.5 py-0.5 rounded-full border border-[#b2e5aa]">
              Sinkron ke Vault
            </span>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-2xl p-6 shadow-xs font-mono text-xs leading-relaxed text-[#18181b] whitespace-pre-wrap">
            {previewMarkdown}
          </div>

          <div className="p-4 bg-[#eeece7] rounded-xl text-xs text-[#52525b] space-y-1">
            <span className="font-semibold text-[#18181b]">📍 Lokasi File di Disk:</span>
            <p className="font-mono text-[11px] text-[#71717a] break-all">
              {vaultPath ? `${vaultPath}/my_focus.md` : 'Memeriksa Obsidian Vault...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FocusStudio() {
  const { vaultPath } = useVideoCuratorStore()
  const { data: focusData, isLoading } = useFocusTargetsQuery()

  if (isLoading || !focusData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f9f9fb]">
        <div className="flex items-center gap-2 text-xs text-[#71717a]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memuat konfigurasi target belajar dari vault...</span>
        </div>
      </div>
    )
  }

  return (
    <FocusStudioEditor
      key={focusData.file_path || 'loaded'}
      initialData={focusData}
      vaultPath={vaultPath}
    />
  )
}
