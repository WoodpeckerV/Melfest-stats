import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { formatNumber } from '../utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  data: Array<number | null>;
  hidden?: boolean;
};

type ChartCardProps = {
  title: string;
  subtitle: string;
  labels: string[];
  series: ChartSeries[];
  reverseY?: boolean;
  valueLabel: string;
  valueFormatter?: (value: number) => string;
};

const defaultFormatter = (value: number) => formatNumber(value);

function ChartCard({
  title,
  subtitle,
  labels,
  series,
  reverseY,
  valueLabel,
  valueFormatter = defaultFormatter
}: ChartCardProps) {
  const data = {
    labels,
    datasets: series.map((item) => ({
      hidden: item.hidden,
      label: item.label,
      data: item.data,
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.3,
      spanGaps: false
    }))
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(7, 10, 20, 0.92)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        titleColor: '#f7f9ff',
        bodyColor: '#d6e0f2',
        padding: 12,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return '';
            return `${context.dataset.label}: ${valueFormatter(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9fb0c8', maxRotation: 0, autoSkip: true },
        grid: { color: 'rgba(255, 255, 255, 0.08)' }
      },
      y: {
        reverse: reverseY,
        ticks: { color: '#9fb0c8' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        title: {
          display: true,
          text: valueLabel,
          color: '#d6e0f2'
        }
      }
    }
  };

  return (
    <section className="chart-card">
      <header className="chart-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </header>
      <div className="chart-area">
        <Line options={options} data={data} />
      </div>
    </section>
  );
}

export default ChartCard;
