// Vozpar brand mark — a single raster lockup (bar chart + "V" swoosh/arrow,
// with the "Vozpar" wordmark baked in as pale/white text). Same two assets
// everywhere: `showWordmark=false` slots (paired with a separate "kallus.io"
// / "vozper.com" domain label) get the icon-only crop, since the wordmark
// image's white text disappears on light backgrounds; `showWordmark=true`
// slots get the full lockup, and are only ever used on dark backgrounds.
export default function Logo({ size = 'md', showWordmark = true }) {
  const h = typeof size === 'number'
    ? size
    : size === 'lg' ? 52 : size === 'sm' ? 30 : 40;

  const src = showWordmark ? '/vozpar-logo.png' : '/vozpar-icon.png';

  return (
    <img
      src={src}
      alt="Vozpar"
      draggable={false}
      className="select-none max-w-full"
      style={{ height: h, width: 'auto' }}
    />
  );
}