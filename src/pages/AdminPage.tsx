import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AppState, Round } from '../types';
import { ROUND_OPTIONS } from '../utils';
import {
  clearState,
  exportState,
  importState,
  loadRemoteState,
  REPO_DATA_PATH
} from '../storage';
import { parseCsvFile } from '../csv';
import {
  clearLinkedFileHandle,
  ensureWritePermission,
  getLinkedFileHandle,
  setLinkedFileHandle,
  writeFileHandle
} from '../fileHandle';

const roundDescriptions: Record<Round, string> = {
  'Heat 1': 'Heat 1',
  'Heat 2': 'Heat 2',
  'Heat 3': 'Heat 3',
  'Heat 4': 'Heat 4',
  'Heat 5': 'Heat 5',
  Finalkval: 'Finalkval',
  Final: 'Final'
};

type AdminPageProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
};

type Status = {
  type: 'success' | 'error' | 'info';
  message: string;
};

function buildLabelMap(points: AppState['points']): Map<string, string> {
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

function replacePointsForDate(
  points: AppState['points'],
  date: string,
  incoming: AppState['points']
) {
  return [...points.filter((point) => point.date !== date), ...incoming];
}

function AdminPage({ state, setState }: AdminPageProps) {
  const [newUri, setNewUri] = useState('');
  const [newRounds, setNewRounds] = useState<Round[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [linkedHandle, setLinkedHandle] = useState<FileSystemFileHandle | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const fileApiSupported = Boolean(window.showOpenFilePicker || window.showSaveFilePicker);

  const allowedUris = useMemo(
    () => new Set(state.songs.map((song) => song.uri)),
    [state.songs]
  );
  const labelMap = useMemo(() => buildLabelMap(state.points), [state.points]);

  useEffect(() => {
    if (!fileApiSupported) return;
    getLinkedFileHandle()
      .then((handle) => setLinkedHandle(handle))
      .catch(() => setLinkedHandle(null));
  }, [fileApiSupported]);

  useEffect(() => {
    if (!linkedHandle) return;
    const payload = exportState(state);
    saveQueue.current = saveQueue.current
      .then(async () => {
        const ok = await ensureWritePermission(linkedHandle);
        if (!ok) throw new Error('Write permission denied.');
        await writeFileHandle(linkedHandle, payload);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to write file.';
        setStatus({ type: 'error', message: `Auto-save failed: ${message}` });
      });
  }, [state, linkedHandle]);

  const addSong = () => {
    const uri = newUri.trim();
    if (!uri || newRounds.length === 0) {
      setStatus({ type: 'error', message: 'Provide a uri and select at least one round.' });
      return;
    }

    if (state.songs.some((song) => song.uri === uri)) {
      setStatus({ type: 'error', message: 'Song already exists.' });
      return;
    }

    setState((prev) => ({
      ...prev,
      songs: [...prev.songs, { uri, rounds: [...newRounds] }]
    }));

    setNewUri('');
    setNewRounds([]);
    setStatus({ type: 'success', message: 'Song added.' });
  };

  const removeSong = (uri: string) => {
    setState((prev) => ({
      ...prev,
      songs: prev.songs.filter((song) => song.uri !== uri),
      points: prev.points.filter((point) => point.uri !== uri)
    }));
  };

  const toggleNewRound = (round: Round) => {
    setNewRounds((prev) =>
      prev.includes(round) ? prev.filter((item) => item !== round) : [...prev, round]
    );
  };

  const toggleSongRound = (uri: string, round: Round) => {
    setState((prev) => ({
      ...prev,
      songs: prev.songs.map((song) => {
        if (song.uri !== uri) return song;
        const rounds = song.rounds.includes(round)
          ? song.rounds.filter((item) => item !== round)
          : [...song.rounds, round];
        return { ...song, rounds };
      })
    }));
  };

  const handleCsvFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    if (!allowedUris.size) {
      setStatus({ type: 'error', message: 'Add songs before uploading CSV files.' });
      return;
    }

    const results: { date: string; points: AppState['points']; skipped: number }[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      try {
        const result = await parseCsvFile(file, allowedUris);
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error.';
        errors.push(`${file.name}: ${message}`);
      }
    }

    if (results.length) {
      setState((prev) => {
        let updatedPoints = prev.points;
        for (const result of results) {
          updatedPoints = replacePointsForDate(updatedPoints, result.date, result.points);
        }
        return { ...prev, points: updatedPoints };
      });
    }

    const report = results
      .map((result) =>
        `Imported ${result.points.length} rows for ${result.date} (skipped ${result.skipped}).`
      )
      .join(' ');

    const errorReport = errors.length ? ` Errors: ${errors.join(' | ')}` : '';
    const message = `${report}${errorReport}`.trim();

    if (message) {
      setStatus({ type: errors.length ? 'error' : 'success', message });
    }
  };

  const handleExport = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'melodifestivalen-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importState(text);
      setState(imported);
      setStatus({ type: 'success', message: 'JSON imported successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON file.';
      setStatus({ type: 'error', message });
    }
  };

  const handleClear = () => {
    const ok = window.confirm('Clear all songs and data? This cannot be undone.');
    if (!ok) return;
    clearState();
    setState({ version: 1, songs: [], points: [] });
    setStatus({ type: 'info', message: 'All data cleared.' });
  };

  const pickRepoFileHandle = async () => {
    if (window.showOpenFilePicker) {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        multiple: false
      });
      return handle;
    }
    if (window.showSaveFilePicker) {
      return window.showSaveFilePicker({
        suggestedName: 'mfst-data.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
    }
    throw new Error('File picker not supported in this browser.');
  };

  const handleLinkRepoFile = async () => {
    if (!fileApiSupported) {
      setStatus({
        type: 'error',
        message:
          'File linking is only supported in Chromium-based browsers. Use Export JSON instead.'
      });
      return;
    }
    try {
      const handle = await pickRepoFileHandle();
      if (!handle) return;
      await setLinkedFileHandle(handle);
      setLinkedHandle(handle);
      const ok = await ensureWritePermission(handle);
      if (!ok) {
        setStatus({
          type: 'error',
          message: 'Write permission was denied. Please re-link the file.'
        });
        return;
      }
      await writeFileHandle(handle, exportState(state));
      setStatus({
        type: 'success',
        message: `Linked ${handle.name}. Auto-save enabled. Commit and push after updates.`
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'Failed to link file.';
      setStatus({ type: 'error', message });
    }
  };

  const handleUnlinkRepoFile = async () => {
    await clearLinkedFileHandle();
    setLinkedHandle(null);
    setStatus({ type: 'info', message: 'Repo file unlinked. Auto-save disabled.' });
  };

  const handleManualSave = async () => {
    if (!linkedHandle) {
      setStatus({ type: 'error', message: 'No repo file linked.' });
      return;
    }
    try {
      const ok = await ensureWritePermission(linkedHandle);
      if (!ok) throw new Error('Write permission denied.');
      await writeFileHandle(linkedHandle, exportState(state));
      setStatus({ type: 'success', message: 'Saved to linked file.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write file.';
      setStatus({ type: 'error', message });
    }
  };

  const handleLoadRemote = async () => {
    const ok = window.confirm('Replace local data with the repository data file?');
    if (!ok) return;
    const remote = await loadRemoteState();
    if (!remote) {
      setStatus({
        type: 'error',
        message: 'Could not load repository data. Make sure the file exists.'
      });
      return;
    }
    setState(remote);
    setStatus({ type: 'success', message: 'Repository data loaded.' });
  };

  return (
    <div className="app admin">
      <header className="hero">
        <div className="hero-content">
          <p className="eyebrow">Admin</p>
          <h1>Data & Song Setup</h1>
          <p className="hero-subtitle">Add the songs to track, upload CSVs, and export data.</p>
        </div>
        <div className="hero-card">
          <div>
            <p className="hero-card-label">Songs</p>
            <p className="hero-card-value">{state.songs.length}</p>
          </div>
          <div>
            <p className="hero-card-label">Rows</p>
            <p className="hero-card-value">{state.points.length}</p>
          </div>
        </div>
      </header>

      {status && (
        <div className={`status status-${status.type}`}>
          <p>{status.message}</p>
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Add song</h2>
          <p>Use the exact uri from the CSV files.</p>
        </div>
        <div className="song-form">
          <label>
            <span>Song uri</span>
            <input
              type="text"
              value={newUri}
              placeholder="spotify:track:..."
              onChange={(event) => setNewUri(event.target.value)}
            />
          </label>
          <div className="round-grid">
            {ROUND_OPTIONS.map((round) => (
              <label key={round} className="checkbox">
                <input
                  type="checkbox"
                  checked={newRounds.includes(round)}
                  onChange={() => toggleNewRound(round)}
                />
                <span>{roundDescriptions[round]}</span>
              </label>
            ))}
          </div>
          <button className="btn" onClick={addSong}>
            Add song
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Configured songs</h2>
          <p>Assign rounds for each song. You can add multiple rounds per song.</p>
        </div>
        <div className="song-list">
          {state.songs.length === 0 && <p className="muted">No songs yet.</p>}
          {state.songs.map((song) => (
            <div key={song.uri} className="song-row">
              <div>
                {labelMap.get(song.uri) ? (
                  <>
                    <p className="song-title">{labelMap.get(song.uri)}</p>
                    <p className="song-uri">{song.uri}</p>
                  </>
                ) : (
                  <p className="song-uri">{song.uri}</p>
                )}
                <div className="round-grid small">
                  {ROUND_OPTIONS.map((round) => (
                    <label key={round} className="checkbox">
                      <input
                        type="checkbox"
                        checked={song.rounds.includes(round)}
                        onChange={() => toggleSongRound(song.uri, round)}
                      />
                      <span>{roundDescriptions[round]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn ghost" onClick={() => removeSong(song.uri)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>CSV uploads</h2>
          <p>
            Drop or select daily chart files. Filenames must include YYYY-MM-DD.
            Existing dates will be replaced.
          </p>
        </div>
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleCsvFiles(event.dataTransfer.files);
          }}
        >
          <p>Drag CSV files here</p>
          <label className="btn">
            Select CSV files
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={(event) => handleCsvFiles(event.target.files ?? [])}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Data tools</h2>
          <p>
            Export or import the full dataset and configuration. Repository file:{' '}
            <code>{REPO_DATA_PATH}</code>
          </p>
        </div>
        <div className="tool-row">
          <button className="btn" onClick={handleExport}>
            Export JSON
          </button>
          {linkedHandle ? (
            <button className="btn" onClick={handleManualSave}>
              Save now
            </button>
          ) : (
            <button className="btn" onClick={handleLinkRepoFile}>
              Link repo file
            </button>
          )}
          <button className="btn ghost" onClick={handleLoadRemote}>
            Load from repo
          </button>
          <label className="btn ghost">
            Import JSON
            <input
              type="file"
              accept="application/json"
              onChange={(event) => handleImportFile(event.target.files?.[0])}
            />
          </label>
          <button className="btn danger" onClick={handleClear}>
            Clear all data
          </button>
        </div>
        {linkedHandle && (
          <div className="linked-file">
            <span>Linked file:</span>
            <strong>{linkedHandle.name}</strong>
            <button className="btn ghost" onClick={handleUnlinkRepoFile}>
              Unlink
            </button>
          </div>
        )}
        {!fileApiSupported && (
          <p className="muted" style={{ marginTop: 12 }}>
            File linking requires a Chromium-based browser.
          </p>
        )}
      </section>

      <footer className="admin-footer">
        <a className="link" href="#/">
          Back to charts
        </a>
      </footer>
    </div>
  );
}

export default AdminPage;
