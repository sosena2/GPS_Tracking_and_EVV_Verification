import { createContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'evv-theme'

export const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }

    return window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    root.setAttribute('data-theme', theme)
    body?.setAttribute('data-theme', theme)
    root.style.colorScheme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}