import { useCallback, useEffect, useState } from 'react'

/** The main area: the card browser, or the full-width view of the active deck. */
export type View = 'browse' | 'deck'

export const viewFromSearch = (search: string): View =>
  new URLSearchParams(search).get('view') === 'deck' ? 'deck' : 'browse'

/**
 * The URL for `view`, keeping every other query param (the browse filters), so going back
 * to Browse restores the same search. Browse is the default and has no `view` param.
 */
export function viewUrl(view: View, pathname: string, search: string): string {
  const p = new URLSearchParams(search)
  if (view === 'deck') p.set('view', 'deck')
  else p.delete('view')
  const qs = p.toString()
  return `${pathname}${qs ? `?${qs}` : ''}`
}

/** The current view, kept in the URL so Back and deep links work. */
export function useView(): [View, (view: View) => void] {
  const [view, setView] = useState<View>(() => viewFromSearch(window.location.search))

  useEffect(() => {
    const onPop = () => setView(viewFromSearch(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((next: View) => {
    if (viewFromSearch(window.location.search) === next) return
    window.history.pushState(
      null,
      '',
      viewUrl(next, window.location.pathname, window.location.search),
    )
    setView(next)
    window.scrollTo(0, 0)
  }, [])

  return [view, go]
}
