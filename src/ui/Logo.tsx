/** App mark: three fanned cards. Original artwork, not a WotC symbol. */
export function Logo() {
  return (
    <svg className="logo" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect
        x="4"
        y="7"
        width="14"
        height="20"
        rx="2.5"
        transform="rotate(-14 11 17)"
        className="logo-back"
      />
      <rect x="9" y="5" width="14" height="20" rx="2.5" className="logo-mid" />
      <rect
        x="14"
        y="7"
        width="14"
        height="20"
        rx="2.5"
        transform="rotate(14 21 17)"
        className="logo-front"
      />
    </svg>
  )
}
