import { useCallback, useEffect, useState } from 'react'
import { stateFromParams, stateToParams, type BrowseState } from './filterParams'

const read = () => stateFromParams(new URLSearchParams(window.location.search))

/**
 * Browse state backed by the URL. Discrete changes push a history entry
 * (so Back undoes them); typing replaces the current entry.
 */
export function useBrowseState() {
  const [state, setState] = useState<BrowseState>(read)

  useEffect(() => {
    const onPop = () => setState(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const update = useCallback((next: BrowseState, opts: { replace?: boolean } = {}) => {
    setState(next)
    const qs = stateToParams(next).toString()
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    if (opts.replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }, [])

  return [state, update] as const
}
