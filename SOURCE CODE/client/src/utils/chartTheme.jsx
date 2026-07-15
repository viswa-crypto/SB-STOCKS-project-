import { Sector } from "recharts";

// ---------------------------------------------------------------------------
// SHARED RECHARTS THEMING HELPERS
//
// Recharts renders its own inline SVG/HTML, so it never automatically picks
// up Tailwind's dark/light CSS variables the way a normal className does.
// These helpers centralize how every pie/legend/tooltip resolves its text
// and surface colors — via the same CSS custom properties the rest of the
// app uses (--color-ice, --color-mute, --color-panel2, --color-line — see
// index.css) — so switching themes (or the accent color) restyles the
// charts too, instead of leaving them stuck on hardcoded dark-mode colors.
// Pure presentation only: no chart data or calculations live here. Every
// label/tooltip still reflects the real, unmodified percent/value recharts
// computes from the actual data — only the rendered *angle* of tiny slices
// is floored (see MIN_SLICE_ANGLE) so they stay visible on screen.
// ---------------------------------------------------------------------------

// Minimum rendered angle (in degrees) for any slice, however small its real
// share is — this is a purely visual floor recharts applies at render time;
// it does not change the underlying value, its computed percent, or what
// the tooltip/label/legend report. Passed as <Pie minAngle={MIN_SLICE_ANGLE}>.
export const MIN_SLICE_ANGLE = 4;

// Tooltip surface: background/border/text all theme-aware.
export const pieTooltipStyle = {
  contentStyle: {
    background: "rgb(var(--color-panel2))",
    border: "1px solid rgb(var(--color-line))",
    borderRadius: 8,
    color: "rgb(var(--color-ice))",
    fontSize: 12,
  },
  itemStyle: { color: "rgb(var(--color-ice))" },
  labelStyle: { color: "rgb(var(--color-mute))" },
};

// Legend text — recharts otherwise colors each legend label the same as its
// swatch, which can read poorly against light backgrounds (e.g. a pale
// "mute" gray slice) — forcing the label text itself to the theme's primary
// text color keeps every entry legible regardless of slice color or mode.
export function legendFormatter(value) {
  return <span style={{ color: "rgb(var(--color-ice))" }}>{value}</span>;
}

// Outside-anchored slice label ("Name 24%"), positioned along the slice's
// midangle. Every slice gets a label — including the smallest ones, which
// is the whole point of pairing this with MIN_SLICE_ANGLE — but consecutive
// labels alternate between two radii ("zig-zag"), so a run of several small
// neighboring slices doesn't stack their labels on top of one another.
export function renderOutsidePieLabel({ cx, cy, midAngle, outerRadius, percent, name, index }) {
  const RADIAN = Math.PI / 180;
  const zigzag = index % 2 === 0 ? 16 : 32;
  const radius = outerRadius + zigzag;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="fill-current text-ice"
      style={{ fontSize: 11, fontWeight: 500 }}
    >
      {`${name} ${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

// Thin connecting line ("leader line") from slice to its outside label, in
// the theme's border color so it stays visible but unobtrusive in both
// modes. Recharts stretches this to reach wherever renderOutsidePieLabel
// placed the label (including the zig-zagged ring), so it always connects
// correctly even for the offset labels.
export const pieLabelLineStyle = { stroke: "rgb(var(--color-line))" };

// Active (hovered) slice: same geometry, just a few px taller outerRadius,
// so the slice visibly "pops" without changing its angle, color, or any
// value shown elsewhere on screen.
export function renderActivePieShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="rgb(var(--color-panel))"
      strokeWidth={1}
    />
  );
}
