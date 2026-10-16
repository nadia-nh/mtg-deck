import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * An element's distance from the top of the document, re-checked after every render (content
 * above it, like a wrapping toolbar, can move it). Window-scrolled virtual lists need it as
 * their scroll margin.
 */
export function useDocumentTop(ref: RefObject<HTMLElement | null>): number {
  const [top, setTop] = useState(0)
  const update = (el: HTMLElement) => {
    const t = el.getBoundingClientRect().top + window.scrollY
    setTop((cur) => (Math.abs(cur - t) > 0.5 ? t : cur))
  }
  useLayoutEffect(() => {
    if (ref.current) update(ref.current)
  })
  return top
}
