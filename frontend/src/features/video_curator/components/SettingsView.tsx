import { useState, useEffect } from 'react'
import {
  Sliders,
  FolderSync,
  Cpu,
  Bell,
  Shield,
  Copy,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Loader2,
  Key,
  ExternalLink,
  Volume2,
  Trash2,
  RefreshCw,
  Download,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'
import type { VaultSettings, SummaryMode } from '../types'

export function SettingsView() {
  const {
    vaultPath,
    setVaultPath,
    setVaultSettings,
    curatorFolderName,
    setCuratorFolderName,
    appearance,
    setAppearance,
    curationSensitivity,
    setCurationSensitivity,
    antiClickbaitEnabled,
    setAntiClickbaitEnabled,
    autoExportOnFinish,
    setAutoExportOnFinish,
    wikilinkMatchingEnabled,
    setWikilinkMatchingEnabled,
    agentFrequencyHours,
    setAgentFrequencyHours,
    config,
    setConfigMode,
    // AI Settings
    aiModel,
    setAiModel,
    aiApiKey,
    setAiApiKey,
    aiTemperature,
    setAiTemperature,
    aiMaxTokens,
    setAiMaxTokens,
    strictCodeBlocks,
    setStrictCodeBlocks,
    // Notification Settings
    desktopNotificationsEnabled,
    setDesktopNotificationsEnabled,
    completionSoundEnabled,
    setCompletionSoundEnabled,
    radarHighSignalAlerts,
    setRadarHighSignalAlerts,
    flashcardReviewReminders,
    setFlashcardReviewReminders,
    stepProgressToasts,
    setStepProgressToasts,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()

  const [activeCategory, setActiveCategory] = useState<'general' | 'obsidian' | 'ai' | 'notifications' | 'privacy'>('general')
  const [localVaultPath, setLocalVaultPath] = useState(vaultPath || 'E:\\TUGAS\\Agentic\\agentic_pki\\my_vault')
  const [localFolder, setLocalFolder] = useState(curatorFolderName || 'Agentic Curator')
  const [localApiKey, setLocalApiKey] = useState(aiApiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [vaultStats, setVaultStats] = useState<{ total_notes: number; exists: boolean } | null>(null)

  useEffect(() => {
    // Fetch initial settings from backend
    api.get<VaultSettings>('/api/v1/vault/settings')
      .then((res) => {
        if (res.data?.success) {
          setVaultSettings(res.data)
          if (res.data.vault_path) {
            setLocalVaultPath(res.data.vault_path)
            setVaultPath(res.data.vault_path)
          }
          if (res.data.curator_folder_name) {
            setLocalFolder(res.data.curator_folder_name)
            setCuratorFolderName(res.data.curator_folder_name)
          }
          if (res.data.gemini_model) {
            setAiModel(res.data.gemini_model)
          }
          setVaultStats({
            total_notes: res.data.total_notes,
            exists: res.data.exists,
          })
        }
      })
      .catch(() => {})
  }, [setVaultPath, setVaultSettings, setCuratorFolderName, setAiModel])

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<VaultSettings>('/api/v1/vault/settings', {
        vault_path: localVaultPath.trim(),
        curator_folder_name: localFolder.trim(),
      })
      if (res.data?.success) {
        setVaultSettings(res.data)
        setVaultStats({
          total_notes: res.data.total_notes,
          exists: res.data.exists,
        })
        setTestResult(`Vault verified. Read/write access granted (${res.data.total_notes} notes currently cataloged).`)
        toast.success('Koneksi Obsidian Vault berhasil diverifikasi!')
      } else {
        setTestResult(res.data?.message || 'Folder tidak dapat diakses')
        toast.error('Gagal mengakses folder vault')
      }
    } catch {
      setTestResult('Gagal menghubungi backend untuk verifikasi vault')
      toast.error('Gagal memverifikasi path vault')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const res = await api.post<VaultSettings>('/api/v1/vault/settings', {
        vault_path: localVaultPath.trim(),
        curator_folder_name: localFolder.trim(),
        gemini_model: aiModel,
        gemini_api_key: localApiKey.trim() || undefined,
      })
      if (res.data?.success) {
        setVaultSettings(res.data)
        setVaultPath(localVaultPath.trim())
        setCuratorFolderName(localFolder.trim())
        if (localApiKey.trim()) {
          setAiApiKey(localApiKey.trim())
        }
        toast.success('Pengaturan sistem berhasil disimpan dan disinkronkan!')
      }
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = () => {
    setCurationSensitivity(85)
    setAntiClickbaitEnabled(true)
    setAppearance('dark')
    setAutoExportOnFinish(true)
    setWikilinkMatchingEnabled(true)
    setAgentFrequencyHours(4)
    setAiModel('gemini-2.5-flash')
    setAiTemperature(0.2)
    setAiMaxTokens(4096)
    setStrictCodeBlocks(true)
    setDesktopNotificationsEnabled(false)
    setCompletionSoundEnabled(true)
    setRadarHighSignalAlerts(true)
    setFlashcardReviewReminders(true)
    setStepProgressToasts(true)
    toast.info('Pengaturan dikembalikan ke konfigurasi default.')
  }

  const handleCopyPath = () => {
    navigator.clipboard.writeText(localVaultPath)
    toast.success('Path vault disalin ke clipboard.')
  }

  const handleOpenInObsidian = () => {
    const vaultUri = `obsidian://open?vault=${encodeURIComponent(localVaultPath.split(/[\\/]/).pop() || 'ObsidianVault')}`
    window.open(vaultUri, '_blank')
    toast.info('Membuka Obsidian desktop application...')
  }

  const handlePlaySoundTest = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.3)
      toast.success('Chime audio berhasil dimainkan!')
    } catch {
      toast.error('Web Audio API tidak didukung browser ini.')
    }
  }

  const handleRequestDesktopNotif = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser ini tidak mendukung Desktop Notification.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setDesktopNotificationsEnabled(true)
      new Notification('StudyTube AI Curator', {
        body: 'Notifikasi desktop aktif! Anda akan mendapatkan pembaruan saat sintesis video selesai.',
        icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
      })
      toast.success('Izin notifikasi desktop berhasil diberikan!')
    } else {
      setDesktopNotificationsEnabled(false)
      toast.error('Izin notifikasi ditolak oleh pengguna.')
    }
  }

  const handleClearHistory = () => {
    if (confirm('Yakin ingin menghapus seluruh riwayat video yang ditonton secara lokal?')) {
      localStorage.removeItem('studytube_watch_history')
      window.dispatchEvent(new Event('studytube_history_updated'))
      toast.success('Riwayat tontonan lokal berhasil dibersihkan.')
    }
  }

  const handleRebuildIndex = async () => {
    try {
      const res = await api.get<VaultSettings>('/api/v1/vault/settings')
      if (res.data?.success) {
        setVaultStats({
          total_notes: res.data.total_notes,
          exists: res.data.exists,
        })
        toast.success(`Indeks vault diperbarui: ${res.data.total_notes} catatan terindeks.`)
      }
    } catch {
      toast.error('Gagal memperbarui indeks catatan vault.')
    }
  }

  const handleExportConfig = () => {
    const configSnapshot = {
      vaultPath: localVaultPath,
      curatorFolderName: localFolder,
      curationSensitivity,
      antiClickbaitEnabled,
      autoExportOnFinish,
      wikilinkMatchingEnabled,
      agentFrequencyHours,
      aiModel,
      aiTemperature,
      aiMaxTokens,
      strictCodeBlocks,
      appearance,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(configSnapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'studytube-config-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Konfigurasi berhasil diekspor ke studytube-config-backup.json')
  }

  return (
    <div
      className={`flex-1 h-full min-h-0 overflow-y-auto flex flex-col select-none font-sans transition-colors pb-24 ${
        isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#f9f9fb] text-[#18181b]'
      }`}
    >
      {/* Top Header Banner */}
      <div
        className={`border-b px-8 py-5 sticky top-0 z-20 transition-colors ${
          isDark
            ? 'bg-[#141419]/95 backdrop-blur-md border-[#27272a]'
            : 'bg-white/95 backdrop-blur-md border-[#e4e4e7] shadow-xs'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDark
                  ? 'bg-[#003c33]/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Engine Configuration
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                    isDark
                      ? 'bg-emerald-950/70 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  v3.4-synced
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                Manage autonomous curation thresholds, Obsidian vault endpoints, and AI models.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-[#17171c] hover:bg-black text-white'
              }`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (4 Cols): Navigation Categories */}
        <div className="lg:col-span-4 space-y-2">
          {[
            { id: 'general', label: 'Curation Engine & Filtering', icon: Sliders, badge: 'Active' },
            { id: 'obsidian', label: 'Obsidian & Vault Sync', icon: FolderSync, badge: `${vaultStats?.total_notes || 0} Notes` },
            { id: 'ai', label: 'AI Model & Tokens', icon: Cpu, badge: aiModel.replace('gemini-', '') },
            { id: 'notifications', label: 'Watchdog & Notifications', icon: Bell },
            { id: 'privacy', label: 'Local Security & Privacy', icon: Shield, badge: 'Zero DB' },
          ].map((item) => {
            const Icon = item.icon
            const active = activeCategory === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveCategory(item.id as any)}
                className={`w-full p-3 rounded-xl flex items-center justify-between text-left text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? isDark
                      ? 'bg-[#17171c] text-white border border-[#27272a] shadow-xs'
                      : 'bg-white text-[#18181b] border border-[#e4e4e7] shadow-xs'
                    : isDark
                      ? 'text-[#a1a1aa] hover:bg-[#141419] hover:text-white'
                      : 'text-[#71717a] hover:bg-white hover:text-[#18181b]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? (isDark ? 'text-white' : 'text-[#18181b]') : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      active
                        ? isDark
                          ? 'bg-[#27272a] text-zinc-200'
                          : 'bg-[#f4f4f5] text-[#18181b]'
                        : isDark
                          ? 'bg-[#1c1c22] text-zinc-500'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          {/* Quick Vault Status Card on Left Sidebar */}
          <div
            className={`mt-6 p-4 rounded-xl border text-xs space-y-2.5 ${
              isDark ? 'bg-[#141419] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Vault Environment
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="font-mono text-[11px] truncate text-emerald-500">
              {localVaultPath}
            </p>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-200/20">
              <span className="text-zinc-400">Total Markdown Notes:</span>
              <span className="font-bold font-mono">{vaultStats?.total_notes ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Right Column (8 Cols): Selected Category Panels */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: GENERAL CURATION ENGINE */}
          {activeCategory === 'general' && (
            <div
              className={`border rounded-2xl p-6 space-y-6 transition-colors ${
                isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Curation Sensitivity & Filtering
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  Set the technical threshold before videos are indexed into your learning stream.
                </p>
              </div>

              {/* Slider Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                        Minimum Signal Score
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                          isDark ? 'bg-[#27272a] text-zinc-200' : 'bg-[#17171c] text-white'
                        }`}
                      >
                        Strict (≥ {curationSensitivity}% match)
                      </span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      Threshold benchmark before injecting peer-reviewed videos into your focus recommendations.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold font-mono ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                      {curationSensitivity}%
                    </span>
                    <p className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-[#71717a]'}`}>
                      Similarity Cutoff
                    </p>
                  </div>
                </div>

                <input
                  type="range"
                  min="50"
                  max="98"
                  value={curationSensitivity}
                  onChange={(e) => setCurationSensitivity(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />

                <div className={`flex items-center justify-between text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  <span>● Exploratory (50%)</span>
                  <span className="text-emerald-500 font-medium">● Recommended (80-85%)</span>
                  <span>● Ultra-Strict (98%)</span>
                </div>
              </div>

              {/* Default Summary Depth */}
              <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'}`}>
                <div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Default Synthesis Depth Mode
                  </span>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Preset depth applied when curating videos from Home Feed or Radar.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: 'cheatsheet', label: 'Quick Cheatsheet', desc: 'Dense takeaways & tables' },
                    { mode: 'deepdive', label: 'Deep Dive Guide', desc: 'Exhaustive architectural breakdown' },
                    { mode: 'code_action', label: 'Code & Action', desc: 'Executable snippets & CLI recipes' },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setConfigMode(item.mode as SummaryMode)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        config.mode === item.mode
                          ? isDark
                            ? 'bg-[#1f1f25] border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500'
                          : isDark
                            ? 'bg-[#121216] border-[#27272a] hover:bg-[#1a1a20]'
                            : 'bg-white border-[#e4e4e7] hover:bg-[#f9f9fb]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Anti-Clickbait Sanitizer Toggle */}
              <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                        Anti-Clickbait Sanitizer
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      Automatically strip sensationalist, all-caps titles and emotional thumbnail overlays. Replace them with technical takeaway summaries and commit tags.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={antiClickbaitEnabled}
                      onChange={(e) => setAntiClickbaitEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      isDark
                        ? 'bg-[#27272a] peer-checked:bg-emerald-600'
                        : 'bg-zinc-200 peer-checked:bg-[#17171c]'
                    }`} />
                  </label>
                </div>

                <div
                  className={`p-3 rounded-xl font-mono text-xs ${
                    isDark ? 'bg-[#121216] text-zinc-300 border border-[#27272a]' : 'bg-[#f4f4f5] text-[#52525b]'
                  }`}
                >
                  <span className={isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}>Example: </span>
                  <span className="line-through text-rose-500">"REACT IS DEAD!?"</span>
                  <span> → </span>
                  <span className="text-emerald-500 font-semibold">"[React 19] Action Hooks & Compiler Specs"</span>
                </div>
              </div>

              {/* Stealth Study Mode Appearance */}
              <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'}`}>
                <div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Canvas Appearance Tone
                  </span>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Configure visual contrast during intense coding and dual-monitor splits.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAppearance('light')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      appearance === 'light'
                        ? isDark
                          ? 'border-white bg-[#27272a] shadow-xs'
                          : 'border-[#17171c] bg-[#f9f9fb] shadow-xs ring-1 ring-[#17171c]'
                        : isDark
                          ? 'border-[#27272a] bg-[#121216] hover:bg-[#1f1f25]'
                          : 'border-[#e4e4e7] bg-white hover:bg-[#f9f9fb]'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left">
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                        Light Mode
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                        Daylight Reading
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppearance('dark')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      appearance === 'dark'
                        ? isDark
                          ? 'border-emerald-500 bg-[#1f1f25] shadow-xs ring-1 ring-emerald-500'
                          : 'border-[#17171c] bg-[#17171c] text-white shadow-xs'
                        : isDark
                          ? 'border-[#27272a] bg-[#121216] hover:bg-[#1f1f25]'
                          : 'border-[#e4e4e7] bg-white hover:bg-[#f9f9fb]'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="text-left">
                      <div className={`text-xs font-semibold ${appearance === 'dark' ? (isDark ? 'text-emerald-400' : 'text-white') : (isDark ? 'text-white' : 'text-[#18181b]')}`}>
                        Dark Stealth
                      </div>
                      <div className={`text-[10px] ${appearance === 'dark' ? (isDark ? 'text-emerald-500/80' : 'text-zinc-400') : (isDark ? 'text-zinc-400' : 'text-[#71717a]')}`}>
                        Midnight OLED
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppearance('system')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      appearance === 'system'
                        ? isDark
                          ? 'border-emerald-500 bg-[#1f1f25] shadow-xs ring-1 ring-emerald-500'
                          : 'border-[#17171c] bg-[#f9f9fb] shadow-xs ring-1 ring-[#17171c]'
                        : isDark
                          ? 'border-[#27272a] bg-[#121216] hover:bg-[#1f1f25]'
                          : 'border-[#e4e4e7] bg-white hover:bg-[#f9f9fb]'
                    }`}
                  >
                    <Laptop className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="text-left">
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                        System Match
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                        OS Synchronized
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OBSIDIAN & VAULT SYNC */}
          {activeCategory === 'obsidian' && (
            <div
              className={`border rounded-2xl p-6 space-y-6 transition-colors ${
                isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-[#27272a]' : 'border-[#e4e4e7]'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                      Obsidian Vault & Bi-directional Sync
                    </h2>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Direct file-system connection with your Obsidian workspace. All synthesized notes are standard Markdown.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenInObsidian}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'border-[#27272a] text-zinc-300 hover:bg-[#27272a]'
                        : 'border-[#e4e4e7] text-zinc-700 hover:bg-[#f4f4f5]'
                    }`}
                    title="Launch native Obsidian application"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                    <span>Open in Obsidian</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-[#003c33]/40 hover:bg-[#003c33]/60 border-emerald-500/30 text-emerald-400'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>

              {/* Local Vault Path Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Local Vault Root Path
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Absolute File System Directory
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={localVaultPath}
                      onChange={(e) => setLocalVaultPath(e.target.value)}
                      placeholder="E:\Obsidian\EngineeringVault"
                      className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-mono transition-colors focus:outline-none ${
                        isDark
                          ? 'bg-[#121216] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                          : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:bg-white focus:border-[#17171c]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className={`absolute right-3 top-2.5 transition-colors cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:text-white' : 'text-[#71717a] hover:text-[#18181b]'
                      }`}
                      title="Salin path"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{testResult}</span>
                  </div>
                )}
              </div>

              {/* Subfolder Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Curator Dedicated Subfolder
                  </label>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                    Prevents polluting root notes
                  </span>
                </div>
                <input
                  type="text"
                  value={localFolder}
                  onChange={(e) => setLocalFolder(e.target.value)}
                  placeholder="Agentic Curator"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-colors focus:outline-none ${
                    isDark
                      ? 'bg-[#121216] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                      : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:bg-white focus:border-[#17171c]'
                  }`}
                />
              </div>

              {/* Auto-Export & Wikilink Matching Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                    isDark ? 'border-[#27272a] bg-[#121216]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                      Auto-Export on Finish
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      Export formatted frontmatter, timestamp markers, and code blocks to .md immediately when video synthesis ends.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoExportOnFinish}
                      onChange={(e) => setAutoExportOnFinish(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-10 h-5 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                      isDark
                        ? 'bg-[#27272a] peer-checked:bg-emerald-600'
                        : 'bg-zinc-200 peer-checked:bg-[#17171c]'
                    }`} />
                  </label>
                </div>

                <div
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                    isDark ? 'border-[#27272a] bg-[#121216]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                      Wikilink [[Syntax]] Auto-Linker
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                      Automatically link video keywords to existing notes with code-block & markdown token shield.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={wikilinkMatchingEnabled}
                      onChange={(e) => setWikilinkMatchingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-10 h-5 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                      isDark
                        ? 'bg-[#27272a] peer-checked:bg-emerald-600'
                        : 'bg-zinc-200 peer-checked:bg-[#17171c]'
                    }`} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI MODEL & TOKENS */}
          {activeCategory === 'ai' && (
            <div
              className={`border rounded-2xl p-6 space-y-6 transition-colors ${
                isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    AI Engine & Model Selection
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  Configure LLM model tier, temperature for deterministic code extraction, and token constraints.
                </p>
              </div>

              {/* Model Choice Cards */}
              <div className="space-y-3">
                <label className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  Active LLM Provider Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'gemini-2.5-flash',
                      title: 'Gemini 2.5 Flash',
                      desc: 'High speed, 1M context, best for video synthesis & radar triage.',
                      badge: 'Recommended',
                    },
                    {
                      id: 'gemini-2.5-pro',
                      title: 'Gemini 2.5 Pro',
                      desc: 'Deep multi-step reasoning & complex architecture synthesis.',
                      badge: 'Deep Reasoning',
                    },
                    {
                      id: 'gemini-3.5-flash-lite',
                      title: 'Gemini 3.5 Lite',
                      desc: 'Fastest token throughput, minimum latency for Q&A checks.',
                      badge: 'Fastest',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAiModel(m.id)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        aiModel === m.id
                          ? isDark
                            ? 'bg-[#1f1f25] border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500'
                          : isDark
                            ? 'bg-[#121216] border-[#27272a] hover:bg-[#1f1f25]'
                            : 'bg-white border-[#e4e4e7] hover:bg-[#f9f9fb]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{m.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Configuration */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gemini API Key</span>
                  </label>
                  <span className="text-[11px] text-emerald-500 font-mono">
                    Stored securely in .curator_config.json
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="AIzaSy... (leave blank to use backend .env)"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs font-mono transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-[#121216] border-[#27272a] text-white placeholder-zinc-500 focus:border-[#3f3f46]'
                        : 'bg-[#f9f9fb] border-[#e4e4e7] text-[#18181b] placeholder-[#a1a1aa] focus:bg-white focus:border-[#17171c]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={`absolute right-3 top-2.5 transition-colors cursor-pointer ${
                      isDark ? 'text-zinc-400 hover:text-white' : 'text-[#71717a] hover:text-[#18181b]'
                    }`}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Temperature & Token Constraints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Generation Temperature</span>
                    <span className="font-mono text-xs text-emerald-500 font-bold">{aiTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiTemperature}
                    onChange={(e) => setAiTemperature(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-400">
                    0.1-0.2: Deterministic for code snippets. 0.7+: Creative exploratory.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Max Output Tokens</span>
                    <span className="font-mono text-xs text-emerald-500 font-bold">{aiMaxTokens}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[2048, 4096, 8192].map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setAiMaxTokens(tok)}
                        className={`py-1.5 rounded-lg border text-xs font-mono cursor-pointer ${
                          aiMaxTokens === tok
                            ? isDark
                              ? 'bg-white text-black font-bold'
                              : 'bg-[#17171c] text-white font-bold'
                            : isDark
                              ? 'bg-[#121216] border-[#27272a] text-zinc-400'
                              : 'bg-white border-[#e4e4e7] text-zinc-700'
                        }`}
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strict Code Extraction Toggle */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  isDark ? 'border-[#27272a] bg-[#121216]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Strict Markdown Code Blocks</div>
                  <p className="text-[11px] text-zinc-400">
                    Always enforce language identifiers (```python, ```typescript, etc.) on extracted code blocks.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={strictCodeBlocks}
                    onChange={(e) => setStrictCodeBlocks(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-10 h-5 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                    isDark
                      ? 'bg-[#27272a] peer-checked:bg-emerald-600'
                      : 'bg-zinc-200 peer-checked:bg-[#17171c]'
                  }`} />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: WATCHDOG & NOTIFICATIONS */}
          {activeCategory === 'notifications' && (
            <div
              className={`border rounded-2xl p-6 space-y-6 transition-colors ${
                isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Watchdog & Real-Time Alerts
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  Configure system alerts, browser desktop notifications, and audio cues upon synthesis completion.
                </p>
              </div>

              {/* Desktop Notification Integration */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? 'border-[#27272a] bg-[#121216]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold">Browser Desktop Notifications</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Receive OS notifications when background synthesis finishes or when high-signal radar matches arrive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRequestDesktopNotif}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    desktopNotificationsEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isDark
                        ? 'bg-white hover:bg-zinc-200 text-black'
                        : 'bg-[#17171c] hover:bg-black text-white'
                  }`}
                >
                  {desktopNotificationsEnabled ? 'Permission Granted (Test)' : 'Enable Notifications'}
                </button>
              </div>

              {/* Audio Chime Notification */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  isDark ? 'border-[#27272a] bg-[#121216]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold">Synthesis Completion Chime</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Play a subtle harmonic audio ping when a video has finished synthesizing and is ready for review.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handlePlaySoundTest}
                    className="text-xs text-blue-400 hover:underline cursor-pointer"
                  >
                    Test Chime
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completionSoundEnabled}
                      onChange={(e) => setCompletionSoundEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-10 h-5 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                      isDark
                        ? 'bg-[#27272a] peer-checked:bg-emerald-600'
                        : 'bg-zinc-200 peer-checked:bg-[#17171c]'
                    }`} />
                  </label>
                </div>
              </div>

              {/* Other Alerts Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs py-2 border-b border-zinc-200/20">
                  <div>
                    <span className="font-semibold">Autonomous Radar High-Signal Alerts</span>
                    <p className="text-[11px] text-zinc-400">Trigger alert when video exceeds 90% relevance score.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={radarHighSignalAlerts}
                    onChange={(e) => setRadarHighSignalAlerts(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-zinc-200/20">
                  <div>
                    <span className="font-semibold">Active Recall Review Reminders</span>
                    <p className="text-[11px] text-zinc-400">Spaced repetition prompts for pending quiz flashcards.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={flashcardReviewReminders}
                    onChange={(e) => setFlashcardReviewReminders(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-2">
                  <div>
                    <span className="font-semibold">Granular Step Progress Toasts</span>
                    <p className="text-[11px] text-zinc-400">Show pipeline steps (transcript fetch, structuring, note generation).</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={stepProgressToasts}
                    onChange={(e) => setStepProgressToasts(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOCAL SECURITY & PRIVACY */}
          {activeCategory === 'privacy' && (
            <div
              className={`border rounded-2xl p-6 space-y-6 transition-colors ${
                isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                    Local Security & Vault Isolation
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
                  Verify local-first sandbox guarantees, clear ephemeral caches, and backup your configuration.
                </p>
              </div>

              {/* Zero DB Guarantee Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  isDark ? 'bg-[#003c33]/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-emerald-400">100% Local-First & Zero External Database</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    StudyTube stores zero user data on cloud relational databases. Notes are saved directly as transparent Markdown (.md) in your local Obsidian vault, with vault_index.json acting as the self-contained catalog.
                  </p>
                </div>
              </div>

              {/* Vault Boundary Sandbox Indicator */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'border-[#27272a] bg-[#121216]' : 'border-[#e4e4e7] bg-[#f9f9fb]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>Path Traversal Enforcer</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Active & Protected
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Backend API strictly forbids file operations outside your verified vault root boundary (<code className="text-emerald-500">{localVaultPath}</code>).
                </p>
              </div>

              {/* Cache Management & Maintenance */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold">Cache & Storage Management</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleRebuildIndex}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer text-left ${
                      isDark ? 'border-[#27272a] bg-[#121216] hover:bg-[#1e1e24]' : 'border-[#e4e4e7] bg-white hover:bg-[#f9f9fb]'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">Rebuild Vault Index</div>
                      <div className="text-[10px] text-zinc-400">Scan and update vault_index.json</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer text-left ${
                      isDark ? 'border-rose-500/20 bg-[#1e1216] hover:bg-rose-950/30 text-rose-300' : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                    <div>
                      <div className="text-xs font-semibold">Clear Watch History</div>
                      <div className="text-[10px] opacity-80">Purge local-storage watch records</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Backup & Export Configuration */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportConfig}
                  className={`w-full py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isDark ? 'border-[#27272a] hover:bg-[#1e1e24] text-zinc-300' : 'border-[#e4e4e7] hover:bg-[#f4f4f5] text-zinc-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export Engine Configuration Backup (.json)</span>
                </button>
              </div>
            </div>
          )}

          {/* Staged Parameters Footer Bar */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
              isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
            }`}
          >
            <div className={`flex items-center gap-2.5 text-xs ${isDark ? 'text-zinc-400' : 'text-[#71717a]'}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-[#003c33]/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-[#18181b]'}`}>
                  All parameters staged locally
                </p>
                <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-[#a1a1aa]'}`}>
                  Synced with Obsidian & AI Runtime
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetDefaults}
                className={`px-4 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isDark
                    ? 'border-[#27272a] text-zinc-400 hover:text-white hover:bg-[#27272a]'
                    : 'border-[#e4e4e7] text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                  isDark
                    ? 'bg-white hover:bg-zinc-200 text-black'
                    : 'bg-[#17171c] hover:bg-black text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
