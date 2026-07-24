// Rozper brand mark — ascending bar chart icon (shortest to tallest)
// with the "Vozper" wordmark.
//
// `size` accepts 'sm' | 'md' | 'lg' or a literal pixel height for the icon.
// `white` renders the icon in light colors and the wordmark in white, for dark
// backgrounds; otherwise the icon renders in the standard brand colors.
function BarChartIcon({ height, color }) {
  const barColors = color === 'white'
    ? ['#16A34A', '#EF4444', '#F5B400']
    : ['#00AA4A', '#FF3F30', '#FEBD01'];

  return (
    <svg
      height={height}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* R mark — blue */}
      <text
        x="2"
        y="28"
        fontFamily="Archivo, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill={color === 'white' ? '#FFFFFF' : '#0086F9'}
      >
        R
      </text>
      {/* Bar 1 — green (shortest) */}
      <rect x="24" y="28" width="4" height="8" rx="1" fill={barColors[0]} />
      {/* Bar 2 — red (middle) */}
      <rect x="30" y="20" width="4" height="16" rx="1" fill={barColors[1]} />
      {/* Bar 3 — yellow (tallest) */}
      <rect x="36" y="8" width="4" height="28" rx="1" fill={barColors[2]} />
    </svg>
  );
}

export default function Logo({ size = 'md', white = false, showWordmark = true }) {
  const h = typeof size === 'number'
    ? size
    : size === 'lg' ? 52 : size === 'sm' ? 30 : 40;

  const wordmarkColor = white ? '#ffffff' : 'var(--foreground)';

  return (
    <div className="flex items-center gap-2.5 select-none max-w-full" style={{ height: h }}>
      <BarChartIcon height={h * 0.72} color={white ? 'white' : 'default'} />
      {showWordmark && (
        <span
          className="font-display leading-none"
          style={{
            fontWeight: 800,
            letterSpacing: '-0.01em',
            fontSize: h * 0.5,
            color: wordmarkColor,
          }}
        >
          Vozper
        </span>
      )}
    </div>
  );
}