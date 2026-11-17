const COLORS = ['#4c5fd5', '#1f9d6b', '#e0a030', '#d6455d', '#8b5cf6', '#0ea5b7'];

export default function DonutChart({ data }) {
  const total = data.reduce((s, i) => s + i.total, 0);
  if (!total) return <div className="text-gray-400 text-sm p-4 text-center">Немає витрат у цьому місяці</div>;

  const R = 54, C = 2 * Math.PI * R;
  let off = 0;

  // Беремо топ-6 категорій, решту об'єднуємо в "Інше"
  const top = data.slice(0, 6);
  const rest = data.slice(6).reduce((s, i) => s + i.total, 0);
  const parts = rest ? [...top, { category: 'Інше', total: rest }] : top;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
      {/* Сама діаграма */}
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <circle r={R} cx="70" cy="70" fill="none" stroke="#f1f1f1" strokeWidth="16" />
          {parts.map((item, i) => {
            const len = (item.total / total) * C;
            const el = (
              <circle
                key={i}
                r={R} cx="70" cy="70" fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`}
                strokeDashoffset={-off}
                transform="rotate(-90 70 70)"
              />
            );
            off += len;
            return el;
          })}
          <text x="70" y="66" textAnchor="middle" fontSize="10" fill="#888">Разом</text>
          <text x="70" y="82" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1b1b1f">
            {new Intl.NumberFormat('uk-UA', { notation: 'compact' }).format(total)}
          </text>
        </svg>
      </div>

      {/* Легенда */}
      <ul className="flex-1 space-y-3 w-full">
        {parts.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
              <span className="text-gray-700">{item.category}</span>
            </div>
            <span className="text-gray-900 font-medium">
              {Math.round((item.total / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}