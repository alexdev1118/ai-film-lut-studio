import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeRoutePath } from "./app/routes";
import { Layout } from "./components/layout/Layout";
import type { RoutePath } from "./types";
import { ColorAnalysis } from "./pages/ColorAnalysis";
import { ExportResult } from "./pages/ExportResult";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { PhotoPreset } from "./pages/PhotoPreset";
import { StyleLibrary } from "./pages/StyleLibrary";
import { Tutorial } from "./pages/Tutorial";
import { Workspace } from "./pages/Workspace";

const readCurrentPath = (): RoutePath => normalizeRoutePath(window.location.pathname);

const readSelectedStyleName = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get("style") ?? "";
};

const App = () => {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => readCurrentPath());
  const [selectedStyleName, setSelectedStyleName] = useState<string>(() => readSelectedStyleName());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(readCurrentPath());
      setSelectedStyleName(readSelectedStyleName());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = useCallback((path: RoutePath, query = "") => {
    const url = query.length > 0 ? `${path}?${query}` : path;
    window.history.pushState({}, "", url);
    setCurrentPath(path);
    setSelectedStyleName(readSelectedStyleName());
  }, []);

  const page = useMemo(() => {
    switch (currentPath) {
      case "/":
        return <Home onNavigate={navigate} />;
      case "/workspace":
        return <Workspace selectedStyleName={selectedStyleName} onNavigate={navigate} />;
      case "/photo-preset":
        return <PhotoPreset />;
      case "/styles":
        return <StyleLibrary onNavigate={navigate} />;
      case "/analysis":
        return <ColorAnalysis />;
      case "/history":
        return <History />;
      case "/tutorial":
        return <Tutorial />;
      case "/export":
        return <ExportResult selectedStyleName={selectedStyleName} onNavigate={navigate} />;
      default:
        return <Home onNavigate={navigate} />;
    }
  }, [currentPath, navigate, selectedStyleName]);

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      {page}
    </Layout>
  );
};

export default App;
