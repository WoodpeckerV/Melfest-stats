export type Round =
  | 'Heat 1'
  | 'Heat 2'
  | 'Heat 3'
  | 'Heat 4'
  | 'Heat 5'
  | 'Finalkval'
  | 'Final';

export type Song = {
  uri: string;
  rounds: Round[];
};

export type Point = {
  date: string; // YYYY-MM-DD
  uri: string;
  rank: number;
  streams: number;
  artist: string;
  track: string;
};

export type AppState = {
  version: 1;
  songs: Song[];
  points: Point[];
};
