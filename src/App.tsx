import { HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { AppState } from './types';
import { loadState, saveState } from './storage';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage state={state} />} />
        <Route path="/mfst-sets" element={<AdminPage state={state} setState={setState} />} />
        <Route path="*" element={<MainPage state={state} />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
