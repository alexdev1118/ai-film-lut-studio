import { Link } from 'react-router-dom';
import { Sparkles, Grid, Palette, Download, SplitSquareHorizontal, Eye, FileDown, Image as ImageIcon, SlidersHorizontal, Puzzle } from 'lucide-react';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center px-margin-desktop py-20 flex-1">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-primary-container/15 blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"></div>
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* Left: Typography & CTA */}
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-5xl md:text-6xl text-on-surface font-bold leading-tight">
              上传参考图，<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container to-secondary-container">
                一键生成你的电影感 LUT
              </span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
              AI 分析参考图的色彩、影调与对比度，生成可预览、可微调、可导出的 .cube LUT。为专业调色师与创作者打造的高级数字暗房。
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <Link to="/workspace" className="px-8 py-4 btn-primary rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                开始生成 LUT
              </Link>
              <Link to="/styles" className="px-8 py-4 glass-panel glow-border text-on-surface rounded-lg hover:bg-surface-variant/80 transition-colors flex items-center gap-2">
                <Grid className="w-5 h-5" />
                查看风格库
              </Link>
            </div>
          </div>

          {/* Right: Product Interface Preview */}
          <div className="relative w-full aspect-video rounded-xl glow-border glass-panel overflow-hidden group">
            <img 
              alt="Product Interface" 
              className="w-full h-full object-cover rounded-xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW_0NlQE9pZTZS3dPO5q46w16kgjWDw79Brco7e_4at6nzlxL7wiPeHGTv0qb_VQmUzfPQ3cva6KAEe2YHLkln-fUhPxg8huNRE_u4ClMKzN7_Fz4iAuLDlSFWpoH4vdPpndgKxQl-tFkyPScy55bsqNNMnsvGvN70YJFFZsq4TYx9-wtkOjgUCUCq3bieFAg5ePYMGstbp3ZMOL0yUOnUqfHK8p7IuF5TVxBgkhRUZtWuhitZfljWdgYdFEKXZcabpvtekYWSCuk" 
            />
            {/* Floating UI Element: Color Wheel Hint */}
            <div className="absolute bottom-6 left-6 glass-panel p-3 rounded-full border border-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-4 group-hover:translate-y-0">
              <Palette className="w-8 h-8 text-primary-fixed-dim" />
            </div>
            {/* Floating UI Element: Export Hint */}
            <div className="absolute top-6 right-6 glass-panel px-4 py-2 rounded-lg border border-outline-variant/30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 transform translate-y-4 group-hover:translate-y-0">
              <Download className="w-5 h-5 text-secondary-container" />
              <span className="font-mono text-sm text-on-surface">EXPORT .CUBE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase (Bento Grid) */}
      <section className="py-24 px-margin-desktop bg-surface-container-low/50 relative z-10 border-y border-outline-variant/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl text-on-surface mb-4 font-bold">核心功能</h2>
            <p className="text-on-surface-variant">专为精准色彩重构设计的专业级工具</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-panel p-8 rounded-xl glow-border hover:bg-surface-variant/40 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <SplitSquareHorizontal className="w-7 h-7 text-primary-fixed-dim" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">参考图仿色</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">上传任意图像，AI 深度学习算法解析其色彩基调与光影结构，瞬间提取核心风格特征。</p>
            </div>
            
            {/* Feature 2 */}
            <div className="glass-panel p-8 rounded-xl glow-border hover:bg-surface-variant/40 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-lg bg-secondary-container/10 flex items-center justify-center mb-6 group-hover:bg-secondary-container/20 transition-colors">
                <Eye className="w-7 h-7 text-secondary-container" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">实时预览</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">无缝衔接的 Split-View 界面，滑动查看应用前后的细微色彩变化，支持高分辨率图像与视频。</p>
            </div>
            
            {/* Feature 3 */}
            <div className="glass-panel p-8 rounded-xl glow-border hover:bg-surface-variant/40 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-lg bg-tertiary-container/10 flex items-center justify-center mb-6 group-hover:bg-tertiary-container/20 transition-colors">
                <FileDown className="w-7 h-7 text-tertiary-fixed-dim" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">LUT 导出</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">一键生成标准 .cube 格式文件，支持 17x17, 33x33 及 65x65 精度，满足各类影视后期制作需求。</p>
            </div>
            
            {/* Feature 4 */}
            <div className="glass-panel p-8 rounded-xl glow-border hover:bg-surface-variant/40 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <ImageIcon className="w-7 h-7 text-primary-fixed-dim" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">风格库</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">内置数百款经典电影感预设，涵盖赛博朋克、复古胶片、日系小清新等多种流派，即点即用。</p>
            </div>
            
            {/* Feature 5 */}
            <div className="glass-panel p-8 rounded-xl glow-border hover:bg-surface-variant/40 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-lg bg-secondary-container/10 flex items-center justify-center mb-6 group-hover:bg-secondary-container/20 transition-colors">
                <SlidersHorizontal className="w-7 h-7 text-secondary-container" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">参数微调</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">提供曝光、对比度、饱和度、色温等精细调节滑块，在 AI 生成的基础之上实现完美掌控。</p>
            </div>
            
            {/* Feature 6 */}
            <div className="glass-panel p-8 rounded-xl glow-border hover:bg-surface-variant/40 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-lg bg-tertiary-container/10 flex items-center justify-center mb-6 group-hover:bg-tertiary-container/20 transition-colors">
                <Puzzle className="w-7 h-7 text-tertiary-fixed-dim" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">软件兼容</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">完美适配 Premiere Pro, DaVinci Resolve, Final Cut Pro, Photoshop 等主流图像与视频编辑软件。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-margin-desktop relative z-10">
        <div className="max-w-4xl mx-auto glass-panel p-16 rounded-2xl glow-border text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-tertiary-container/5 pointer-events-none"></div>
          <h2 className="font-display text-4xl text-on-surface mb-6 relative z-10 font-bold">
            开始制作你的第一个专属 LUT
          </h2>
          <p className="text-on-surface-variant mb-10 max-w-xl mx-auto relative z-10 text-lg">
            无需复杂的调色节点，只需一张理想的参考图，AI 即可为你提取出完美的色彩配方。
          </p>
          <Link to="/workspace" className="inline-block relative z-10 px-10 py-5 btn-primary font-bold text-lg rounded-xl hover:shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all duration-300 transform hover:-translate-y-1">
            立即体验 AI 仿色
          </Link>
        </div>
      </section>
    </>
  );
}
