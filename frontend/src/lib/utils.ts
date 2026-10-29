import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const YOUTUBE_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
const RAW_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

export function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null
  const cleaned = urlOrId.trim()
  if (RAW_ID_REGEX.test(cleaned)) {
    return cleaned
  }
  const match = cleaned.match(YOUTUBE_URL_REGEX)
  return match ? match[1] : null
}

export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0
  const cleaned = ts.replaceAll('[', '').replaceAll(']', '').trim()
  const parts = cleaned.split(':').map((p) => Number.parseInt(p, 10))
  if (parts.some(Number.isNaN)) return 0
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

export interface WatchHistoryPayload {
  title: string
  videoUrl: string
  videoId?: string
  channel?: string
  duration?: string
  category?: string
  resumeTime?: string
  notesCount?: number
}

export function saveWatchHistoryItem(item: WatchHistoryPayload) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('studytube_watch_history')
    let list: any[] = raw ? JSON.parse(raw) : []
    const vidId = item.videoId || extractVideoId(item.videoUrl) || ''
    const now = Date.now()
    const newItem = {
      id: `hist-${vidId || now}`,
      title: item.title || 'Untitled Lecture',
      channel: item.channel || 'Curated Study Track',
      views: 'Active Study',
      watchedAgo: 'Just now',
      duration: item.duration || 'Session',
      matchBadge: 'Studied',
      thumbnail: vidId
        ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640',
      retention: 'Retention: 95% Cognitive Alignment',
      flashcardBadge: 'Study Active',
      resumeTime: item.resumeTime,
      notesCount: item.notesCount || 1,
      timeline: 'today',
      category: item.category || 'General',
      videoUrl: item.videoUrl,
      videoId: vidId,
      timestamp: now,
    }

    list = list.filter((x) => (vidId ? x.videoId !== vidId : true) && x.videoUrl !== item.videoUrl)
    list.unshift(newItem)
    if (list.length > 50) list = list.slice(0, 50)
    localStorage.setItem('studytube_watch_history', JSON.stringify(list))
    window.dispatchEvent(new Event('studytube_history_updated'))
  } catch {
    // Ignore local storage error
  }
}
