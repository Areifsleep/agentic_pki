import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})|^[a-zA-Z0-9_-]{11}$/

export function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null
  const cleaned = urlOrId.trim()
  const match = cleaned.match(YOUTUBE_REGEX)
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
