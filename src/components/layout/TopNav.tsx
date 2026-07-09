import { Download, Film, Sparkles } from "lucide-react";
import { topNavigationItems } from "../../app/routes";
import type { RoutePath } from "../../types";

interface TopNavProps {
  readonly currentPath: RoutePath;
  readonly onNavigate: (path: RoutePath) => void;
}

export const TopNav = ({ currentPath, onNavigate }: TopNavProps) => {
  const actionLabel = currentPath === "/workspace" ? "导出结果" : "开始生成 LUT";
  const actionPath: RoutePath = currentPath === "/workspace" ? "/export" : "/workspace";

  return (
    <nav className="top-nav" aria-label="顶部导航">
      <button className="brand-button" title="返回首页" type="button" onClick={() => onNavigate("/")}>
        <Film aria-hidden="true" />
        AI Film LUT Studio
      </button>
      <div className="top-nav-links">
        {topNavigationItems.map((item) => (
          <button
            className={currentPath === item.path ? "nav-link active" : "nav-link"}
            key={item.path}
            title={item.tooltip}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button className="top-action-button" type="button" onClick={() => onNavigate(actionPath)}>
        {currentPath === "/workspace" ? <Download aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {actionLabel}
      </button>
    </nav>
  );
};
