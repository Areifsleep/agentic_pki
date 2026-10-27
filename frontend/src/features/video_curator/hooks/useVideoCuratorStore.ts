import { create } from 'zustand'
import type {
  ActiveStage,
  AgentStatus,
  CuratorConfig,
  FocusTargetResponse,
  QAHistoryItem,
  RadarSortOption,
  RadarVideoItem,
  SaveVaultResponse,
  SummaryMode,
  SynthesizeVideoResponse,
  VaultChatItem,
  VaultSettings,
} from '../types'

export interface ActiveNoteView {
  title: string
  category: string
  content: string
  file_path?: string
  execution_time_seconds?: number
  is_vault_file?: boolean
}

interface VideoCuratorState {
  // Navigation & Dynamic Stage
  activeStage: ActiveStage
  setActiveStage: (stage: ActiveStage) => void

  // Curation Workspace State
  status: AgentStatus
  videoUrl: string
  config: CuratorConfig
  customPromptEnabled: boolean
  activeDraft: SynthesizeVideoResponse | null
  activeNote: ActiveNoteView | null
  isSavedToVault: boolean
  savedVaultInfo: SaveVaultResponse | null
  errorMessage: string | null
  qaHistory: QAHistoryItem[]
  vaultPath: string
  isVaultSettingsOpen: boolean
  setIsVaultSettingsOpen: (open: boolean) => void
  vaultSettings: VaultSettings | null
  setVaultSettings: (settings: VaultSettings | null) => void

  // Focus Studio State
  focusTargets: FocusTargetResponse | null
  setFocusTargets: (targets: FocusTargetResponse | null) => void

  // Learning Radar State
  radarVideos: RadarVideoItem[]
  setRadarVideos: (videos: RadarVideoItem[]) => void
  appendRadarVideos: (videos: RadarVideoItem[]) => void
  radarQuery: string
  setRadarQuery: (q: string) => void
  isRadarLoading: boolean
  setIsRadarLoading: (l: boolean) => void
  isRadarLoadingMore: boolean
  setIsRadarLoadingMore: (l: boolean) => void
  radarSearchId: string | null
  setRadarSearchId: (id: string | null) => void
  radarHasMore: boolean
  setRadarHasMore: (hasMore: boolean) => void
  radarSortBy: RadarSortOption
  setRadarSortBy: (sort: RadarSortOption) => void
  dismissedVideoIds: string[]
  dismissVideo: (videoId: string) => void

  // Vault-Wide Chat State
  vaultChatHistory: VaultChatItem[]
  addVaultChatItem: (item: VaultChatItem) => void
  clearVaultChat: () => void

  // Actions
  setStatus: (status: AgentStatus) => void
  setVideoUrl: (url: string) => void
  setConfigMode: (mode: SummaryMode) => void
  toggleModifier: (key: keyof Omit<CuratorConfig, 'mode' | 'custom_prompt'>) => void
  setCustomPrompt: (prompt: string) => void
  setCustomPromptEnabled: (enabled: boolean) => void
  setActiveDraft: (draft: SynthesizeVideoResponse | null) => void
  setActiveNote: (note: ActiveNoteView | null) => void
  setIsSavedToVault: (saved: boolean) => void
  setSavedVaultInfo: (info: SaveVaultResponse | null) => void
  setErrorMessage: (msg: string | null) => void
  addQAItem: (item: QAHistoryItem) => void
  clearQAHistory: () => void
  setVaultPath: (path: string) => void
  resetForNewCurate: () => void
  curateVideoFromRadar: (videoId: string) => void
}

