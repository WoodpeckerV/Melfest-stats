import type { AppState, Point, Round, Song } from './types';
import { ROUND_OPTIONS } from './utils';

const STORAGE_KEY = 'mfst_v1';

const EMPTY_STATE: AppState = {
  version: 1,
  songs: [],
  points: []
};

function isRound(value: unknown): value is Round {
  return typeof value === 'string' && ROUND_OPTIONS.includes(value as Round);
}

function sanitizeSongs(input: unknown): Song[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((song) => {
      if (!song || typeof song !== 'object') return null;
      const uri = typeof (song as Song).uri === 'string' ? (song as Song).uri.trim() : '';
      const roundsRaw = (song as Song).rounds;
      const rounds = Array.isArray(roundsRaw) ? roundsRaw.filter(isRound) : [];
      if (!uri) return null;
      return { uri, rounds } satisfies Song;
    })
    .filter(Boolean) as Song[];
}

function sanitizePoints(input: unknown): Point[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((point) => {
      if (!point || typeof point !== 'object') return null;
      const raw = point as Point;
      if (typeof raw.date !== 'string' || typeof raw.uri !== 'string') return null;
      if (!Number.isFinite(raw.rank) || !Number.isFinite(raw.streams)) return null;
      const artist = typeof raw.artist === 'string' ? raw.artist.trim() : '';
      const track = typeof raw.track === 'string' ? raw.track.trim() : '';
      if (!artist || !track) return null;
      return {
        date: raw.date,
        uri: raw.uri,
        rank: raw.rank,
        streams: raw.streams,
        artist,
        track
      } satisfies Point;
    })
    .filter(Boolean) as Point[];
}

function buildState(raw: unknown, strict: boolean): AppState {
  if (!raw || typeof raw !== 'object') {
    if (strict) throw new Error('Invalid JSON structure.');
    return EMPTY_STATE;
  }
  const version = (raw as AppState).version;
  if (version !== 1) {
    if (strict) throw new Error('Unsupported version.');
    return EMPTY_STATE;
  }
  const songs = sanitizeSongs((raw as AppState).songs);
  const allowedUris = new Set(songs.map((song) => song.uri));
  const points = sanitizePoints((raw as AppState).points).filter((point) =>
    allowedUris.has(point.uri)
  );
  return { version: 1, songs, points };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return buildState(JSON.parse(raw), false);
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  return buildState(JSON.parse(json), true);
}
