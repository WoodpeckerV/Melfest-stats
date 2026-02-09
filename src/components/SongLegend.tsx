import type { CSSProperties } from 'react';
import type { ChartSeries } from './ChartCard';

type SongLegendProps = {
  items: ChartSeries[];
  onToggle?: (id: string) => void;
};

function SongLegend({ items, onToggle }: SongLegendProps) {
  if (!items.length) return null;
  return (
    <div className="legend">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`legend-item ${item.hidden ? 'is-hidden' : ''}`}
          style={{ '--legend-color': item.color } as CSSProperties}
          onClick={() => onToggle?.(item.id)}
        >
          <span className="legend-swatch" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default SongLegend;
