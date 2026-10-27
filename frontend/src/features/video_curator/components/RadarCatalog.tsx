import { useState, useEffect } from 'react'
import {
  Radar,
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  Loader2,
  TrendingUp,
  EyeOff,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useDiscoverRadarMutation,
  useLoadMoreRadarMutation,
  useSynthesizeVideoMutation,
  useFocusTargetsQuery,
} from '../hooks/useVideoCuratorMutations'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import type { RadarSortOption } from '../types'

export function RadarCatalog() {
  const {
    radarVideos,
    curateVideoFromRadar,
    config,
    radarSortBy,
    setRadarSortBy,
    radarHasMore,
    isRadarLoadingMore,
    dismissVideo,
  } = useVideoCuratorStore()

  const { data: focusData } = useFocusTargetsQuery()
  const discoverMutation = useDiscoverRadarMutation()
  const loadMoreMutation = useLoadMoreRadarMutation()
  const synthesizeMutation = useSynthesizeVideoMutation()

  const [queryInput, setQueryInput] = useState('')

  const topics = focusData?.topics || []
  const variations = focusData?.query_variations || {}

  // Auto-discover on mount if radarVideos is empty
  useEffect(() => {
    if (radarVideos.length === 0 && !discoverMutation.isPending) {
      discoverMutation.mutate({ sort_by: radarSortBy })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    discoverMutation.mutate({
      query: queryInput.trim() || undefined,
      sort_by: radarSortBy,
    })
  }

  const handleChipClick = (topic: string) => {
    setQueryInput(topic)
    discoverMutation.mutate({
      query: topic,
      sort_by: radarSortBy,
    })
  }

  const handleSortChange = (newSort: RadarSortOption) => {
    setRadarSortBy(newSort)
    discoverMutation.mutate({
      query: queryInput.trim() || undefined,
      sort_by: newSort,
    })
  }

  const handleCurateAndPreview = (videoId: string) => {
    curateVideoFromRadar(videoId)
    synthesizeMutation.mutate({
      video_url: `https://www.youtube.com/watch?v=${videoId}`,
      config,
    })
  }

  const handlePickRandomVariation = () => {
    const allVars = Object.values(variations).flat()
    if (allVars.length > 0) {
      const picked = allVars[Math.floor(Math.random() * allVars.length)]
      setQueryInput(picked)
      discoverMutation.mutate({
        query: picked,
        sort_by: radarSortBy,
      })
      toast.info(`Mengeksplorasi variasi sub-topik: "${picked}"`)
    }
  }

  const isScanning = discoverMutation.isPending

  const sortTabs: { id: RadarSortOption; label: string }[] = [
    { id: 'relevance', label: 'Relevansi' },
    { id: 'latest', label: 'Terbaru' },
    { id: 'most_viewed', label: 'Terpopuler' },
  ]

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-[#f9f9fb] flex flex-col select-none">
      {/* Top Search & Pillars Band */}
      <div className="bg-white border-b border-[#e4e4e7] px-8 py-4 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Search bar & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <form onSubmit={handleSearch} className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari topik spesifik untuk dievaluasi radar (misal: FastAPI Concurrency, Retinol Skincare)..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                disabled={isScanning}
                className="w-full pl-9 pr-24 py-2.5 bg-[#f9f9fb] border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder-[#a1a1aa] focus:outline-none focus:border-[#17171c] focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={isScanning}
                className="absolute right-2 px-3 py-1.5 bg-[#17171c] text-white text-[11px] font-medium rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <span>Cari</span>
                )}
              </button>
            </form>

            {/* YouTube Native Sort Filter Selector */}
            <div className="flex items-center bg-[#f4f4f5] p-1 rounded-xl border border-[#e4e4e7] text-xs self-start sm:self-auto shrink-0">
              {sortTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSortChange(tab.id)}
                  disabled={isScanning}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    radarSortBy === tab.id
                      ? 'bg-white text-[#18181b] shadow-xs'
                      : 'text-[#71717a] hover:text-[#18181b]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Topic Chips from my_focus.md (Pilar Sasaran) */}
          {topics.length > 0 && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-[#a1a1aa] shrink-0">Topik Fokus:</span>
                {topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleChipClick(t)}
                    className="px-3 py-1 rounded-full bg-[#f4f4f5] border border-[#e4e4e7] text-[#52525b] hover:text-[#18181b] hover:border-[#17171c] text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer"
                  >
                    #{t}
                  </button>
                ))}
              </div>

              {Object.keys(variations).length > 0 && (
                <button
                  type="button"
                  onClick={handlePickRandomVariation}
                  disabled={isScanning}
                  className="px-2.5 py-1 rounded-full bg-[#edfce9] border border-[#b2e5aa] text-[#003c33] text-[10px] font-mono font-medium flex items-center gap-1 hover:bg-[#ddf7d7] transition-colors cursor-pointer shrink-0"
                  title="Putar sub-topik kueri yang telah di-generate AI"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Acak Sub-Topik</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-8 py-8 flex flex-col justify-between">
        {isScanning ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#e4e4e7] flex items-center justify-center shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#17171c]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#18181b]">
                Menjalankan Scrape Wide &amp; Micro-Triage Pipeline...
              </p>
              <p className="text-xs text-[#71717a] max-w-sm">
                Mengekstrak 24 kandidat YouTube, eliminasi 3 lapisan (Vault Blacklist &amp; Seen), dan mengevaluasi 6 video teratas dengan hemat token.
              </p>
            </div>
          </div>
        ) : radarVideos.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-white border border-dashed border-[#e4e4e7] rounded-2xl p-8">
            <Radar className="w-10 h-10 text-[#a1a1aa] mx-auto" />
            <h3 className="text-sm font-medium text-[#18181b]">
              Belum Ada Video di Radar
            </h3>
            <p className="text-xs text-[#71717a] max-w-md mx-auto leading-relaxed">
              Gunakan bilah pencarian atau pilih salah satu pilar sasaran di atas untuk menemukan video yang paling relevan dengan target belajar Anda di <code className="font-mono text-[#18181b]">my_focus.md</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {radarVideos.map((video) => {
                const isHighMatch = video.match_score >= 85
                return (
                  <div
                    key={video.video_id}
                    className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden shadow-xs hover:border-[#17171c] transition-all flex flex-col justify-between group"
                  >
                    {/* Card Media Top */}
                    <div className="space-y-3 p-4">
                      {/* Thumbnail with overlay duration */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-xs">
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white font-mono text-[10px]">
                          {video.duration_str}
                        </span>
                      </div>

                      {/* Metadata & Alignment Badges */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            isHighMatch
                              ? 'bg-[#edfce9] text-[#003c33] border border-[#b2e5aa]'
                              : 'bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7]'
                          }`}
                        >
                          <TrendingUp className="w-2.5 h-2.5" />
                          {video.match_score}% Match
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#71717a]">
                          <span className="bg-[#f9f9fb] px-2 py-0.5 rounded border border-[#e4e4e7]">
                            {video.topic_tag}
                          </span>
                          <span className="bg-[#f9f9fb] px-2 py-0.5 rounded border border-[#e4e4e7]">
                            {video.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-semibold text-[#17171c] leading-snug line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-[11px] text-[#71717a] truncate font-mono">
                        Channel: {video.channel}
                      </p>

                      {/* The "Why You Care" Hook */}
                      <div className="border-l-2 border-[#17171c] pl-3 py-1 text-[11px] text-[#52525b] italic leading-relaxed bg-[#f9f9fb] rounded-r-lg">
                        &quot;{video.why_you_care}&quot;
                      </div>

                      {/* Time ROI Hint */}
                      {video.time_roi_hint && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#1863dc]">
                          <Clock className="w-3 h-3" />
                          <span>{video.time_roi_hint}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Actions */}
                    <div className="p-4 pt-2 border-t border-[#f4f4f5] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://www.youtube.com/watch?v=${video.video_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
                          title="Lihat di YouTube Asli"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Layer 3: Dismiss Button */}
                        <button
                          type="button"
                          onClick={() => {
                            dismissVideo(video.video_id)
                            toast.info('Video diabaikan dari daftar radar.')
                          }}
                          className="p-2 rounded-xl text-[#a1a1aa] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Abaikan (Jangan tampilkan lagi)"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCurateAndPreview(video.video_id)}
                        className="flex-1 py-2 px-4 rounded-full bg-[#17171c] hover:bg-black text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Curate &amp; Preview</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Button ("Muat 6 Lainnya") */}
            {radarHasMore && (
              <div className="pt-6 pb-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadMoreMutation.mutate()}
                  disabled={isRadarLoadingMore}
                  className="px-6 py-2.5 rounded-full bg-white border border-[#e4e4e7] hover:border-[#17171c] hover:bg-[#f4f4f5] text-xs font-medium text-[#18181b] shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRadarLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#18181b]" />
                      <span>Menyiapkan 6 rekomendasi berikutnya dari buffer...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-[#71717a]" />
                      <span>Muat 6 Rekomendasi Lainnya</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
