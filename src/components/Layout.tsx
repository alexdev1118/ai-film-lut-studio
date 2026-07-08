import { Outlet, Link, useLocation } from 'react-router-dom';
import { Film, User, Settings, Bell, Clapperboard, Image, Grid, History, BarChart3, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Global Background Elements */}
      <div className="mesh-gradient"></div>

      {/* TopNavBar */}
      <header className="bg-surface/40 backdrop-blur-xl fixed top-0 w-full flex justify-between items-center px-margin-desktop h-toolbar-height border-b border-outline-variant/30 shadow-sm z-50">
        <Link to="/" className="font-display text-xl font-bold text-primary-fixed-dim tracking-tight flex items-center gap-2">
          <Film className="w-6 h-6" />
          AI Film LUT Studio
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/workspace" className={cn("pb-1 font-medium transition-colors hover:text-primary-fixed-dim", location.pathname === '/workspace' ? "text-primary-fixed-dim border-b-2 border-primary-fixed-dim" : "text-on-surface-variant")}>LUT 工作台</Link>
          <Link to="/photo-preset" className={cn("pb-1 font-medium transition-colors hover:text-primary-fixed-dim", location.pathname === '/photo-preset' ? "text-primary-fixed-dim border-b-2 border-primary-fixed-dim" : "text-on-surface-variant")}>图片预设</Link>
          <Link to="/styles" className={cn("pb-1 font-medium transition-colors hover:text-primary-fixed-dim", location.pathname === '/styles' ? "text-primary-fixed-dim border-b-2 border-primary-fixed-dim" : "text-on-surface-variant")}>风格库</Link>
          <Link to="/tutorial" className={cn("pb-1 font-medium transition-colors hover:text-primary-fixed-dim", location.pathname === '/tutorial' ? "text-primary-fixed-dim border-b-2 border-primary-fixed-dim" : "text-on-surface-variant")}>使用教程</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link to="/workspace" className="hidden md:block bg-primary/10 hover:bg-primary/20 text-primary-fixed-dim border border-primary/30 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95">
            开始生成 LUT
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-toolbar-height relative z-10 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest py-8 border-t border-outline-variant/20 mt-auto z-10 relative">
        <div className="max-w-7xl mx-auto px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
            <Film className="w-5 h-5" />
            AI Film LUT Studio
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="font-medium text-on-surface-variant hover:text-secondary-fixed-dim transition-colors">服务条款</a>
            <a href="#" className="font-medium text-on-surface-variant hover:text-secondary-fixed-dim transition-colors">隐私政策</a>
            <a href="#" className="font-medium text-on-surface-variant hover:text-secondary-fixed-dim transition-colors">API 文档</a>
            <a href="#" className="font-medium text-on-surface-variant hover:text-secondary-fixed-dim transition-colors">联系支持</a>
          </div>
          <div className="font-mono text-sm text-on-surface-variant/70">
            © 2024 AI Film LUT Studio. Professional Grade Color Science.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function WorkspaceLayout() {
  const location = useLocation();

  const sidebarLinks = [
    { path: '/workspace', icon: Clapperboard, label: 'LUT 工作台' },
    { path: '/photo-preset', icon: Image, label: '图片预设' },
    { path: '/styles', icon: Grid, label: '风格库' },
    { path: '/analysis', icon: BarChart3, label: '色彩分析' },
    { path: '/history', icon: History, label: '导出记录' },
  ];

  return (
    <div className="bg-background text-on-surface h-screen w-screen overflow-hidden flex flex-col select-none relative">
      {/* Ambient Glows */}
      <div className="mesh-gradient"></div>

      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 h-toolbar-height flex justify-between items-center px-gutter bg-surface/40 backdrop-blur-2xl border-b border-outline-variant/30">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-primary-fixed-dim flex items-center gap-2">
            <Film className="w-6 h-6" />
            AI Film LUT Studio
          </Link>
          <div className="hidden md:flex gap-6 h-full items-center ml-8">
            <Link to="/workspace" className={cn("font-medium transition-colors hover:text-primary", location.pathname === '/workspace' ? "text-primary border-b-2 border-primary h-[calc(100%+4px)] flex items-center" : "text-on-surface-variant")}>LUT 工作台</Link>
            <Link to="/photo-preset" className={cn("font-medium transition-colors hover:text-primary", location.pathname === '/photo-preset' ? "text-primary border-b-2 border-primary h-[calc(100%+4px)] flex items-center" : "text-on-surface-variant")}>图片预设</Link>
            <Link to="/styles" className={cn("font-medium transition-colors hover:text-primary", location.pathname === '/styles' ? "text-primary border-b-2 border-primary h-[calc(100%+4px)] flex items-center" : "text-on-surface-variant")}>风格库</Link>
            <Link to="/tutorial" className={cn("font-medium transition-colors hover:text-primary", location.pathname === '/tutorial' ? "text-primary border-b-2 border-primary h-[calc(100%+4px)] flex items-center" : "text-on-surface-variant")}>使用教程</Link>
          </div>
        </div>
      </nav>

      {/* Side Nav */}
      <aside className="fixed left-0 top-toolbar-height h-[calc(100vh-toolbar-height-64px)] z-40 flex flex-col w-[64px] bg-surface/40 backdrop-blur-3xl border-r border-outline-variant/30 py-4 items-center gap-6">
        <div className="flex flex-col gap-4 w-full px-2">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <div key={link.path} className="relative group flex justify-center">
                <Link
                  to={link.path}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                    isActive 
                      ? "bg-primary-container/20 text-primary border-l-4 border-primary" 
                      : "text-on-surface-variant opacity-60 hover:bg-surface-variant/40 hover:opacity-100"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                </Link>
                {/* Tooltip */}
                <div className="absolute left-[52px] top-1/2 -translate-y-1/2 px-2 py-1 bg-surface-container-high text-on-surface text-xs font-medium rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap border border-outline-variant/50 shadow-lg z-50">
                  {link.label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col gap-4 w-full px-2">
          <div className="relative group flex justify-center">
            <Link
              to="/tutorial"
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                location.pathname === '/tutorial'
                  ? "bg-primary-container/20 text-primary border-l-4 border-primary"
                  : "text-on-surface-variant opacity-60 hover:bg-surface-variant/40 hover:opacity-100"
              )}
            >
              <HelpCircle className="w-5 h-5" />
            </Link>
            <div className="absolute left-[52px] top-1/2 -translate-y-1/2 px-2 py-1 bg-surface-container-high text-on-surface text-xs font-medium rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap border border-outline-variant/50 shadow-lg z-50">
              使用教程
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 ml-[64px] mt-toolbar-height mb-[64px] flex gap-4 p-4 overflow-hidden relative z-10">
        <Outlet />
      </main>

      {/* Bottom Export Bar is inside Workspace.tsx due to state binding */}
    </div>
  );
}
