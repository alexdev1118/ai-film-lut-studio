import { Link } from 'react-router-dom';
import { Film, CheckCircle2, Download, FileText, Copy, Video, Lightbulb, ArrowLeft, Palette, Grid, Info } from 'lucide-react';

export default function ExportResult() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-margin-desktop py-12 flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center mb-12 w-full max-w-3xl animate-[fadeIn_0.5s_ease-out]">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-container/10 border border-primary/20 mb-6 relative">
          <div className="absolute inset-0 rounded-full border border-primary/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <Film className="w-12 h-12 text-primary glow-text" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl text-on-surface mb-4 font-bold">你的专属 LUT 已生成</h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
          现在你可以下载 .cube 文件，并在达芬奇、Premiere Pro、剪映、Final Cut Pro 等软件中继续使用。
        </p>
      </div>

      {/* Bento Grid Layout for Details & Actions */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
        {/* Left Column: LUT Info (Glassmorphic) */}
        <div className="lg:col-span-5 glass-panel glow-border rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group hover:shadow-[0_0_40px_-10px_rgba(164,230,255,0.15)] transition-all duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-xl pointer-events-none"></div>
          
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl text-on-surface font-bold">Cyber_Neon_V1.cube</h2>
              <span className="px-3 py-1 bg-surface-container-high rounded-full font-mono text-xs text-secondary border border-secondary/20">33x33x33</span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-outline uppercase tracking-wider">选用风格</span>
                <span className="text-on-surface">青橙电影感</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-outline uppercase tracking-wider">风格强度</span>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface">85%</span>
                  <div className="h-1 flex-grow bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[85%]"></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-outline uppercase tracking-wider">输入色彩空间</span>
                <span className="text-on-surface font-mono text-sm">Rec.709</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-outline uppercase tracking-wider">肤色保护</span>
                <div className="flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>已启用</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 p-4 rounded-lg bg-surface-container-high/50 border border-outline-variant/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
            <p className="text-sm text-on-surface-variant leading-snug">
              文件已优化，支持 32-bit 浮点色彩深度处理，可避免色彩断层。
            </p>
          </div>
        </div>

        {/* Right Column: Download Actions */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-panel glow-border rounded-xl p-8 flex flex-col justify-center items-center h-full min-h-[240px]">
            <button className="w-full max-w-md btn-primary rounded-lg py-4 px-8 font-display text-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_6px_20px_0_rgba(0,242,255,0.3)] hover:-translate-y-1">
              <Download className="w-6 h-6" />
              下载 LUT (.cube)
            </button>
            <div className="flex flex-wrap justify-center gap-4 mt-8 w-full max-w-md">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant/30 text-on-surface transition-colors text-sm">
                <FileText className="w-4 h-4" />
                下载使用说明
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant/30 text-on-surface transition-colors text-sm">
                <Copy className="w-4 h-4" />
                复制使用建议
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area: Software Instructions & Pro Tips */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
        {/* Software Instructions Grid */}
        <div className="lg:col-span-2 glass-panel glow-border rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/20 pb-4">
            <Video className="w-6 h-6 text-primary" />
            <h3 className="font-display text-xl text-on-surface font-bold">兼容软件说明</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DaVinci */}
            <div className="p-4 rounded-lg bg-surface-container/50 border border-outline-variant/20 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-surface-container-high border border-outline-variant/50">
                  <span className="font-mono text-[10px] text-on-surface font-bold">DR</span>
                </div>
                <span className="font-display text-lg text-on-surface group-hover:text-primary transition-colors font-semibold">DaVinci Resolve</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">将 .cube 放入 LUT 文件夹。建议应用在节点树末端，并在其之前进行基础曝光和白平衡校正。</p>
            </div>
            {/* Premiere Pro */}
            <div className="p-4 rounded-lg bg-surface-container/50 border border-outline-variant/20 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[#2b005c] border border-[#9999ff]/50">
                  <span className="font-mono text-[10px] text-[#9999ff] font-bold">Pr</span>
                </div>
                <span className="font-display text-lg text-on-surface group-hover:text-primary transition-colors font-semibold">Premiere Pro</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">通过 Lumetri Color 面板的 "Creative" 选项卡加载，可随时调节 "Intensity" 滑块控制效果强度。</p>
            </div>
            {/* CapCut */}
            <div className="p-4 rounded-lg bg-surface-container/50 border border-outline-variant/20 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-surface-container-high border border-outline-variant/50">
                  <span className="font-mono text-[10px] text-on-surface font-bold">剪映</span>
                </div>
                <span className="font-display text-lg text-on-surface group-hover:text-primary transition-colors font-semibold">剪映 (CapCut)</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">在“调节”面板导入外部 LUT。由于此 LUT 为 Rec.709 设计，若素材为 Log 需先转码为 Rec.709。</p>
            </div>
            {/* FCP */}
            <div className="p-4 rounded-lg bg-surface-container/50 border border-outline-variant/20 hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-surface-container-high border border-outline-variant/50">
                  <span className="font-mono text-[10px] text-on-surface font-bold">FCP</span>
                </div>
                <span className="font-display text-lg text-on-surface group-hover:text-primary transition-colors font-semibold">Final Cut Pro</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">添加 "Custom LUT" 效果，选择加载本地 .cube 文件。建议将输入色彩空间设为对应相机的标准。</p>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="lg:col-span-1 glass-panel glow-border rounded-xl p-8 bg-gradient-to-b from-surface-container to-surface">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/20 pb-4">
            <Lightbulb className="w-6 h-6 text-secondary" />
            <h3 className="font-display text-xl text-on-surface font-bold">专业提示</h3>
          </div>
          <ul className="space-y-5">
            <li className="flex items-start gap-3 group">
              <CheckCircle2 className="w-5 h-5 text-outline mt-0.5 group-hover:text-primary transition-colors shrink-0" />
              <div>
                <strong className="block text-on-surface mb-1 font-medium">Log 色彩还原</strong>
                <p className="text-sm text-on-surface-variant">此 LUT 是为 Rec.709 色彩空间设计的。请确保您的 Log 素材已经还原到了标准色彩空间。</p>
              </div>
            </li>
            <li className="flex items-start gap-3 group">
              <CheckCircle2 className="w-5 h-5 text-outline mt-0.5 group-hover:text-primary transition-colors shrink-0" />
              <div>
                <strong className="block text-on-surface mb-1 font-medium">风格强化</strong>
                <p className="text-sm text-on-surface-variant">对于“赛博霓虹”风格，适当的暗部压低和轻微的欠曝会增强青色/橙色的对比度。</p>
              </div>
            </li>
            <li className="flex items-start gap-3 group">
              <CheckCircle2 className="w-5 h-5 text-outline mt-0.5 group-hover:text-primary transition-colors shrink-0" />
              <div>
                <strong className="block text-on-surface mb-1 font-medium">手动微调</strong>
                <p className="text-sm text-on-surface-variant">如果肤色显得过于饱和，可以将 LUT 不透明度降低至 70-80% 或对面部进行遮罩处理。</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div className="w-full flex flex-wrap justify-center items-center gap-6 mt-4 border-t border-outline-variant/20 pt-8 pb-8">
        <Link to="/workspace" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          返回工作台
        </Link>
        <div className="w-1 h-1 rounded-full bg-outline-variant hidden md:block"></div>
        <Link to="/workspace" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
          <Palette className="w-5 h-5" />
          继续生成新的 LUT
        </Link>
        <div className="w-1 h-1 rounded-full bg-outline-variant hidden md:block"></div>
        <Link to="/styles" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
          <Grid className="w-5 h-5" />
          浏览更多风格
        </Link>
      </div>
    </div>
  );
}
