import { useEffect, useState } from 'react'

/** Whether a CSS media query matches, updating live (false where matchMedia is missing). */
export function useMediaQuery(query: string): boolean {
  const get = () => window.matchMedia?.(query).matches ?? false
  const [matches, setMatches] = useState(get)

  useEffect(() => {
    const mql = window.matchMedia?.(query)
    if (!mql) return
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
