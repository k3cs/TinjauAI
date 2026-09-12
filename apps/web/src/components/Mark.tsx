/**
 * The mark: two rounded bars, rotated, one overlapping the other. It is the product in one glyph,
 * a fact on Ethereum laid against its proof on Creditcoin, and it matches the lettering weight.
 */
export default function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g transform="rotate(-35 12 12)">
        <rect x="4.5" y="2.5" width="5" height="19" rx="2.5" fill="currentColor" />
        <rect x="13" y="6.5" width="5" height="15" rx="2.5" fill="currentColor" opacity="0.45" />
      </g>
    </svg>
  );
}
