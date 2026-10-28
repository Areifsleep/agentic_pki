import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { api } from './lib/api'
import { useVideoCuratorStore } from './features/video_curator/hooks/useVideoCuratorStore'
import { MinimalistRail } from './features/video_curator/components/MinimalistRail'
import { CommandDeck } from './features/video_curator/components/CommandDeck'
import { ReadingSanctuary } from './features/video_curator/components/ReadingSanctuary'
import { FocusStudio } from './features/video_curator/components/FocusStudio'
import { RadarCatalog } from './features/video_curator/components/RadarCatalog'
import { VaultMasterDetail } from './features/video_curator/components/VaultMasterDetail'
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
  const { setVaultPath, status, activeStage, isRadarLoading, isFloatingPlayer } =
    useVideoCuratorStore()
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f9f9fb] text-[#18181b] font-sans antialiased relative">
      {/* Ambient 2px Progress Bar at the top edge */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-[#eeece7] z-50 overflow-hidden">
          <div className="w-1/3 h-full bg-[#17171c] animate-ambient-progress" />
        </div>
      )}

      {/* Dynamic Stage: Adaptive Contextual Workspace */}
      <div className="flex-1 flex flex-row h-full overflow-hidden">
        {/* Minimalist Rail (~56px) */}
        <MinimalistRail backendOnline={backendOnline} />

        {/* Stage 1: Kurasi Video Aktif (Split Stage) */}
        {activeStage === 'curate' && (
          <div className="flex-1 flex flex-row h-full overflow-hidden">
            <CommandDeck />
            <ReadingSanctuary />
          </div>
        )}

        {/* Stage 2: Autonomous Learning Radar (Full-Width Catalog) */}
        {activeStage === 'radar' && <RadarCatalog />}

        {/* Stage 3: Focus Studio / my_focus.md Configuration */}
        {activeStage === 'focus' && <FocusStudio />}

        {/* Stage 4: Riwayat Vault & Chat Multi-Catatan (Master-Detail) */}
        {activeStage === 'vault' && <VaultMasterDetail />}
      </div>

      {/* Global Floating Video Companion */}
      {isFloatingPlayer && <EmbeddedVideoCompanion mode="floating" />}

      {/* Global Obsidian Vault Settings Modal */}
      <VaultSettingsModal />

      {/* Toast Feedback */}
      <Toaster position="bottom-right" theme="light" richColors closeButton />
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
