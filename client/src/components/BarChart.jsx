export default function BarChart({ data }) {
  const W = 600, H = 240, pl = 40, pr = 10, pt = 10, pb = 30;
  const max = Math.max(1, ...data.flatMap(s => [s.income, s.expense]));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const iw = W - pl - pr;
  const ih = H - pt - pb;
  const gw = iw / data.length;
  const bw = Math.min(20, gw / 3);

  const y = (v) => pt + ih - (v / top) * ih;

  return (
    <div className="w-full">
      {/* Легенда */}
      <div className="flex justify-end gap-4 mb-4 text-xs font-medium text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#16a34a]"></span> Доходи
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#dc2626]"></span> Витрати
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {[0, 1, 2, 3, 4].map(i => {
          const val = i * step;
          return (
            <g key={i}>
              <line x1={pl} x2={W - pr} y1={y(val)} y2={y(val)} stroke="#e5e5e5" strokeWidth="1" />
              <text x={pl - 10} y={y(val) + 4} textAnchor="end" fontSize="10" fill="#888">{val >= 1000 ? `${val/1000}k` : val}</text>
            </g>
          );
        })}

        {data.map((s, i) => {
          const cx = pl + gw * i + gw / 2;
          const m = new Date(s.ym + '-01').toLocaleString('uk-UA', { month: 'short' });
          return (
            <g key={i}>
              <rect x={cx - bw - 2} y={y(s.income)} width={bw} height={Math.max(0, ih - (y(s.income) - pt))} fill="#16a34a" rx="2" />
              <rect x={cx + 2} y={y(s.expense)} width={bw} height={Math.max(0, ih - (y(s.expense) - pt))} fill="#dc2626" rx="2" />
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="#888">{m}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}