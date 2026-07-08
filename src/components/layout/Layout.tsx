import type { ReactNode } from "react";
import type { RoutePath } from "../../types";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface LayoutProps {
  readonly children: ReactNode;
  readonly currentPath: RoutePath;
  readonly onNavigate: (path: RoutePath, query?: string) => void;
}

export const Layout = ({ children, currentPath, onNavigate }: LayoutProps) => {
  return (
    <div className="app-shell">
      <TopNav currentPath={currentPath} onNavigate={(path) => onNavigate(path)} />
      <div className="app-body">
        <Sidebar currentPath={currentPath} onNavigate={(path) => onNavigate(path)} />
        <main className={currentPath === "/workspace" ? "page-content workspace-content" : "page-content"}>{children}</main>
      </div>
    </div>
  );
};
