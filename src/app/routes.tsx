import type { NavigationItem, RoutePath } from "../types";

export const topNavigationItems: readonly NavigationItem[] = [
  { label: "LUT 工作台", path: "/workspace", tooltip: "打开 LUT 工作台" },
  { label: "图片预设", path: "/photo-preset", tooltip: "打开图片预设" },
  { label: "风格库", path: "/styles", tooltip: "浏览风格库" },
  { label: "使用教程", path: "/tutorial", tooltip: "查看使用教程" }
];

export const sidebarNavigationItems: readonly NavigationItem[] = [
  { label: "LUT 工作台", path: "/workspace", tooltip: "打开 LUT 工作台" },
  { label: "图片预设", path: "/photo-preset", tooltip: "打开图片预设" },
  { label: "风格库", path: "/styles", tooltip: "浏览风格库" },
  { label: "色彩分析", path: "/analysis", tooltip: "查看色彩分析" },
  { label: "导出记录", path: "/history", tooltip: "查看导出记录" },
  { label: "使用教程", path: "/tutorial", tooltip: "查看使用教程" }
];

export const routeLabels: Record<RoutePath, string> = {
  "/": "首页",
  "/workspace": "LUT 工作台",
  "/photo-preset": "图片预设",
  "/styles": "风格库",
  "/analysis": "色彩分析",
  "/history": "导出记录",
  "/tutorial": "使用教程",
  "/export": "导出结果"
};

export const normalizeRoutePath = (pathname: string): RoutePath => {
  switch (pathname) {
    case "/":
    case "/workspace":
    case "/photo-preset":
    case "/styles":
    case "/analysis":
    case "/history":
    case "/tutorial":
    case "/export":
      return pathname;
    default:
      return "/";
  }
};
