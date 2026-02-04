import type { Round } from './types';

export const ROUND_OPTIONS: Round[] = [
  'Heat 1',
  'Heat 2',
  'Heat 3',
  'Heat 4',
  'Heat 5',
  'Finalkval',
  'Final'
];

export function extractDateFromFilename(name: string): string | null {
  const match = name.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function sortUniqueDates(dates: string[]): string[] {
  const unique = Array.from(new Set(dates));
  unique.sort();
  return unique;
}

export function inDateRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function colorForUri(uri: string): string {
  let hash = 0;
  for (let i = 0; i < uri.length; i += 1) {
    hash = (hash * 31 + uri.charCodeAt(i)) % 360;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 75%, 58%)`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
