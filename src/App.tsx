import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout, WorkspaceLayout } from './components/Layout';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import StyleLibrary from './pages/StyleLibrary';
import ExportResult from './pages/ExportResult';
import PhotoPreset from './pages/PhotoPreset';
import ColorAnalysis from './pages/ColorAnalysis';
import History from './pages/History';
import Tutorial from './pages/Tutorial';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/styles" element={<StyleLibrary />} />
          <Route path="/export" element={<ExportResult />} />
          <Route path="/tutorial" element={<Tutorial />} />
        </Route>
        <Route element={<WorkspaceLayout />}>
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/photo-preset" element={<PhotoPreset />} />
          <Route path="/analysis" element={<ColorAnalysis />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
