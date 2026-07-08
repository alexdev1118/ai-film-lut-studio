import type { LucideIcon } from "lucide-react";
import { BarChart3, Clapperboard, Grid3X3, HelpCircle, History, Image } from "lucide-react";
import { sidebarNavigationItems } from "../../app/routes";
import type { RoutePath } from "../../types";

interface SidebarProps {
  readonly currentPath: RoutePath;
  readonly onNavigate: (path: RoutePath) => void;
}

const sidebarIcons: Record<RoutePath, LucideIcon> = {
  "/": Clapperboard,
  "/workspace": Clapperboard,
  "/photo-preset": Image,
  "/styles": Grid3X3,
  "/analysis": BarChart3,
  "/history": History,
  "/tutorial": HelpCircle,
  "/export": Clapperboard
};

export const Sidebar = ({ currentPath, onNavigate }: SidebarProps) => {
  return (
    <aside className="sidebar" aria-label="左侧功能栏">
      <div className="sidebar-group">
        {sidebarNavigationItems.map((item) => {
          const Icon = sidebarIcons[item.path];

          return (
            <button
              className={currentPath === item.path ? "sidebar-item active" : "sidebar-item"}
              key={item.path}
              title={item.tooltip}
              type="button"
              onClick={() => onNavigate(item.path)}
            >
              <Icon aria-hidden="true" className="sidebar-icon" />
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
