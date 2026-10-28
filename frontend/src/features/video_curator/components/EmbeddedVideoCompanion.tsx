import { useEffect, useRef, useState } from 'react'
import {
  Minimize2,
  X,
  ExternalLink,
  Clock,
  Layers,
} from 'lucide-react'
import { useVideoCuratorStore } from '../hooks/useVideoCuratorStore'
import { extractVideoId } from '@/lib/utils'

interface EmbeddedVideoCompanionProps {
  videoId?: string | null
  mode?: 'docked' | 'floating'
}

export function EmbeddedVideoCompanion({
  videoId,
  mode = 'docked',
}: EmbeddedVideoCompanionProps) {
  const {
    isPlayerOpen,
    togglePlayer,
    isFloatingPlayer,
    setIsFloatingPlayer,
    playerSeekSeconds,
    playerActionCounter,
    activeDraft,
    videoUrl,
  } = useVideoCuratorStore()

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [lastSoughtTime, setLastSoughtTime] = useState<number | null>(null)

  const effectiveVideoId =
    videoId ||
    activeDraft?.video_id ||
    (videoUrl ? extractVideoId(videoUrl) : null)

  // Listen to seekTo commands and trigger postMessage to YouTube iframe
  useEffect(() => {
    if (playerSeekSeconds === null || !iframeRef.current?.contentWindow) return

    setLastSoughtTime(playerSeekSeconds)

    const seekPayload = JSON.stringify({
      event: 'command',
      func: 'seekTo',
      args: [playerSeekSeconds, true],
    })

    const playPayload = JSON.stringify({
      event: 'command',
      func: 'playVideo',
      args: [],
    })

    try {
      iframeRef.current.contentWindow.postMessage(seekPayload, '*')
      iframeRef.current.contentWindow.postMessage(playPayload, '*')
    } catch {
      // Ignore cross-origin postMessage warnings
    }
  }, [playerSeekSeconds, playerActionCounter])

  if (!isPlayerOpen || !effectiveVideoId) {
    return null
  }

  // Format seconds to MM:SS
  const formatSec = (totalSec: number) => {
    const m = Math.floor(totalSec / 60)
    const s = Math.floor(totalSec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // If floating mode requested, render in portal-like fixed container
  const isFloating = isFloatingPlayer || mode === 'floating'

  return (
    <div
      className={
        isFloating
          ? 'fixed bottom-5 right-5 z-50 w-80 md:w-96 bg-[#17171c] text-white rounded-2xl shadow-2xl border border-[#27272a] overflow-hidden transition-all'
          : 'w-full bg-[#ffffff] border border-[#e4e4e7] rounded-xl overflow-hidden shadow-xs mb-3 transition-all'
      }
    >
      {/* Companion Header */}
      <div
        className={`px-3 py-2 flex items-center justify-between text-xs border-b ${
          isFloating
            ? 'bg-[#1c1c22] border-[#2e2e36] text-[#e4e4e7]'
            : 'bg-[#fafafa] border-[#e4e4e7] text-[#52525b]'
        }`}
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium truncate">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shrink-0" />
          <span className="truncate">Ask & Jump Companion</span>
          {lastSoughtTime !== null && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                isFloating
                  ? 'bg-[#27272a] text-[#a1a1aa]'
                  : 'bg-[#edfce9] text-[#003c33] border border-[#b2e5aa]'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              {formatSec(lastSoughtTime)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Switcher: Docked <-> Floating PiP */}
          <button
            type="button"
            onClick={() => setIsFloatingPlayer(!isFloatingPlayer)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={isFloating ? 'Sematkan ke Panel Kiri' : 'Jadikan Floating PiP'}
          >
            {isFloating ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
          </button>

          {/* External Link */}
          <a
            href={`https://www.youtube.com/watch?v=${effectiveVideoId}${
              lastSoughtTime ? `&t=${lastSoughtTime}s` : ''
            }`}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Buka di YouTube Web"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Close Player */}
          <button
            type="button"
            onClick={() => togglePlayer(false)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Pemutar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 16:9 Responsive Video Frame */}
      <div className="relative w-full aspect-video bg-black">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${effectiveVideoId}?enablejsapi=1&origin=${encodeURIComponent(
            window.location.origin
          )}&autoplay=1&modestbranding=1&rel=0`}
          title="YouTube Video Player Companion"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  )
}
