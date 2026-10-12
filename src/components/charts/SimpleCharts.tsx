import React from 'react';

interface BarData {
  label: string;
  value: number;
  formattedValue?: string;
  secondaryValue?: number;
}

export const SimpleBarChart: React.FC<{
  data: BarData[];
  height?: number;
  color?: string;
  secondaryColor?: string;
}> = ({ data, height = 200, color = '#2563eb', secondaryColor = '#0d9488' }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 md:gap-4 pt-4 pb-2" style={{ height: `${height}px` }}>
        {data.map((item, idx) => {
          const heightPercent = Math.round((item.value / maxValue) * 100);
          const secHeightPercent = item.secondaryValue ? Math.round((item.secondaryValue / maxValue) * 100) : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition mb-1 whitespace-nowrap">
                {item.formattedValue || item.value}
              </div>
              <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-full">
                <div
                  className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-85"
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                    backgroundColor: color
                  }}
                  title={`${item.label}: ${item.formattedValue || item.value}`}
                />
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-85"
                    style={{
                      height: `${Math.max(secHeightPercent, 4)}%`,
                      backgroundColor: secondaryColor
                    }}
                    title={`Secondary: ${item.secondaryValue}`}
                  />
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SimpleLineChart: React.FC<{
  points: { label: string; value: number }[];
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  suffix?: string;
}> = ({ points, height = 180, strokeColor = '#0d9488', fillColor = 'rgba(13, 148, 136, 0.1)', suffix = '%' }) => {
  if (points.length < 2) return null;

  const min = Math.min(...points.map(p => p.value));
  const max = Math.max(...points.map(p => p.value));
  const range = max - min || 1;

  const width = 500;
  const paddingY = 25;
  const paddingX = 20;
  const effectiveH = height - paddingY * 2;
  const stepX = (width - paddingX * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = paddingX + i * stepX;
    const y = height - paddingY - ((p.value - min) / range) * effectiveH;
    return { x, y, ...p };
  });

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
        <path d={areaD} fill={fillColor} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((pt, i) => (
          <g key={i} className="group">
            <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke={strokeColor} strokeWidth="2" />
            <text
              x={pt.x}
              y={pt.y - 10}
              textAnchor="middle"
              className="text-[10px] fill-slate-600 font-semibold opacity-0 group-hover:opacity-100 transition duration-150"
            >
              {pt.value}{suffix}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  );
};

export const SimpleDonutChart: React.FC<{
  segments: { label: string; value: number; color: string }[];
  totalLabel?: string;
}> = ({ segments, totalLabel }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90 transform">
          <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
          {segments.map((seg, i) => {
            const percent = (seg.value / total) * 100;
            const strokeDasharray = `${percent} ${100 - percent}`;
            const strokeDashoffset = -accumulatedAngle;
            accumulatedAngle += percent;

            return (
              <circle
                key={i}
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke={seg.color}
                strokeWidth="6"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-slate-800">{total}</span>
          {totalLabel && <span className="text-[10px] text-slate-400 uppercase font-medium">{totalLabel}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-slate-600 truncate">{seg.label}</span>
            </div>
            <span className="font-semibold text-slate-800">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
