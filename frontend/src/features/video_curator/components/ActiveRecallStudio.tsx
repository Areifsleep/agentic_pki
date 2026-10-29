import { useState, useMemo } from 'react'
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCw,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Award,
  Loader2,
  ArrowRight,
  FolderDown,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import {
  useVideoQuizMutation,
  useSaveQuizMutation,
} from '../hooks/useVideoCuratorMutations'
import { extractVideoId } from '@/lib/utils'
import type { QuizQuestionItem, SaveQuizResponse } from '../types'

interface ActiveRecallStudioProps {
  videoId?: string | null
  markdownContent?: string | null
  filePath?: string | null
  isVaultHistory?: boolean
  onQuizSaved?: (res: SaveQuizResponse) => void
}

export function ActiveRecallStudio({
  videoId,
  markdownContent,
  filePath,
  isVaultHistory = false,
  onQuizSaved,
}: ActiveRecallStudioProps = {}) {
  const {
    activeDraft,
    activeNote,
    videoUrl,
    activeQuiz,
    quizAnswers,
    setQuizAnswer,
    resetQuizAnswers,
    seekToTimestamp,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()
  const quizMutation = useVideoQuizMutation()
  const saveQuizMutation = useSaveQuizMutation()

  const [activeMode, setActiveMode] = useState<'quiz' | 'flashcards'>('quiz')
  const [numQuestions, setNumQuestions] = useState<number>(4)
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0)
  const [isFlipped, setIsFlipped] = useState<boolean>(false)

  const effectiveVideoId =
    videoId ||
    activeDraft?.video_id ||
    (videoUrl ? extractVideoId(videoUrl) : null)

  const effectiveContent =
    markdownContent || activeNote?.content || activeDraft?.markdown_content

  const effectiveFilePath = filePath || activeNote?.file_path

  const handleGenerate = () => {
    if (!effectiveVideoId) return
    quizMutation.mutate({
      video_id: effectiveVideoId,
      markdown_content: effectiveContent,
      num_questions: numQuestions,
    })
  }

  const handleSaveQuizToVault = () => {
    if (!effectiveVideoId || !activeQuiz) return
    saveQuizMutation.mutate(
      {
        video_id: effectiveVideoId,
        quiz_data: activeQuiz,
        file_path: effectiveFilePath || undefined,
      },
      {
        onSuccess: (data) => {
          onQuizSaved?.(data)
        },
      }
    )
  }

  const questions: QuizQuestionItem[] = useMemo(
    () => activeQuiz?.questions || [],
    [activeQuiz?.questions]
  )

  const handleExportAnkiCSV = () => {
    if (!questions || questions.length === 0) {
      toast.error('Tidak ada kartu flashcard untuk diekspor.')
      return
    }

    const rows: string[] = [
      '#separator:tab',
      '#html:true',
      '#tags column:3',
    ]

    questions.forEach((q) => {
      const frontText = (q.flashcard_front || q.question || '').replaceAll('\t', ' ').replaceAll('\n', '<br>')
      const tsBadge = q.timestamp_reference ? `<br><small style="color:#10b981;">Timestamp: ${q.timestamp_reference}</small>` : ''
      const front = `<b>${frontText}</b>${tsBadge}`

      const backAnswer = (q.flashcard_back || (q.options ? q.options[q.correct_answer_index] : '') || '').replaceAll('\t', ' ').replaceAll('\n', '<br>')
      const expl = (q.explanation || '').replaceAll('\t', ' ').replaceAll('\n', '<br>')
      const back = `${backAnswer}<br><br><small style="color:#71717a;">${expl}</small>`

      const tagStr = `studytube active_recall ${effectiveVideoId ? `yt_${effectiveVideoId}` : ''}`
      rows.push(`${front}\t${back}\t${tagStr}`)
    })

    const blob = new Blob([rows.join('\n')], { type: 'text/tab-separated-values;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studytube-anki-deck-${effectiveVideoId || 'cards'}.tsv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Deck Anki berhasil diekspor (.tsv)!', {
      description: 'Impor berkas ini langsung ke aplikasi Anki via File > Import.',
    })
  }

  // Calculate score
  const { answeredCount, correctCount } = useMemo(() => {
    let answered = 0
    let correct = 0
    questions.forEach((q) => {
      const selected = quizAnswers[q.id]
      if (selected !== undefined) {
        answered += 1
        if (selected === q.correct_answer_index) {
          correct += 1
        }
      }
    })
    return { answeredCount: answered, correctCount: correct }
  }, [questions, quizAnswers])

  // Current flashcard
  const activeFlashcard = questions[currentCardIndex] || null

  const handleNextCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex((prev) => (prev + 1) % questions.length)
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex((prev) => (prev - 1 + questions.length) % questions.length)
  }

  const handleShuffleCards = () => {
    setIsFlipped(false)
    const randomIndex = Math.floor(Math.random() * questions.length)
    setCurrentCardIndex(randomIndex)
  }

  // State: No video active
  if (!effectiveVideoId && !effectiveContent) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 text-center ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-[#27272a] text-white' : 'bg-[#eeece7] text-[#17171c]'}`}>
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h3 className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
          Belum Ada Video yang Dipilih
        </h3>
        <p className="text-xs max-w-sm">
          Sintesis atau pilih video terlebih dahulu di panel kiri untuk membuka kuis Active Recall dan Flashcard konseptual.
        </p>
      </div>
    )
  }

  // State: No quiz generated yet
  if (!activeQuiz || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${isDark ? 'bg-white text-black' : 'bg-[#17171c] text-white'}`}>
          <BrainCircuit className="w-7 h-7" />
        </div>
        <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
          Active Recall & Flashcards Studio
        </h3>
        <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
          {isVaultHistory
            ? 'Catatan arsip ini belum memiliki kuis Active Recall. AI akan membaca isi catatan dan merumuskan kuis konseptual serta kartu hafalan mental model.'
            : 'Tingkatkan pemahaman belajar mandiri. AI akan mengevaluasi transkrip video ini dan merumuskan kuis konseptual serta kartu hafalan mental model lengkap dengan rujukan segmen video.'}
        </p>

        {/* Question Count Selector */}
        <div className={`w-full p-3 rounded-xl border mb-5 space-y-2 ${isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'}`}>
          <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-[#52525b]'}`}>
            <span className="font-medium">Jumlah Pertanyaan:</span>
            <span className={`font-mono font-semibold ${isDark ? 'text-emerald-400' : 'text-[#17171c]'}`}>
              {numQuestions} Konsep
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            {[3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setNumQuestions(num)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                  numQuestions === num
                    ? isDark
                      ? 'bg-white text-black font-semibold shadow-xs'
                      : 'bg-[#17171c] text-white shadow-xs'
                    : isDark
                      ? 'bg-[#27272a] text-zinc-300 hover:bg-[#3f3f46]'
                      : 'bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]'
                }`}
              >
                {num} Soal
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={quizMutation.isPending}
          className={`w-full py-2.5 px-4 text-xs font-medium rounded-full shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
            isDark
              ? 'bg-white hover:bg-zinc-200 text-black font-semibold'
              : 'bg-[#17171c] hover:bg-[#27272a] text-white'
          }`}
        >
          {quizMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyusun Kuis Active Recall...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Susun Kuis & Flashcards AI</span>
            </>
          )}
        </button>
      </div>
    )
  }

  // State: Quiz generated and active!
  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-[#0d0d11]' : 'bg-[#fdfdfd]'}`}>
      {/* Studio Header Bar */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between shrink-0 ${isDark ? 'bg-[#141419] border-[#27272a]' : 'bg-white border-[#e4e4e7]'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-500/30">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-xs font-semibold tracking-tight ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
              Active Recall Studio
            </h2>
            <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              {questions.length} Konsep Teruji • Terhubung ke YouTube Player
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Switcher */}
        <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-[#f4f4f5] border-[#e4e4e7]'}`}>
          <button
            type="button"
            onClick={() => setActiveMode('quiz')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'quiz'
                ? isDark
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-white text-[#18181b] shadow-xs'
                : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>Kuis Pilihan Ganda</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('flashcards')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'flashcards'
                ? isDark
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'bg-white text-[#18181b] shadow-xs'
                : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Flashcards 3D</span>
          </button>
        </div>

        {/* Action Buttons: Export Anki, Save Quiz & Regenerate */}
        <div className="flex items-center gap-2">
          {/* Anki TSV/CSV Export Button */}
          <button
            type="button"
            onClick={handleExportAnkiCSV}
            className={`px-3 py-1.5 text-xs font-medium rounded-full shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'border border-[#27272a] text-zinc-300 hover:bg-[#27272a] hover:text-white'
                : 'border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Ekspor flashcards ke format Anki TSV/CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Export Anki (.tsv)</span>
          </button>

          {/* Save Quiz to Vault Button */}
          <button
            type="button"
            onClick={handleSaveQuizToVault}
            disabled={saveQuizMutation.isPending}
            className={`px-3 py-1.5 text-xs font-medium rounded-full shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'bg-white hover:bg-zinc-200 text-black font-semibold'
                : 'bg-[#17171c] hover:bg-black text-white'
            }`}
            title="Simpan kuis dan flashcard ini ke Obsidian Vault"
          >
            {saveQuizMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Menyimpan...</span>
              </>
            ) : (
              <>
                <FolderDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>Simpan Kuis</span>
              </>
            )}
          </button>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={quizMutation.isPending}
            className={`text-xs flex items-center gap-1 p-1.5 rounded-md transition-colors cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
            title="Acak & Susun Ulang Pertanyaan Kuis"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${quizMutation.isPending ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Susun Ulang</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive Multiple Choice Quiz */}
      {activeMode === 'quiz' && (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Score Banner */}
          <div className={`border rounded-xl p-3.5 flex items-center justify-between ${isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-[#fcfbf9] border-[#eeece7]'}`}>
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-500" />
              <div>
                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Skor Anda: {correctCount} / {questions.length} Benar
                </span>
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  {answeredCount === questions.length
                    ? 'Seluruh pertanyaan telah diselesaikan!'
                    : `${questions.length - answeredCount} pertanyaan tersisa.`}
                </p>
              </div>
            </div>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={resetQuizAnswers}
                className={`text-[11px] font-medium underline cursor-pointer ${isDark ? 'text-zinc-400 hover:text-white' : 'text-[#71717a] hover:text-[#18181b]'}`}
              >
                Ulangi Kuis
              </button>
            )}
          </div>

          {/* Question List */}
          <div className="space-y-5">
            {questions.map((q, qIndex) => {
              const selectedIdx = quizAnswers[q.id]
              const hasAnswered = selectedIdx !== undefined
              const isCorrect = selectedIdx === q.correct_answer_index

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-5 shadow-xs space-y-4 ${isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'}`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isDark ? 'bg-[#27272a] text-white' : 'bg-[#eeece7] text-[#18181b]'
                      }`}>
                        {qIndex + 1}
                      </span>
                      <h4 className={`text-xs font-semibold leading-relaxed ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                        {q.question}
                      </h4>
                    </div>

                    {/* Remedial Jump to Video Player Button */}
                    {q.timestamp_reference && (
                      <button
                        type="button"
                        onClick={() => seekToTimestamp(q.timestamp_reference!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#003c33]/40 text-emerald-400 text-[11px] font-mono font-medium hover:bg-[#003c33]/70 transition-colors border border-emerald-500/30 shrink-0 cursor-pointer shadow-2xs"
                        title="Tonton penjelasan materi ini di YouTube player"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Jump {q.timestamp_reference}</span>
                      </button>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedIdx === optIdx
                      const isOptionCorrect = q.correct_answer_index === optIdx

                      let optionStyle = isDark
                        ? 'bg-[#121216] border-[#27272a] text-zinc-300 hover:bg-[#1f1f25] hover:border-zinc-700'
                        : 'bg-[#fdfdfd] border-[#e4e4e7] text-[#27272a] hover:bg-[#f4f4f5] hover:border-[#d4d4d8]'

                      if (hasAnswered) {
                        if (isOptionCorrect) {
                          optionStyle =
                            'bg-[#003c33]/50 border-emerald-500/50 text-emerald-300 font-medium'
                        } else if (isOptionSelected && !isCorrect) {
                          optionStyle =
                            'bg-rose-950/50 border-rose-500/50 text-rose-300'
                        } else {
                          optionStyle = isDark
                            ? 'bg-[#121216] border-[#27272a] text-zinc-600 opacity-50'
                            : 'bg-[#fafafa] border-[#e4e4e7] text-[#a1a1aa] opacity-60'
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => setQuizAnswer(q.id, optIdx)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${optionStyle}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-semibold shrink-0 ${
                              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-black/5 text-black'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </div>

                          {hasAnswered && isOptionCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {hasAnswered && isOptionSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Answer Explanation Box */}
                  {hasAnswered && (
                    <div
                      className={`p-3.5 rounded-lg text-xs leading-relaxed space-y-1.5 ${
                        isCorrect
                          ? 'bg-[#003c33]/40 border border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-950/40 border border-amber-600/30 text-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Jawaban Benar!</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Penjelasan Konsep Kunci:</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {q.explanation}
                      </p>
                      {q.timestamp_reference && !isCorrect && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => seekToTimestamp(q.timestamp_reference!)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:underline cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Tonton bagian {q.timestamp_reference} untuk mengulas materi</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mode 2: 3D Flashcards for Mental Models */}
      {activeMode === 'flashcards' && activeFlashcard && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          {/* Card Counter & Shuffle */}
          <div className={`w-full max-w-lg flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
            <span className="font-mono font-medium">
              Kartu {currentCardIndex + 1} dari {questions.length}
            </span>
            <button
              type="button"
              onClick={handleShuffleCards}
              className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
                isDark ? 'hover:text-white' : 'hover:text-[#18181b]'
              }`}
            >
              <Shuffle className="w-3 h-3" />
              <span>Acak Urutan</span>
            </button>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-lg h-72 cursor-pointer [perspective:1000px]"
            title="Klik kartu untuk membalik (Active Recall)"
          >
            <div
              className={`relative w-full h-full rounded-2xl border p-6 shadow-md transition-all duration-500 [transform-style:preserve-3d] flex flex-col justify-between select-none ${
                isDark
                  ? 'border-[#27272a] bg-[#17171c]'
                  : 'border-[#e4e4e7] bg-white'
              } ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
              {/* Front Side */}
              <div
                className={`w-full h-full flex flex-col justify-between ${
                  isFlipped ? 'hidden' : 'flex'
                }`}
              >
                <div className={`flex items-center justify-between text-[11px] border-b pb-2.5 ${isDark ? 'border-[#27272a] text-zinc-400' : 'border-[#f4f4f5] text-[#71717a]'}`}>
                  <span className={`font-mono font-semibold uppercase tracking-wider ${isDark ? 'text-white' : 'text-[#17171c]'}`}>
                    Tantangan Konsep
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-[#27272a] text-zinc-200' : 'bg-[#eeece7] text-[#17171c]'}`}>
                    Tanya & Ingat
                  </span>
                </div>

                <div className="py-4">
                  <h3 className={`text-base font-semibold leading-snug ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    {activeFlashcard.flashcard_front}
                  </h3>
                </div>

                <div className={`flex items-center justify-between text-[11px] pt-2 border-t ${isDark ? 'border-[#27272a] text-zinc-500' : 'border-[#f4f4f5] text-[#a1a1aa]'}`}>
                  <span>Klik untuk melihat jawaban & mental model</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Back Side (Rotated) */}
              <div
                className={`w-full h-full flex flex-col justify-between ${
                  isFlipped ? 'flex [transform:rotateY(180deg)]' : 'hidden'
                }`}
              >
                <div className={`flex items-center justify-between text-[11px] border-b pb-2.5 ${isDark ? 'border-[#27272a] text-zinc-400' : 'border-[#eeece7] text-[#71717a]'}`}>
                  <span className="font-mono font-semibold uppercase tracking-wider text-emerald-500">
                    Mental Model & Solusi
                  </span>
                  {activeFlashcard.timestamp_reference && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        seekToTimestamp(activeFlashcard.timestamp_reference!)
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#003c33]/40 text-emerald-400 border border-emerald-500/30 hover:bg-[#003c33]/70 transition-colors"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{activeFlashcard.timestamp_reference}</span>
                    </button>
                  )}
                </div>

                <div className="py-4 space-y-2 overflow-y-auto">
                  <p className={`text-sm font-semibold leading-relaxed ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    {activeFlashcard.flashcard_back}
                  </p>
                  <p className={`text-xs leading-relaxed border-t pt-2 ${isDark ? 'border-[#27272a] text-zinc-400' : 'border-[#f4f4f5] text-[#52525b]'}`}>
                    {activeFlashcard.explanation}
                  </p>
                </div>

                <div className={`flex items-center justify-between text-[11px] pt-2 border-t ${isDark ? 'border-[#27272a] text-zinc-500' : 'border-[#eeece7] text-[#a1a1aa]'}`}>
                  <span>Klik lagi untuk membalik kartu</span>
                  <RotateCw className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handlePrevCard}
              className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#17171c] border-[#27272a] text-white hover:bg-[#27272a]'
                  : 'bg-white border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#18181b]'
              }`}
              title="Kartu Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className={`px-5 py-2 text-xs font-medium rounded-full shadow-xs transition-colors cursor-pointer ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black font-semibold'
                  : 'bg-[#17171c] hover:bg-[#27272a] text-white'
              }`}
            >
              {isFlipped ? 'Tutup Jawaban' : 'Buka Jawaban'}
            </button>
            <button
              type="button"
              onClick={handleNextCard}
              className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#17171c] border-[#27272a] text-white hover:bg-[#27272a]'
                  : 'bg-white border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#18181b]'
              }`}
              title="Kartu Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
