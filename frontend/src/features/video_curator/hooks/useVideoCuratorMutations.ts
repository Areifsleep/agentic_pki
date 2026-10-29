import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { saveWatchHistoryItem } from '@/lib/utils'
import type {
  FocusTargetConfig,
  FocusTargetResponse,
  ProcessVideoRequest,
  RadarDiscoverRequest,
  RadarDiscoverResponse,
  SaveVaultRequest,
  SaveVaultResponse,
  SynthesizeVideoResponse,
  VaultChatRequest,
  VaultChatResponse,
  VideoQARequest,
  VideoQAResponse,
  VideoQuizRequest,
  VideoQuizResponse,
  SaveQuizRequest,
  SaveQuizResponse,
} from '../types'
import { useVideoCuratorStore } from './useVideoCuratorStore'

export function useSynthesizeVideoMutation() {
  const {
    setStatus,
    setActiveDraft,
    setActiveNote,
    setIsSavedToVault,
    setSavedVaultInfo,
    setErrorMessage,
    clearQAHistory,
    videoUrl,
  } = useVideoCuratorStore()

  return useMutation({
    mutationFn: async (payload: ProcessVideoRequest) => {
      const response = await api.post<SynthesizeVideoResponse>(
        '/api/v1/video/synthesize',
        payload
      )
      return response.data
    },
    onMutate: () => {
      setStatus('PROCESSING')
      setErrorMessage(null)
    },
    onSuccess: (data, variables) => {
      setStatus('SUCCESS')
      setActiveDraft(data)
      setActiveNote({
        title: data.video_title,
        category: data.category,
        content: data.markdown_content,
        execution_time_seconds: data.execution_time_seconds,
        is_vault_file: false,
      })
      setIsSavedToVault(false)
      setSavedVaultInfo(null)
      clearQAHistory()

      // Record in local watch history
      saveWatchHistoryItem({
        title: data.video_title,
        videoUrl: variables.video_url || videoUrl,
        videoId: data.video_id,
        category: data.category,
        notesCount: 1,
      })

      toast.success('Sintesis materi selesai!', {
        description: `Kategori saran: "${data.category}" (${data.execution_time_seconds}s). Siap ditinjau.`,
      })
    },
    onError: (error: Error) => {
      setStatus('ERROR')
      setErrorMessage(error.message)
      toast.error('Gagal mensintesis materi video', {
        description: error.message,
      })
    },
  })
}

export function useSaveVaultMutation() {
  const { setIsSavedToVault, setSavedVaultInfo, setActiveNote, activeNote, videoUrl } =
    useVideoCuratorStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveVaultRequest) => {
      const response = await api.post<SaveVaultResponse>(
        '/api/v1/vault/save',
        payload
      )
      return response.data
    },
    onSuccess: (data) => {
      setIsSavedToVault(true)
      setSavedVaultInfo(data)
      if (activeNote) {
        setActiveNote({
          ...activeNote,
          category: data.category,
          file_path: data.file_path,
          is_vault_file: true,
        })
        saveWatchHistoryItem({
          title: activeNote.title,
          videoUrl: videoUrl || `https://www.youtube.com/watch?v=${data.file_name.replace(/\.md$/, '')}`,
          category: data.category,
          notesCount: 1,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['vault-notes'] })
      queryClient.invalidateQueries({ queryKey: ['vault-index'] })
      toast.success('Catatan berhasil diarsipkan ke Obsidian Vault!', {
        description: `Disimpan di folder "${data.category}" (${data.file_name})`,
      })
    },
    onError: (error: Error) => {
      toast.error('Gagal menyimpan ke Obsidian Vault', {
        description: error.message,
      })
    },
  })
}

export function useVideoQAMutation() {
  const { addQAItem } = useVideoCuratorStore()

  return useMutation({
    mutationFn: async (payload: VideoQARequest) => {
      const response = await api.post<VideoQAResponse>(
        '/api/v1/video/qa',
        payload
      )
      return { ...response.data, question: payload.question }
    },
    onSuccess: (data) => {
      addQAItem({
        id: crypto.randomUUID(),
        question: data.question,
        answer: data.answer,
        timestamp_reference: data.timestamp_reference,
        created_at: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
      toast.success('Pertanyaan materi dijawab!')
    },
    onError: (error: Error) => {
      toast.error('Gagal mendapatkan jawaban', {
        description: error.message,
      })
    },
  })
}

// Focus Studio Queries & Mutations
export function useFocusTargetsQuery() {
  const { setFocusTargets } = useVideoCuratorStore()

  return useQuery({
    queryKey: ['focus-targets'],
    queryFn: async () => {
      const res = await api.get<FocusTargetResponse>('/api/v1/focus')
      setFocusTargets(res.data)
      return res.data
    },
  })
}

export function useSaveFocusMutation() {
  const { setFocusTargets } = useVideoCuratorStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: FocusTargetConfig) => {
      const res = await api.post<FocusTargetResponse>('/api/v1/focus', payload)
      return res.data
    },
    onSuccess: (data) => {
      setFocusTargets(data)
      queryClient.invalidateQueries({ queryKey: ['focus-targets'] })
      toast.success('Target belajar berhasil disinkronkan ke my_focus.md!')
    },
    onError: (error: Error) => {
      toast.error('Gagal menyimpan target belajar', {
        description: error.message,
      })
    },
  })
}

