import { useEffect, useMemo, useState } from 'react';
import ChartCard, { type ChartSeries } from '../components/ChartCard';
import SongLegend from '../components/SongLegend';
import type { AppState, Point, Round } from '../types';
import {
  ROUND_OPTIONS,
  colorForUri,
  formatDisplayDate,
  inDateRange,
  sortUniqueDates
} from '../utils';

const roundDescriptions: Record<Round, string> = {
  'Heat 1': 'Heat 1',
  'Heat 2': 'Heat 2',
  'Heat 3': 'Heat 3',
  'Heat 4': 'Heat 4',
  'Heat 5': 'Heat 5',
  Finalkval: 'Finalkval',
  Final: 'Final'
};

type MainPageProps = {
  state: AppState;
};

function buildLabelMap(points: Point[]): Map<string, string> {
  const map = new Map<string, { label: string; date: string }>();
  for (const point of points) {
    const label = `${point.artist} - ${point.track}`;
    const existing = map.get(point.uri);
    if (!existing || point.date > existing.date) {
      map.set(point.uri, { label, date: point.date });
    }
  }
  const result = new Map<string, string>();
  for (const [uri, value] of map.entries()) {
    result.set(uri, value.label);
  }
  return result;
}

function buildSeries(
  songs: AppState['songs'],
  points: Point[],
  dates: string[],
  labelMap: Map<string, string>,
  metric: 'streams' | 'rank'
): ChartSeries[] {
  const lookup = new Map<string, Point>();
  for (const point of points) {
    lookup.set(`${point.uri}|${point.date}`, point);
  }

  return songs.map((song) => {
    const label = labelMap.get(song.uri) ?? song.uri;
    const color = colorForUri(song.uri);
    const data = dates.map((date) => {
      const point = lookup.get(`${song.uri}|${date}`);
      if (!point) return null;
      return metric === 'streams' ? point.streams : point.rank;
    });

    return { label, color, data };
  });
}

function MainPage({ state }: MainPageProps) {
  const { songs, points } = state;
  const [selectedRounds, setSelectedRounds] = useState<Round[]>(ROUND_OPTIONS);
  const allDates = useMemo(() => sortUniqueDates(points.map((point) => point.date)), [points]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!allDates.length) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    setDateFrom((prev) => (prev && allDates.includes(prev) ? prev : allDates[0]));
    setDateTo((prev) => (prev && allDates.includes(prev) ? prev : allDates[allDates.length - 1]));
  }, [allDates]);

  const activeRounds = selectedRounds.length ? selectedRounds : ROUND_OPTIONS;
  const filteredSongs = useMemo(
    () => songs.filter((song) => song.rounds.some((round) => activeRounds.includes(round))),
    [songs, activeRounds]
  );
  const allowedUris = useMemo(
    () => new Set(filteredSongs.map((song) => song.uri)),
    [filteredSongs]
  );

  const filteredPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          allowedUris.has(point.uri) && inDateRange(point.date, dateFrom, dateTo)
      ),
    [points, allowedUris, dateFrom, dateTo]
  );

  const displayDates = useMemo(
    () => allDates.filter((date) => inDateRange(date, dateFrom, dateTo)),
    [allDates, dateFrom, dateTo]
  );

  const labelMap = useMemo(() => buildLabelMap(points), [points]);

  const streamSeries = useMemo(
    () => buildSeries(filteredSongs, filteredPoints, displayDates, labelMap, 'streams'),
    [filteredSongs, filteredPoints, displayDates, labelMap]
  );

  const rankSeries = useMemo(
    () => buildSeries(filteredSongs, filteredPoints, displayDates, labelMap, 'rank'),
    [filteredSongs, filteredPoints, displayDates, labelMap]
  );

  const dateLabels = displayDates.map(formatDisplayDate);
  const noSongs = songs.length === 0;
  const noData = points.length === 0;
  const noMatches = !noSongs && filteredSongs.length === 0;
  const minDate = allDates[0] ?? '';
  const maxDate = allDates[allDates.length - 1] ?? '';

  const toggleRound = (round: Round) => {
    setSelectedRounds((prev) =>
      prev.includes(round) ? prev.filter((item) => item !== round) : [...prev, round]
    );
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Melodifestivalen 2026</p>
          <h1>Streaming Trends Dashboard</h1>
          <p className="hero-subtitle">
            Daily Melodifestivalen 2026 Spotify charts
          </p>
        </div>
        <div className="hero-card">
          <div>
            <p className="hero-card-label">Active songs</p>
            <p className="hero-card-value">{songs.length}</p>
          </div>
          <div>
            <p className="hero-card-label">Data days</p>
            <p className="hero-card-value">{allDates.length}</p>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Filters</h2>
          <p>Pick rounds and date range.</p>
        </div>
        <div className="filters">
          <div className="filter-block">
            <p className="filter-title">Rounds</p>
            <div className="round-grid">
              {ROUND_OPTIONS.map((round) => (
                <label key={round} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRounds.includes(round)}
                    onChange={() => toggleRound(round)}
                  />
                  <span>{roundDescriptions[round]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="filter-block">
            <p className="filter-title">Date range</p>
            <div className="date-range">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {noSongs && (
        <section className="empty">
          <h3>No songs configured yet</h3>
          <p>Open the hidden admin page and add the songs you want to track.</p>
        </section>
      )}

      {!noSongs && noData && (
        <section className="empty">
          <h3>No data yet</h3>
          <p>Upload daily CSVs in the admin page to start building trends.</p>
        </section>
      )}

      {noMatches && (
        <section className="empty">
          <h3>No songs match the selected rounds</h3>
          <p>Adjust the round filters to see your configured songs.</p>
        </section>
      )}

      {!noSongs && !noData && !noMatches && (
        <section className="charts">
          <ChartCard
            title="Streams"
            subtitle="Total streams per day. Higher is better."
            labels={dateLabels}
            series={streamSeries}
            valueLabel="Streams"
          />
          <SongLegend items={streamSeries} />
          <ChartCard
            title="Rank"
            subtitle="Chart rank per day. Lower is better."
            labels={dateLabels}
            series={rankSeries}
            reverseY
            valueLabel="Rank"
            valueFormatter={(value) => `#${value}`}
          />
          <SongLegend items={rankSeries} />
        </section>
      )}
    </div>
  );
}

export default MainPage;
