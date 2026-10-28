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
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
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
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#71717a]">
        <div className="w-12 h-12 rounded-2xl bg-[#eeece7] text-[#17171c] flex items-center justify-center mb-3">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-sm text-[#18181b] mb-1">
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
        <div className="w-14 h-14 rounded-2xl bg-[#17171c] text-white flex items-center justify-center mb-4 shadow-sm">
          <BrainCircuit className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-[#18181b] mb-1">
          Active Recall & Flashcards Studio
        </h3>
        <p className="text-xs text-[#71717a] leading-relaxed mb-6">
          {isVaultHistory
            ? 'Catatan arsip ini belum memiliki kuis Active Recall. AI akan membaca isi catatan dan merumuskan kuis konseptual serta kartu hafalan mental model.'
            : 'Tingkatkan pemahaman belajar mandiri. AI akan mengevaluasi transkrip video ini dan merumuskan kuis konseptual serta kartu hafalan mental model lengkap dengan rujukan segmen video.'}
        </p>

        {/* Question Count Selector */}
        <div className="w-full bg-white p-3 rounded-xl border border-[#e4e4e7] mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#52525b]">
            <span className="font-medium">Jumlah Pertanyaan:</span>
            <span className="font-mono font-semibold text-[#17171c]">
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
                    ? 'bg-[#17171c] text-white shadow-xs'
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
          className="w-full py-2.5 px-4 bg-[#17171c] hover:bg-[#27272a] text-white text-xs font-medium rounded-full shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {quizMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyusun Kuis Active Recall...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Susun Kuis & Flashcards AI</span>
            </>
          )}
        </button>
      </div>
    )
  }

  // State: Quiz generated and active!
  return (
    <div className="h-full flex flex-col bg-[#fdfdfd] overflow-hidden">
      {/* Studio Header Bar */}
      <div className="px-6 py-3.5 border-b border-[#e4e4e7] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#17171c] text-white flex items-center justify-center shadow-xs">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#18181b] tracking-tight">
              Active Recall Studio
            </h2>
            <p className="text-[11px] text-[#71717a]">
              {questions.length} Konsep Teruji • Terhubung ke YouTube Player
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Switcher */}
        <div className="flex items-center gap-1 bg-[#f4f4f5] p-0.5 rounded-lg border border-[#e4e4e7]">
          <button
            type="button"
            onClick={() => setActiveMode('quiz')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'quiz'
                ? 'bg-white text-[#18181b] shadow-xs'
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
                ? 'bg-white text-[#18181b] shadow-xs'
                : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Flashcards 3D</span>
          </button>
        </div>

        {/* Action Buttons: Save Quiz & Regenerate */}
        <div className="flex items-center gap-2">
          {/* Save Quiz to Vault Button */}
          <button
            type="button"
            onClick={handleSaveQuizToVault}
            disabled={saveQuizMutation.isPending}
            className="px-3 py-1.5 bg-[#17171c] hover:bg-black text-white text-xs font-medium rounded-full shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Simpan kuis dan flashcard ini ke Obsidian Vault"
          >
            {saveQuizMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Menyimpan...</span>
              </>
            ) : (
              <>
                <FolderDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simpan Kuis</span>
              </>
            )}
          </button>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={quizMutation.isPending}
            className="text-xs text-[#71717a] hover:text-[#18181b] flex items-center gap-1 p-1.5 rounded-md hover:bg-[#f4f4f5] transition-colors cursor-pointer"
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
          <div className="bg-[#fcfbf9] border border-[#eeece7] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-xs font-semibold text-[#18181b]">
                  Skor Anda: {correctCount} / {questions.length} Benar
                </span>
                <p className="text-[11px] text-[#71717a]">
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
                className="text-[11px] font-medium text-[#71717a] hover:text-[#18181b] underline cursor-pointer"
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
                  className="bg-white rounded-xl border border-[#e4e4e7] p-5 shadow-xs space-y-4"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#eeece7] text-[#18181b] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-[#18181b] leading-relaxed">
                        {q.question}
                      </h4>
                    </div>

                    {/* Remedial Jump to Video Player Button */}
                    {q.timestamp_reference && (
                      <button
                        type="button"
                        onClick={() => seekToTimestamp(q.timestamp_reference!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#edfce9] text-[#003c33] text-[11px] font-mono font-medium hover:bg-[#d8f9d0] transition-colors border border-[#b2e5aa] shrink-0 cursor-pointer shadow-2xs"
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

                      let optionStyle =
                        'bg-[#fdfdfd] border-[#e4e4e7] text-[#27272a] hover:bg-[#f4f4f5] hover:border-[#d4d4d8]'

                      if (hasAnswered) {
                        if (isOptionCorrect) {
                          optionStyle =
                            'bg-[#edfce9] border-[#a3e635] text-[#003c33] font-medium'
                        } else if (isOptionSelected && !isCorrect) {
                          optionStyle =
                            'bg-[#fee2e2] border-[#f87171] text-[#991b1b]'
                        } else {
                          optionStyle =
                            'bg-[#fafafa] border-[#e4e4e7] text-[#a1a1aa] opacity-60'
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
                            <span className="w-5 h-5 rounded-md bg-black/5 flex items-center justify-center font-mono text-[10px] font-semibold shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </div>

                          {hasAnswered && isOptionCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                          )}
                          {hasAnswered && isOptionSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
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
                          ? 'bg-[#edfce9]/60 border border-[#b2e5aa]/60 text-[#003c33]'
                          : 'bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                            <span>Jawaban Benar!</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-3.5 h-3.5 text-[#f97316]" />
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
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#c2410c] hover:underline cursor-pointer"
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
          <div className="w-full max-w-lg flex items-center justify-between text-xs text-[#71717a]">
            <span className="font-mono font-medium">
              Kartu {currentCardIndex + 1} dari {questions.length}
            </span>
            <button
              type="button"
              onClick={handleShuffleCards}
              className="inline-flex items-center gap-1 hover:text-[#18181b] transition-colors cursor-pointer"
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
              className={`relative w-full h-full rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-md transition-all duration-500 [transform-style:preserve-3d] flex flex-col justify-between select-none ${
                isFlipped ? '[transform:rotateY(180deg)] bg-[#fcfbf9]' : ''
              }`}
            >
              {/* Front Side */}
              <div
                className={`w-full h-full flex flex-col justify-between ${
                  isFlipped ? 'hidden' : 'flex'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#71717a] border-b border-[#f4f4f5] pb-2.5">
                  <span className="font-mono font-semibold uppercase tracking-wider text-[#17171c]">
                    Tantangan Konsep
                  </span>
                  <span className="text-[10px] bg-[#eeece7] px-2 py-0.5 rounded-full text-[#17171c]">
                    Tanya & Ingat
                  </span>
                </div>

                <div className="py-4">
                  <h3 className="text-base font-semibold text-[#18181b] leading-snug">
                    {activeFlashcard.flashcard_front}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] pt-2 border-t border-[#f4f4f5]">
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
                <div className="flex items-center justify-between text-[11px] text-[#71717a] border-b border-[#eeece7] pb-2.5">
                  <span className="font-mono font-semibold uppercase tracking-wider text-emerald-700">
                    Mental Model & Solusi
                  </span>
                  {activeFlashcard.timestamp_reference && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        seekToTimestamp(activeFlashcard.timestamp_reference!)
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#edfce9] text-[#003c33] border border-[#b2e5aa] hover:bg-[#d8f9d0] transition-colors"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{activeFlashcard.timestamp_reference}</span>
                    </button>
                  )}
                </div>

                <div className="py-4 space-y-2 overflow-y-auto">
                  <p className="text-sm font-semibold text-[#18181b] leading-relaxed">
                    {activeFlashcard.flashcard_back}
                  </p>
                  <p className="text-xs text-[#52525b] leading-relaxed border-t border-[#f4f4f5] pt-2">
                    {activeFlashcard.explanation}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] pt-2 border-t border-[#eeece7]">
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
              className="w-10 h-10 rounded-full bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] flex items-center justify-center text-[#18181b] shadow-xs transition-colors cursor-pointer"
              title="Kartu Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-5 py-2 bg-[#17171c] hover:bg-[#27272a] text-white text-xs font-medium rounded-full shadow-xs transition-colors cursor-pointer"
            >
              {isFlipped ? 'Tutup Jawaban' : 'Buka Jawaban'}
            </button>
            <button
              type="button"
              onClick={handleNextCard}
              className="w-10 h-10 rounded-full bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] flex items-center justify-center text-[#18181b] shadow-xs transition-colors cursor-pointer"
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
