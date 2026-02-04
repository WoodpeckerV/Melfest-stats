import type { ChartSeries } from './ChartCard';

function SongLegend({ items }: { items: ChartSeries[] }) {
  if (!items.length) return null;
  return (
    <div className="legend">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="legend-item">
          <span className="legend-swatch" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default SongLegend;
