/**
 * The KiraPoket mark: a K sitting on a spend meter.
 *
 * The meter is the one visual every user sees on Home — the bar under
 * "Remaining this cycle" (SpendMeter) — so the mark reads as the name and as
 * "how much of this cycle's pocket is left" at once. It replaced the old "KP"
 * initials, which said nothing about the app and crowded at favicon size.
 *
 * The K is Nunito Black (the app's typeface) converted to an outline, so the
 * mark renders identically in the browser and in next/og image routes, which
 * can't load the web font. Geometry is on a 100×100 grid; everything inside
 * stays within the 80% maskable safe zone.
 *
 * No hooks and no "use client" — the icon/OG routes render it server-side, so
 * colours are props: CSS variables in the app, sRGB hex in ImageResponse.
 */

const K_PATH =
  "M38.8 58L38.8 58Q36.5 58 35.2 56.7Q34 55.4 34 53.1L34 53.1L34 24.9Q34 22.5 35.2 21.2Q36.5 20 38.8 20L38.8 20Q41.2 20 42.4 21.2Q43.6 22.5 43.6 24.9L43.6 24.9L43.6 36.3L43.7 36.3L56.5 22.3Q57.5 21.2 58.6 20.6Q59.8 20 61.2 20L61.2 20Q63.4 20 64.4 21.1Q65.3 22.3 65.3 23.8Q65.2 25.3 64 26.5L64 26.5L51.3 40L51.3 36.1L64.7 51.2Q66 52.7 66 54.3Q66 55.9 65 56.9Q63.9 58 61.8 58L61.8 58Q60 58 58.9 57.3Q57.8 56.6 56.6 55.2L56.6 55.2L43.7 40.8L43.6 40.8L43.6 53.1Q43.6 55.4 42.4 56.7Q41.2 58 38.8 58Z";

export function LogoMark({
  className,
  size,
  tile = "var(--primary)",
  ink = "var(--primary-foreground)",
  radius = 22,
  title,
}: {
  className?: string;
  /** Pixel size, for places without Tailwind (image routes, global-error). */
  size?: number;
  tile?: string;
  ink?: string;
  /** Corner radius on the 100-unit grid. 0 for full-bleed icons the OS rounds. */
  radius?: number;
  /** Accessible name. Omit when a visible "KiraPoket" sits beside the mark. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="100" height="100" rx={radius} fill={tile} />
      <path d={K_PATH} fill={ink} />
      {/* Spend meter: track, then ~60% fill — same proportions as a mid-cycle bar */}
      <rect x="22" y="67" width="56" height="13" rx="6.5" fill={ink} opacity="0.35" />
      <rect x="22" y="67" width="34" height="13" rx="6.5" fill={ink} />
    </svg>
  );
}
