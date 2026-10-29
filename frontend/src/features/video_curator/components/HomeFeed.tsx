import { useState, useEffect } from 'react'
import {
  Play,
  Bookmark,
  Sparkles,
  Check,
  Search,
  RotateCcw,
  Loader2,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useSynthesizeVideoMutation,
  useSaveVaultMutation,
  useFocusTargetsQuery,
  useDiscoverRadarMutation,
} from '../hooks/useVideoCuratorMutations'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { useTheme } from '../hooks/useTheme'

export function HomeFeed() {
  const {
    radarVideos,
    curateVideoFromRadar,
    config,
    setActiveStage,
    setVideoUrl,
    omniSearchQuery,
    setOmniSearchQuery,
    setRadarQuery,
    isRadarLoading,
    togglePlayer,
  } = useVideoCuratorStore()

  const { isDark } = useTheme()
  const { data: focusData } = useFocusTargetsQuery()
  const synthesizeMutation = useSynthesizeVideoMutation()
  const saveVaultMutation = useSaveVaultMutation()
  const discoverRadarMutation = useDiscoverRadarMutation()

  const [savedVideos, setSavedVideos] = useState<Record<string, boolean>>({})

  // Focus topic preview
  const activeFocusPillars =
    focusData?.topics && focusData.topics.length > 0
      ? focusData.topics.join(', ')
      : 'Asynchronous Python, Event Loop Starvation & Microservices Bottlenecks'

  // Trigger automatic initial YouTube discovery based on focus topics if feed is empty
  useEffect(() => {
    if (radarVideos.length === 0 && !discoverRadarMutation.isPending && !isRadarLoading) {
      discoverRadarMutation.mutate({})
    }
  }, []) // run once on mount

  const handleStudyAndPlay = (videoId: string, title?: string) => {
    curateVideoFromRadar(videoId)
    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`
    setVideoUrl(fullUrl)
    togglePlayer(true)
    setActiveStage('curate')
    synthesizeMutation.mutate({
      video_url: fullUrl,
      config,
    })
    toast.info(`Membuka Command Deck & memutar video: "${title || videoId}"`)
  }

  const handleQuickVault = (video: (typeof radarVideos)[0]) => {
    saveVaultMutation.mutate({
      category: video.topic_tag.replace(/^#/, '') || 'Computer Science',
      title: video.title,
      content: `# ${video.title}\n\n**Channel:** ${video.channel}\n**Relevansi:** ${video.match_score}%\n\n> ${video.why_you_care}\n\n## Estimasi Segmen Utama\n${video.time_roi_hint}\n\nURL: https://www.youtube.com/watch?v=${video.video_id}\n`,
      video_id: video.video_id,
      index_summary: video.why_you_care,
      tags: ['RadarCurated', video.topic_tag.replace(/^#/, ''), 'Engineering'],
    })
    setSavedVideos((prev) => ({ ...prev, [video.video_id]: true }))
    toast.success(`Disimpan ke Obsidian Vault!`, {
      action: {
        label: 'Buka Vault',
        onClick: () => setActiveStage('vault'),
      },
    })
  }

  const handleTopicChipClick = (topic: string) => {
    setOmniSearchQuery(topic)
    setRadarQuery(topic)
    discoverRadarMutation.mutate({ query: topic })
  }

  // Display feed filtering
  const displayFeed = radarVideos.filter((video) => {
    if (!omniSearchQuery.trim()) return true
    const q = omniSearchQuery.toLowerCase()
    return (
      video.title.toLowerCase().includes(q) ||
      video.channel.toLowerCase().includes(q) ||
      video.why_you_care.toLowerCase().includes(q) ||
      video.topic_tag.toLowerCase().includes(q)
    )
  })

  const isLoading = isRadarLoading || discoverRadarMutation.isPending

  return (
    <div
      className={`flex-1 h-full min-h-0 overflow-y-auto flex flex-col select-none font-sans transition-colors pb-24 ${
        isDark ? 'bg-[#0d0d11] text-[#f4f4f5]' : 'bg-[#f9f9fb] text-[#18181b]'
      }`}
    >
      {/* Top Active Directive Subheader Banner */}
      <div
        className={`border-b px-6 py-3 sticky top-0 z-10 transition-colors ${
          isDark
            ? 'border-[#27272a] bg-[#141419]/95 backdrop-blur-md'
            : 'border-[#e4e4e7] bg-white/95 backdrop-blur-md'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0" />
            <span
              className={`font-semibold uppercase tracking-wider text-[11px] ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Active Directive:
            </span>
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Targeting</span>
            <button
              type="button"
              onClick={() => setActiveStage('focus')}
              className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer transition-all ${
                isDark
                  ? 'bg-[#27272a] text-zinc-200 hover:bg-[#3f3f46]'
                  : 'bg-[#f4f4f5] text-zinc-700 border border-[#e4e4e7] hover:bg-[#e4e4e7]'
              }`}
              title="Click to open Focus Studio and edit my_focus.md"
            >
              my_focus.md
            </button>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>—</span>
            <span
              onClick={() => setActiveStage('focus')}
              className={`font-medium truncate max-w-md cursor-pointer hover:underline ${
                isDark ? 'text-zinc-300' : 'text-zinc-800'
              }`}
              title="Click to view focus targets"
            >
              {activeFocusPillars}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={() => discoverRadarMutation.mutate({})}
              disabled={isLoading}
              className={`flex items-center gap-1.5 text-[11px] cursor-pointer transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
              }`}
              title="Refresh radar recommendations"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>Refresh Feed</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStage('focus')}
              className={`text-xs font-semibold hover:underline cursor-pointer ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Edit Focus
            </button>
          </div>
        </div>
      </div>

      {/* Focus Topics Quick Filter Chips Bar (No duplicate search bar - single top search bar used) */}
      <div
        className={`border-b px-6 py-3 ${
          isDark ? 'bg-[#121217] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap text-xs">
          <span className={`text-[11px] font-medium flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            Pillars from my_focus.md:
          </span>
          {(focusData?.topics && focusData.topics.length > 0
            ? focusData.topics
            : ['Python Concurrency', 'Distributed Systems', 'FastAPI Architecture', 'Database Internals']
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTopicChipClick(t)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#17171c] border-[#27272a] text-zinc-300 hover:border-emerald-500 hover:text-white'
                  : 'bg-[#f4f4f5] border-[#e4e4e7] text-zinc-700 hover:border-emerald-500 hover:text-black'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Pill if Filtering */}
      {omniSearchQuery && (
        <div
          className={`border-b px-6 py-2.5 flex items-center justify-between text-xs ${
            isDark ? 'bg-[#181820] border-[#27272a]' : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                Search Results for: <strong>"{omniSearchQuery}"</strong> ({displayFeed.length} live videos found)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOmniSearchQuery('')}
              className="text-xs text-blue-500 hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Search</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Video Feed List */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 space-y-5">
        {/* Loading Skeletons */}
        {isLoading && displayFeed.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-emerald-500 font-mono py-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Searching YouTube & evaluating high-signal engineering lectures...</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`border rounded-2xl p-4 flex flex-col md:flex-row gap-5 animate-pulse ${
                  isDark ? 'bg-[#17171c] border-[#27272a]' : 'bg-white border-[#e4e4e7]'
                }`}
              >
                <div className="md:w-84 aspect-video rounded-xl bg-zinc-700/30 shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 bg-zinc-700/30 rounded w-3/4" />
                  <div className="h-3 bg-zinc-700/20 rounded w-1/3" />
                  <div className="h-3 bg-zinc-700/20 rounded w-full" />
                  <div className="h-8 bg-zinc-700/10 rounded-xl w-40 mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayFeed.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <Play className="w-12 h-12 mx-auto text-zinc-500 opacity-60 fill-zinc-500/20" />
            <h3 className="text-base font-bold">
              {omniSearchQuery
                ? `Tidak ditemukan video YouTube untuk "${omniSearchQuery}"`
                : 'Mulai Menjelajahi Video YouTube'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Gunakan bilah pencarian utama di header atas untuk mencari topik teknik apapun di YouTube atau jalankan rekomendasi radar otomatis.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => discoverRadarMutation.mutate({ query: 'Python Architecture and Modern Engineering' })}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-semibold cursor-pointer"
              >
                Cari Topik Rekayasa Perangkat Lunak
              </button>
            </div>
          </div>
        )}

        {/* Video Cards List */}
        {displayFeed.map((video) => {
          const isSaved = savedVideos[video.video_id]

          return (
            <div
              key={video.video_id}
              className={`border rounded-2xl p-4 transition-all duration-200 flex flex-col md:flex-row gap-5 group ${
                isDark
                  ? 'bg-[#17171c] border-[#27272a] hover:border-[#3f3f46]'
                  : 'bg-white border-[#e4e4e7] hover:border-[#d4d4d8] shadow-xs'
              }`}
            >
              {/* Left: Thumbnail & Duration */}
              <div
                onClick={() => handleStudyAndPlay(video.video_id, video.title)}
                className="relative md:w-84 shrink-0 aspect-video rounded-xl overflow-hidden bg-black/40 cursor-pointer group/thumb"
                title="Click to Study & Synthesize in Command Deck"
              >
                <img
                  src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                />

                <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{video.match_score}% Signal</span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-mono font-medium text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>{video.duration_str}</span>
                </div>
              </div>

              {/* Right: Metadata & Synthesizer Callout */}
              <div className="flex-1 flex flex-col justify-between py-0.5 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h2
                      onClick={() => handleStudyAndPlay(video.video_id, video.title)}
                      className={`text-sm md:text-base font-bold leading-snug cursor-pointer hover:underline line-clamp-2 ${
                        isDark ? 'text-white' : 'text-[#18181b]'
                      }`}
                    >
                      {video.title}
                    </h2>
                  </div>

                  <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span className="font-semibold text-zinc-300">{video.channel}</span>
                    <span>•</span>
                    <span className="font-mono text-emerald-400">{video.topic_tag}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">{video.difficulty}</span>
                  </div>

                  {/* Why You Care Synthesizer Callout */}
                  <div
                    className={`mt-2 p-3 rounded-xl border text-xs space-y-1 leading-relaxed ${
                      isDark
                        ? 'bg-[#121216] border-[#27272a] text-zinc-300'
                        : 'bg-[#f9f9fb] border-[#e4e4e7] text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Synthesizer Takeaway & ROI</span>
                    </div>
                    <p className="text-[11px]">{video.why_you_care}</p>
                    {video.time_roi_hint && (
                      <p className="text-[10px] font-mono text-zinc-400 mt-1">
                        Dense Segment: {video.time_roi_hint}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStudyAndPlay(video.video_id, video.title)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Study & Synthesize</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickVault(video)}
                      disabled={isSaved}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isSaved
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : isDark
                            ? 'border-[#27272a] hover:bg-[#27272a] text-zinc-300'
                            : 'border-[#e4e4e7] hover:bg-[#f4f4f5] text-zinc-700'
                      }`}
                      title="Quick Save to Obsidian Vault"
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      <span>{isSaved ? 'Archived to Vault' : 'Quick Vault'}</span>
                    </button>
                  </div>

                  <a
                    href={`https://www.youtube.com/watch?v=${video.video_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`p-2 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                      isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'
                    }`}
                    title="Open on YouTube"
                  >
                    <span>Watch on YouTube</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
