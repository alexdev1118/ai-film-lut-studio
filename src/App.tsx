import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { normalizeRoutePath } from "./app/routes";
import { Layout } from "./components/layout/Layout";
import type { RoutePath } from "./types";
import { WorkspaceProvider } from "./state/WorkspaceContext";
import type { LutStyleStrength } from "./types/lutStyles";
import { parseLutStyleStrength } from "./utils/styleSelection";

const ColorAnalysis = lazy(() => import("./pages/ColorAnalysis").then((module) => ({ default: module.ColorAnalysis })));
const ExportResult = lazy(() => import("./pages/ExportResult").then((module) => ({ default: module.ExportResult })));
const History = lazy(() => import("./pages/History").then((module) => ({ default: module.History })));
const Home = lazy(() => import("./pages/Home").then((module) => ({ default: module.Home })));
const PhotoPreset = lazy(() => import("./pages/PhotoPreset").then((module) => ({ default: module.PhotoPreset })));
const StyleLibrary = lazy(() => import("./pages/StyleLibrary").then((module) => ({ default: module.StyleLibrary })));
const Tutorial = lazy(() => import("./pages/Tutorial").then((module) => ({ default: module.Tutorial })));
const Workspace = lazy(() => import("./pages/Workspace").then((module) => ({ default: module.Workspace })));

const readCurrentPath = (): RoutePath => normalizeRoutePath(window.location.pathname);

const readSelectedStyleName = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get("style") ?? "";
};

const readSelectedStyleStrength = (): LutStyleStrength | undefined => {
  const params = new URLSearchParams(window.location.search);
  return parseLutStyleStrength(params.get("strength"));
};

const App = () => {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => readCurrentPath());
  const [selectedStyleName, setSelectedStyleName] = useState<string>(() => readSelectedStyleName());
  const [selectedStyleStrength, setSelectedStyleStrength] = useState<LutStyleStrength | undefined>(() => readSelectedStyleStrength());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(readCurrentPath());
      setSelectedStyleName(readSelectedStyleName());
      setSelectedStyleStrength(readSelectedStyleStrength());
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
    setSelectedStyleStrength(readSelectedStyleStrength());
  }, []);

  const page = useMemo(() => {
    switch (currentPath) {
      case "/":
        return <Home onNavigate={navigate} />;
      case "/workspace":
        return <Workspace selectedStyleName={selectedStyleName} selectedStyleStrength={selectedStyleStrength} onNavigate={navigate} />;
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
  }, [currentPath, navigate, selectedStyleName, selectedStyleStrength]);

  return (
    <WorkspaceProvider>
      <Layout currentPath={currentPath} onNavigate={navigate}>
        <Suspense fallback={<div className="page-route-loading" role="status">正在加载工作区...</div>}>
          {page}
        </Suspense>
      </Layout>
    </WorkspaceProvider>
  );
};

export default App;