// Autonomous Learning Radar Mutations
export function useDiscoverRadarMutation() {
  const {
    setRadarVideos,
    setIsRadarLoading,
    setRadarSearchId,
    setRadarHasMore,
    dismissedVideoIds,
    radarSortBy,
  } = useVideoCuratorStore()

  return useMutation({
    mutationFn: async (payload: RadarDiscoverRequest) => {
      setIsRadarLoading(true)
      const res = await api.post<RadarDiscoverResponse>('/api/v1/radar/discover', {
        sort_by: radarSortBy,
        dismissed_ids: dismissedVideoIds,
        ...payload,
      })
      return res.data
    },
    onSuccess: (data) => {
      setRadarVideos(data.videos)
      setRadarSearchId(data.search_id || null)
      setRadarHasMore(Boolean(data.has_more))
      setIsRadarLoading(false)
      toast.success(`Ditemukan ${data.videos.length} video rekomendasi!`, {
        description: `Berdasarkan query "${data.query_used}"`,
      })
    },
    onError: (error: Error) => {
      setIsRadarLoading(false)
      toast.error('Gagal menemukan rekomendasi video', {
        description: error.message,
      })
    },
  })
}

export function useLoadMoreRadarMutation() {
  const {
    appendRadarVideos,
    setIsRadarLoadingMore,
    setRadarSearchId,
    setRadarHasMore,
    radarSearchId,
    dismissedVideoIds,
  } = useVideoCuratorStore()

  return useMutation({
    mutationFn: async () => {
      if (!radarSearchId) {
        throw new Error('Sesi buffer pencarian tidak ditemukan.')
      }
      setIsRadarLoadingMore(true)
      const res = await api.post<RadarDiscoverResponse>('/api/v1/radar/discover', {
        search_id: radarSearchId,
        dismissed_ids: dismissedVideoIds,
      })
      return res.data
    },
    onSuccess: (data) => {
      appendRadarVideos(data.videos)
      setRadarSearchId(data.search_id || null)
      setRadarHasMore(Boolean(data.has_more))
      setIsRadarLoadingMore(false)
      toast.success(`Dimuat ${data.videos.length} video tambahan dari buffer!`)
    },
    onError: (error: Error) => {
      setIsRadarLoadingMore(false)
      toast.error('Gagal memuat rekomendasi berikutnya', {
        description: error.message,
      })
    },
  })
}

export function useGenerateQueryVariationsMutation() {
  return useMutation({
    mutationFn: async (payload: FocusTargetConfig) => {
      const res = await api.post<{ success: boolean; variations: Record<string, string[]> }>(
        '/api/v1/focus/variations',
        payload
      )
      return res.data
    },
    onSuccess: () => {
      toast.success('Variasi kueri YouTube berhasil dihasilkan oleh AI!')
    },
    onError: (error: Error) => {
      toast.error('Gagal menghasilkan variasi kueri', {
        description: error.message,
      })
    },
  })
}

// Vault-Wide Multi-Note Chat Mutation
export function useVaultChatMutation() {
  const { addVaultChatItem } = useVideoCuratorStore()

  return useMutation({
    mutationFn: async (payload: VaultChatRequest) => {
      const res = await api.post<VaultChatResponse>('/api/v1/vault/chat', payload)
      return { ...res.data, question: payload.question }
    },
    onSuccess: (data) => {
      addVaultChatItem({
        id: crypto.randomUUID(),
        question: data.question,
        answer: data.answer,
        cited_files: data.cited_files,
        created_at: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
      toast.success('Jawaban berbasis vault dihasilkan!')
    },
    onError: (error: Error) => {
      toast.error('Gagal berdialog dengan vault', {
        description: error.message,
      })
    },
  })
}

// Active Recall Quiz & Flashcards Mutation
export function useVideoQuizMutation() {
  const { setActiveQuiz, resetQuizAnswers } = useVideoCuratorStore()

  return useMutation({
    mutationFn: async (payload: VideoQuizRequest) => {
      const res = await api.post<VideoQuizResponse>('/api/v1/video/quiz', payload)
      return res.data
    },
    onSuccess: (data) => {
      setActiveQuiz(data)
      resetQuizAnswers()
      toast.success(`Kuis Active Recall & Flashcard berhasil disusun (${data.total_questions} konsep)!`)
    },
    onError: (error: Error) => {
      toast.error('Gagal menghasilkan kuis Active Recall', {
        description: error.message,
      })
    },
  })
}

export function useSaveQuizMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveQuizRequest) => {
      const res = await api.post<SaveQuizResponse>('/api/v1/vault/quiz/save', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Kuis Active Recall berhasil disimpan ke Obsidian Vault!')
      queryClient.invalidateQueries({ queryKey: ['vault-notes'] })
    },
    onError: (error: Error) => {
      toast.error('Gagal menyimpan kuis ke Obsidian Vault', {
        description: error.message,
      })
    },
  })
}
