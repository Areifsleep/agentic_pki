import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { api } from './lib/api'
import { useVideoCuratorStore } from './features/video_curator/hooks/useVideoCuratorStore'
import { useTheme } from './features/video_curator/hooks/useTheme'
import { TopHeader } from './features/video_curator/components/TopHeader'
import { MinimalistRail } from './features/video_curator/components/MinimalistRail'
import { AddUrlModal } from './features/video_curator/components/AddUrlModal'
import { HomeFeed } from './features/video_curator/components/HomeFeed'
import { MyVaultView } from './features/video_curator/components/MyVaultView'
import { FocusStudio } from './features/video_curator/components/FocusStudio'
import { LibraryView } from './features/video_curator/components/LibraryView'
import { HistoryView } from './features/video_curator/components/HistoryView'
import { SettingsView } from './features/video_curator/components/SettingsView'
import { CommandDeck } from './features/video_curator/components/CommandDeck'
import { ReadingSanctuary } from './features/video_curator/components/ReadingSanctuary'
import { VaultSettingsModal } from './features/video_curator/components/VaultSettingsModal'
import { EmbeddedVideoCompanion } from './features/video_curator/components/EmbeddedVideoCompanion'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function MainStage() {
  const {
    setVaultPath,
    status,
    activeStage,
    isRadarLoading,
    isFloatingPlayer,
    toggleSidebar,
  } = useVideoCuratorStore()
  const { isDark } = useTheme()
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  useEffect(() => {
    // Check backend health and vault path on mount
    api
      .get<{ status: string; vault_path_configured: string }>('/health')
      .then((res) => {
        if (res.data?.status === 'healthy') {
          setBackendOnline(true)
          if (res.data.vault_path_configured) {
            setVaultPath(res.data.vault_path_configured)
          }
        } else {
          setBackendOnline(false)
        }
      })
      .catch(() => {
        setBackendOnline(false)
      })
  }, [setVaultPath])

  const isProcessing = status === 'PROCESSING' || isRadarLoading

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col font-sans antialiased relative transition-colors ${
        isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#f9f9fb] text-[#18181b]'
      }`}
    >
      {/* Ambient Progress Bar at the top edge */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-[#eeece7] z-50 overflow-hidden">
          <div className="w-1/3 h-full bg-[#17171c] animate-ambient-progress" />
        </div>
      )}

      {/* Global Universal Header matching StudyTube Navigation */}
      <TopHeader
        backendOnline={backendOnline}
        onToggleSidebar={() => toggleSidebar()}
      />

      {/* Dynamic Stage: Sidebar Rail + Contextual Workspace */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
        {/* StudyTube Left Rail / Expandable Sidebar */}
        <MinimalistRail backendOnline={backendOnline} />

        {/* 1. Home / Learning Radar Feed */}
        {(activeStage === 'home' || activeStage === 'radar') && <HomeFeed />}

        {/* 2. My Vault Dashboard (Screen 4) */}
        {activeStage === 'vault' && <MyVaultView />}

        {/* 3. Focus Studio (Screen 6) */}
        {activeStage === 'focus' && <FocusStudio />}

        {/* 4. Library & Key Timestamps (Screen 5) */}
        {activeStage === 'library' && <LibraryView />}

        {/* 5. Watch & Study History (Screen 3) */}
        {activeStage === 'history' && <HistoryView />}

        {/* 6. Settings & Engine Configuration (Screen 2) */}
        {activeStage === 'settings' && <SettingsView />}

        {/* 7. Active Video Curation & Synthesis Workspace (Command Deck & Reading Sanctuary) */}
        {activeStage === 'curate' && (
          <div className="flex-1 flex flex-row h-full min-h-0 overflow-hidden">
            <CommandDeck />
            <ReadingSanctuary />
          </div>
        )}
      </div>

      {/* Global Add URL Modal */}
      <AddUrlModal />

      {/* Global Floating Video Companion */}
      {isFloatingPlayer && <EmbeddedVideoCompanion mode="floating" />}

      {/* Global Obsidian Vault Settings Modal */}
      <VaultSettingsModal />

      {/* Toast Feedback */}
      <Toaster
        position="bottom-right"
        theme={isDark ? 'dark' : 'light'}
        richColors
        closeButton
      />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainStage />
    </QueryClientProvider>
  )
}
