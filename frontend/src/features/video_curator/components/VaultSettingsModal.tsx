import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderCog,
  X,
  CheckCircle2,
  FolderPlus,
  Loader2,
  HardDrive,
  Info,
  FolderCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../lib/api'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import type { VaultSettings, UpdateVaultSettingsPayload } from '../types'

export function VaultSettingsModal() {
  const {
    isVaultSettingsOpen,
    setIsVaultSettingsOpen,
    setVaultPath,
    setVaultSettings,
  } = useVideoCuratorStore()
  const queryClient = useQueryClient()

  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  const [inputVaultPath, setInputVaultPath] = useState('')
  const [inputFolderName, setInputFolderName] = useState('Agentic Curator')

  // Fetch current vault settings from backend
  const { data: settingsData, isLoading } = useQuery<VaultSettings>({
    queryKey: ['vault-settings'],
    queryFn: async () => {
      const res = await api.get<VaultSettings>('/api/v1/vault/settings')
      return res.data
    },
    enabled: isVaultSettingsOpen,
  })

  // Render-phase sync to initialize inputs without set-state-in-effect warning
  const currentKey = settingsData
    ? `${settingsData.vault_path}::${settingsData.curator_folder_name}`
    : null
  if (currentKey && currentKey !== syncedKey) {
    setSyncedKey(currentKey)
    setInputVaultPath(settingsData?.vault_path || '')
    setInputFolderName(settingsData?.curator_folder_name || 'Agentic Curator')
  }

  useEffect(() => {
    if (settingsData) {
      setVaultSettings(settingsData)
      setVaultPath(settingsData.curator_vault_path || settingsData.vault_path)
    }
  }, [settingsData, setVaultSettings, setVaultPath])

  // Mutation to update vault settings
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateVaultSettingsPayload) => {
      const res = await api.post<VaultSettings>('/api/v1/vault/settings', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success('Lokasi Obsidian Vault berhasil diperbarui!', {
        description: data.curator_vault_path,
      })
      setVaultPath(data.curator_vault_path)
      setVaultSettings(data)
      queryClient.invalidateQueries({ queryKey: ['vault-settings'] })
      queryClient.invalidateQueries({ queryKey: ['vault-notes'] })
      queryClient.invalidateQueries({ queryKey: ['focus-targets'] })
      setIsVaultSettingsOpen(false)
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Gagal memperbarui lokasi Obsidian Vault.'
      toast.error('Gagal Mengubah Vault', {
        description: detail,
      })
    },
  })

  if (!isVaultSettingsOpen) return null

  const handleSave = () => {
    if (!inputVaultPath.trim()) {
      toast.error('Path Direktori Kosong', {
        description: 'Silakan masukkan path direktori Obsidian Vault yang valid.',
      })
      return
    }
    updateMutation.mutate({
      vault_path: inputVaultPath.trim(),
      curator_folder_name: inputFolderName.trim() || 'Agentic Curator',
    })
  }

  const handlePresetSelect = (presetPath: string) => {
    setInputVaultPath(presetPath)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e4e4e7] overflow-hidden flex flex-col scale-in-95 duration-200 animate-in"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#f4f4f5] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#17171c] text-white flex items-center justify-center shadow-xs">
              <FolderCog className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#18181b] tracking-tight">
                Pengaturan Obsidian Vault
              </h3>
              <p className="text-xs text-[#71717a]">
                Tentukan lokasi penyimpanan berkas markdown di komputer lokal Anda
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVaultSettingsOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#71717a]">
              <Loader2 className="w-6 h-6 animate-spin text-[#17171c]" />
              <span className="text-xs font-medium">Memuat konfigurasi direktori...</span>
            </div>
          ) : (
            <>
              {/* Field 1: Obsidian Vault Root Path */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#27272a] uppercase tracking-wider flex items-center justify-between">
                  <span>Lokasi Direktori Obsidian Vault</span>
                  {settingsData?.exists ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-600">
                      <FolderCheck className="w-3.5 h-3.5" /> Terdeteksi di Komputer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-normal text-amber-600">
                      <FolderPlus className="w-3.5 h-3.5" /> Akan Dibuat Otomatis
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717a]">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputVaultPath}
                    onChange={(e) => setInputVaultPath(e.target.value)}
                    placeholder="/home/username/Documents/ObsidianVault"
                    className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-[#ffffff] border border-[#d4d4d8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#17171c] focus:border-transparent text-[#18181b] transition-all shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-[#71717a] leading-relaxed">
                  Masukkan absolute path ke root folder Obsidian Vault Anda (contoh:{' '}
                  <code className="px-1 py-0.5 bg-[#f4f4f5] rounded text-[10px]">~/Documents/ObsidianVault</code> atau{' '}
                  <code className="px-1 py-0.5 bg-[#f4f4f5] rounded text-[10px]">D:\Notes\Obsidian</code>).
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[#71717a]">Preset Rekomendasi:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('~/Documents/ObsidianVault')}
                    className="px-2.5 py-1 text-xs bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#27272a] rounded-lg border border-[#e4e4e7] transition-colors cursor-pointer font-mono"
                  >
                    ~/Documents/ObsidianVault
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('~/ObsidianVault')}
                    className="px-2.5 py-1 text-xs bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#27272a] rounded-lg border border-[#e4e4e7] transition-colors cursor-pointer font-mono"
                  >
                    ~/ObsidianVault
                  </button>
                </div>
              </div>

              {/* Field 2: Dedicated Curator Subfolder */}
              <div className="space-y-2 pt-2 border-t border-[#f4f4f5]">
                <label className="text-xs font-semibold text-[#27272a] uppercase tracking-wider block">
                  Subfolder Khusus Kurasi
                </label>
                <input
                  type="text"
                  value={inputFolderName}
                  onChange={(e) => setInputFolderName(e.target.value)}
                  placeholder="Agentic Curator"
                  className="w-full px-3.5 py-2 text-xs bg-[#ffffff] border border-[#d4d4d8] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#17171c] focus:border-transparent text-[#18181b] transition-all shadow-2xs"
                />
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#64748b] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    Semua catatan kurasi, pilar <code className="font-mono text-[10px]">my_focus.md</code>, dan katalog{' '}
                    <code className="font-mono text-[10px]">vault_index.json</code> akan ditempatkan di dalam subfolder ini agar tidak tercampur dengan catatan pribadi Anda.
                  </p>
                </div>
              </div>

              {/* Current Status Box */}
              {settingsData && (
                <div className="p-3 bg-[#fafafa] rounded-xl border border-[#f4f4f5] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#71717a]">
                    <span>Catatan tersimpan saat ini:</span>
                    <span className="font-semibold text-[#18181b]">{settingsData.total_notes} berkas</span>
                  </div>
                  <div className="flex items-center justify-between text-[#71717a] font-mono text-[11px] truncate">
                    <span>Target Folder:</span>
                    <span className="truncate max-w-[260px] text-[#18181b]" title={settingsData.curator_vault_path}>
                      {settingsData.curator_vault_path}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#f4f4f5] bg-[#fafafa] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsVaultSettingsOpen(false)}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#17171c] hover:bg-[#27272a] rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terapkan & Simpan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
