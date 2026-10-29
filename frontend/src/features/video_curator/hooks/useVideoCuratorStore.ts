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
  VideoQuizResponse,
} from '../types'
import { parseTimestampToSeconds } from '@/lib/utils'

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
  isSidebarExpanded: boolean
  setIsSidebarExpanded: (expanded: boolean) => void
  toggleSidebar: (expanded?: boolean) => void

  // Global Omni Search
  omniSearchQuery: string
  setOmniSearchQuery: (q: string) => void

  // Add URL Modal
  isAddUrlOpen: boolean
  setIsAddUrlOpen: (open: boolean) => void

  // Preferences & Appearance
  appearance: 'light' | 'dark' | 'system'
  setAppearance: (app: 'light' | 'dark' | 'system') => void
  curationSensitivity: number
  setCurationSensitivity: (s: number) => void
  antiClickbaitEnabled: boolean
  setAntiClickbaitEnabled: (enabled: boolean) => void
  autoExportOnFinish: boolean
  setAutoExportOnFinish: (enabled: boolean) => void
  wikilinkMatchingEnabled: boolean
  setWikilinkMatchingEnabled: (enabled: boolean) => void
  agentFrequencyHours: number
  setAgentFrequencyHours: (hours: number) => void
  curatorFolderName: string
  setCuratorFolderName: (name: string) => void
  aiModel: string
  setAiModel: (model: string) => void
  aiApiKey: string
  setAiApiKey: (key: string) => void
  aiTemperature: number
  setAiTemperature: (t: number) => void
  aiMaxTokens: number
  setAiMaxTokens: (tokens: number) => void
  strictCodeBlocks: boolean
  setStrictCodeBlocks: (strict: boolean) => void
  desktopNotificationsEnabled: boolean
  setDesktopNotificationsEnabled: (enabled: boolean) => void
  completionSoundEnabled: boolean
  setCompletionSoundEnabled: (enabled: boolean) => void
  radarHighSignalAlerts: boolean
  setRadarHighSignalAlerts: (enabled: boolean) => void
  flashcardReviewReminders: boolean
  setFlashcardReviewReminders: (enabled: boolean) => void
  stepProgressToasts: boolean
  setStepProgressToasts: (enabled: boolean) => void

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

  // Embedded Video Player State ("True Ask & Jump")
  isPlayerOpen: boolean
  isFloatingPlayer: boolean
  playerSeekSeconds: number | null
  playerActionCounter: number
  seekToTimestamp: (timestamp: string | number) => void
  togglePlayer: (open?: boolean) => void
  setIsFloatingPlayer: (floating: boolean) => void

  // Active Recall Quiz & Flashcards State
  activeQuiz: VideoQuizResponse | null
  setActiveQuiz: (quiz: VideoQuizResponse | null) => void
  quizAnswers: Record<string, number>
  setQuizAnswer: (questionId: string, optionIndex: number) => void
  resetQuizAnswers: () => void

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
  activeStage: 'home',
  setActiveStage: (activeStage) => set({ activeStage }),
  isSidebarExpanded: false,
  setIsSidebarExpanded: (isSidebarExpanded) => set({ isSidebarExpanded }),
  toggleSidebar: (expanded) =>
    set((state) => ({
      isSidebarExpanded: expanded !== undefined ? expanded : !state.isSidebarExpanded,
    })),

  omniSearchQuery: '',
  setOmniSearchQuery: (omniSearchQuery) => set({ omniSearchQuery }),

  isAddUrlOpen: false,
  setIsAddUrlOpen: (isAddUrlOpen) => set({ isAddUrlOpen }),

  appearance:
    (typeof window !== 'undefined' &&
      (localStorage.getItem('studytube_appearance') as 'light' | 'dark' | 'system')) ||
    'dark',
  setAppearance: (appearance) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studytube_appearance', appearance)
    }
    set({ appearance })
  },
  curationSensitivity: 85,
  setCurationSensitivity: (curationSensitivity) => set({ curationSensitivity }),
  antiClickbaitEnabled: true,
  setAntiClickbaitEnabled: (antiClickbaitEnabled) => set({ antiClickbaitEnabled }),
  autoExportOnFinish: true,
  setAutoExportOnFinish: (autoExportOnFinish) => set({ autoExportOnFinish }),
  wikilinkMatchingEnabled: true,
  setWikilinkMatchingEnabled: (wikilinkMatchingEnabled) => set({ wikilinkMatchingEnabled }),
  agentFrequencyHours: 4,
  setAgentFrequencyHours: (agentFrequencyHours) => set({ agentFrequencyHours }),
  curatorFolderName: 'Agentic Curator',
  setCuratorFolderName: (curatorFolderName) => set({ curatorFolderName }),
  aiModel: (typeof window !== 'undefined' && localStorage.getItem('studytube_ai_model')) || 'gemini-2.5-flash',
  setAiModel: (aiModel) => {
    if (typeof window !== 'undefined') localStorage.setItem('studytube_ai_model', aiModel)
    set({ aiModel })
  },
  aiApiKey: (typeof window !== 'undefined' && localStorage.getItem('studytube_ai_key')) || '',
  setAiApiKey: (aiApiKey) => {
    if (typeof window !== 'undefined') localStorage.setItem('studytube_ai_key', aiApiKey)
    set({ aiApiKey })
  },
  aiTemperature: 0.2,
  setAiTemperature: (aiTemperature) => set({ aiTemperature }),
  aiMaxTokens: 4096,
  setAiMaxTokens: (aiMaxTokens) => set({ aiMaxTokens }),
  strictCodeBlocks: true,
  setStrictCodeBlocks: (strictCodeBlocks) => set({ strictCodeBlocks }),
  desktopNotificationsEnabled: (typeof window !== 'undefined' && localStorage.getItem('studytube_notif_desktop') === 'true') || false,
  setDesktopNotificationsEnabled: (desktopNotificationsEnabled) => {
    if (typeof window !== 'undefined') localStorage.setItem('studytube_notif_desktop', String(desktopNotificationsEnabled))
    set({ desktopNotificationsEnabled })
  },
  completionSoundEnabled: true,
  setCompletionSoundEnabled: (completionSoundEnabled) => set({ completionSoundEnabled }),
  radarHighSignalAlerts: true,
  setRadarHighSignalAlerts: (radarHighSignalAlerts) => set({ radarHighSignalAlerts }),
  flashcardReviewReminders: true,
  setFlashcardReviewReminders: (flashcardReviewReminders) => set({ flashcardReviewReminders }),
  stepProgressToasts: true,
  setStepProgressToasts: (stepProgressToasts) => set({ stepProgressToasts }),

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

  // Player defaults
  isPlayerOpen: false,
  isFloatingPlayer: false,
  playerSeekSeconds: null,
  playerActionCounter: 0,
  seekToTimestamp: (timestamp) => {
    const sec =
      typeof timestamp === 'number'
        ? timestamp
        : parseTimestampToSeconds(timestamp)
    set((state) => ({
      isPlayerOpen: true,
      isFloatingPlayer: state.activeStage !== 'curate' ? true : state.isFloatingPlayer,
      playerSeekSeconds: sec,
      playerActionCounter: state.playerActionCounter + 1,
    }))
  },
  togglePlayer: (open) =>
    set((state) => ({ isPlayerOpen: open ?? !state.isPlayerOpen })),
  setIsFloatingPlayer: (isFloatingPlayer) => set({ isFloatingPlayer }),

  // Quiz defaults
  activeQuiz: null,
  setActiveQuiz: (activeQuiz) => set({ activeQuiz }),
  quizAnswers: {},
  setQuizAnswer: (questionId, optionIndex) =>
    set((state) => ({
      quizAnswers: { ...state.quizAnswers, [questionId]: optionIndex },
    })),
  resetQuizAnswers: () => set({ quizAnswers: {} }),

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
      activeQuiz: null,
      quizAnswers: {},
      isPlayerOpen: false,
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
      activeQuiz: null,
      quizAnswers: {},
      isPlayerOpen: false,
    }),
}))
