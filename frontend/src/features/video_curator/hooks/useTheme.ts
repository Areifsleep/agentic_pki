import { useEffect, useState } from 'react'
import { useVideoCuratorStore } from './useVideoCuratorStore'

export function useTheme() {
  const { appearance, setAppearance } = useVideoCuratorStore()
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const isDark =
    appearance === 'dark' ? true : appearance === 'light' ? false : systemDark

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDark])

  const toggleTheme = () => {
    if (isDark) {
      setAppearance('light')
    } else {
      setAppearance('dark')
    }
  }

  return { isDark, appearance, setAppearance, toggleTheme }
}
