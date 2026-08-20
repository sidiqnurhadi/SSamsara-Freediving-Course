import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUnitValue, shortDate } from "@/lib/fd";
import type { SeriesPoint } from "@/lib/types";

export default function PerformanceChart({
  series,
  unit,
  testid,
}: {
  series: SeriesPoint[];
  unit: string;
  testid: string;
}) {
  const data = series.map((point) => ({ ...point, label: shortDate(point.date) }));

  return (
    <div className="h-56 w-full sm:h-64" data-testid={testid}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#7fa3b0"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={18}
          />
          <YAxis
            stroke="#7fa3b0"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => (unit === "s" ? formatUnitValue("s", value) : String(value))}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "#072430",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#7fa3b0" }}
            formatter={(value) => [formatUnitValue(unit, Number(value)), "Performance"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-aqua)"
            strokeWidth={2.5}
            dot={(props) => {
              const point = data[props.index as number];
              const key = `dot-${props.index}`;
              return point?.is_pb ? (
                <circle key={key} cx={props.cx} cy={props.cy} r={5} fill="#f0b45f" stroke="#041820" strokeWidth={2} />
              ) : (
                <circle key={key} cx={props.cx} cy={props.cy} r={3} fill="var(--color-aqua)" />
              );
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
