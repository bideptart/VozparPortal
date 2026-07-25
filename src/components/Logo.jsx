// Vozpar brand mark — the icon (bar chart + "V" swoosh/arrow) is a real
// transparent PNG crop, safe on any background. The "Vozpar" wordmark is
// NOT the raster lockup's baked-in text — that text is pale/white-on-white
// by design and turns into an illegible ghost outline once the background
// behind it isn't opaque white. Render it as real HTML text instead, which
// adapts correctly to whatever background it sits on.
export default function Logo({ size = 'md', showWordmark = true, white = false }) {
  const h = typeof size === 'number'
    ? size
    : size === 'lg' ? 52 : size === 'sm' ? 30 : 40;

  return (
    <div className="inline-flex items-center select-none max-w-full" style={{ gap: h * 0.14 }}>
      <img
        src="/vozpar-icon.png"
        alt="Vozpar"
        draggable={false}
        className="max-w-full shrink-0"
        style={{ height: h, width: 'auto' }}
      />
      {showWordmark && (
        <span
          className="font-display leading-none"
          style={{
            fontWeight: 800,
            letterSpacing: '-0.01em',
            fontSize: h * 0.62,
            color: white ? '#ffffff' : 'var(--foreground)',
          }}
        >
          Vozpar
        </span>
      )}
    </div>
  );
}