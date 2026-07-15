import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatCurrency } from "../utils/formatters";
import {
  pieTooltipStyle, legendFormatter, renderOutsidePieLabel, pieLabelLineStyle,
  MIN_SLICE_ANGLE, renderActivePieShape,
} from "../utils/chartTheme";

const COLORS = ["#2FE6A6", "#D9B25C", "#FF5C7A", "#17C98C", "#8592AB", "#F5A623", "#5C9BFF", "#B85CFF"];

export default function SectorAllocationChart({ holdings }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const bySector = {};
  holdings.forEach((h) => {
    const sector = h.stockId?.sector || "Other";
    bySector[sector] = (bySector[sector] || 0) + (h.currentValue || 0);
  });
  const data = Object.entries(bySector).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="42%"
          outerRadius="62%"
          paddingAngle={3}
          minAngle={MIN_SLICE_ANGLE}
          label={renderOutsidePieLabel}
          labelLine={{ style: pieLabelLineStyle }}
          isAnimationActive={false}
          activeIndex={activeIndex}
          activeShape={renderActivePieShape}
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgb(var(--color-panel))" strokeWidth={1} />)}
        </Pie>
        <Tooltip {...pieTooltipStyle} formatter={(v) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendFormatter} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
