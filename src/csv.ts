import Papa from 'papaparse';
import type { Point } from './types';
import { extractDateFromFilename } from './utils';

export type CsvParseResult = {
  date: string;
  points: Point[];
  skipped: number;
};

export async function parseCsvFile(
  file: File,
  allowedUris: Set<string>
): Promise<CsvParseResult> {
  const date = extractDateFromFilename(file.name);
  if (!date) {
    throw new Error('Filename must include a date like 2026-02-03.');
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors?.length) {
          const message = results.errors[0]?.message ?? 'Unknown CSV parsing error.';
          reject(new Error(message));
          return;
        }

        const points: Point[] = [];
        let skipped = 0;

        for (const row of results.data ?? []) {
          const uri = (row.uri || row.url || row.URL || row.URI || '').trim();
          if (!uri || !allowedUris.has(uri)) {
            skipped += 1;
            continue;
          }

          const rank = Number((row.rank || '').replace(/,/g, ''));
          const streams = Number((row.streams || '').replace(/,/g, ''));
          const artist = (row.artist_names || '').trim();
          const track = (row.track_name || '').trim();

          if (!Number.isFinite(rank) || !Number.isFinite(streams) || !artist || !track) {
            skipped += 1;
            continue;
          }

          points.push({
            date,
            uri,
            rank,
            streams,
            artist,
            track
          });
        }

        resolve({ date, points, skipped });
      },
      error: (error) => reject(error)
    });
  });
}