export const useVideoCuratorStore = create<VideoCuratorState>((set) => ({
  activeStage: 'curate',
  setActiveStage: (activeStage) => set({ activeStage }),

  status: 'IDLE',
  videoUrl: '',
  config: {
    mode: 'cheatsheet',
    include_timestamps: true,
    include_pitfalls: true,
    include_code: true,
    custom_prompt: '',
  },
  customPromptEnabled: false,
  activeDraft: null,
  activeNote: null,
  isSavedToVault: false,
  savedVaultInfo: null,
  errorMessage: null,
  qaHistory: [],
  vaultPath: '',
  isVaultSettingsOpen: false,
  setIsVaultSettingsOpen: (isVaultSettingsOpen) => set({ isVaultSettingsOpen }),
  vaultSettings: null,
  setVaultSettings: (vaultSettings) => set({ vaultSettings }),

  focusTargets: null,
  setFocusTargets: (focusTargets) => set({ focusTargets }),

  radarVideos: [],
  setRadarVideos: (radarVideos) => set({ radarVideos }),
  appendRadarVideos: (newVideos) =>
    set((state) => ({ radarVideos: [...state.radarVideos, ...newVideos] })),
  radarQuery: '',
  setRadarQuery: (radarQuery) => set({ radarQuery }),
  isRadarLoading: false,
  setIsRadarLoading: (isRadarLoading) => set({ isRadarLoading }),
  isRadarLoadingMore: false,
  setIsRadarLoadingMore: (isRadarLoadingMore) => set({ isRadarLoadingMore }),
  radarSearchId: null,
  setRadarSearchId: (radarSearchId) => set({ radarSearchId }),
  radarHasMore: false,
  setRadarHasMore: (radarHasMore) => set({ radarHasMore }),
  radarSortBy: 'relevance',
  setRadarSortBy: (radarSortBy) => set({ radarSortBy }),
  dismissedVideoIds: [],
  dismissVideo: (videoId) =>
    set((state) => ({
      radarVideos: state.radarVideos.filter((v) => v.video_id !== videoId),
      dismissedVideoIds: [...state.dismissedVideoIds, videoId],
    })),

  vaultChatHistory: [],
  addVaultChatItem: (item) =>
    set((state) => ({ vaultChatHistory: [item, ...state.vaultChatHistory] })),
  clearVaultChat: () => set({ vaultChatHistory: [] }),

  setStatus: (status) => set({ status }),
  setVideoUrl: (videoUrl) => set({ videoUrl }),
  setConfigMode: (mode) =>
    set((state) => ({ config: { ...state.config, mode } })),
  toggleModifier: (key) =>
    set((state) => ({
      config: { ...state.config, [key]: !state.config[key] },
    })),
  setCustomPrompt: (prompt) =>
    set((state) => ({ config: { ...state.config, custom_prompt: prompt } })),
  setCustomPromptEnabled: (customPromptEnabled) =>
    set((state) => ({
      customPromptEnabled,
      config: {
        ...state.config,
        custom_prompt: customPromptEnabled ? state.config.custom_prompt : '',
      },
    })),
  setActiveDraft: (activeDraft) => set({ activeDraft }),
  setActiveNote: (activeNote) => set({ activeNote }),
  setIsSavedToVault: (isSavedToVault) => set({ isSavedToVault }),
  setSavedVaultInfo: (savedVaultInfo) => set({ savedVaultInfo }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  addQAItem: (item) =>
    set((state) => ({ qaHistory: [item, ...state.qaHistory] })),
  clearQAHistory: () => set({ qaHistory: [] }),
  setVaultPath: (vaultPath) => set({ vaultPath }),
  resetForNewCurate: () =>
    set({
      status: 'IDLE',
      videoUrl: '',
      activeDraft: null,
      activeNote: null,
      isSavedToVault: false,
      savedVaultInfo: null,
      errorMessage: null,
      qaHistory: [],
      activeStage: 'curate',
    }),
  curateVideoFromRadar: (videoId: string) =>
    set({
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      activeStage: 'curate',
      activeDraft: null,
      activeNote: null,
      isSavedToVault: false,
      savedVaultInfo: null,
      status: 'IDLE',
    }),
}))
