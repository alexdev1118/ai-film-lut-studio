import { Upload, BarChart3, Droplet, Sun, Hash, Info } from 'lucide-react';

export default function ColorAnalysis() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col gap-6 py-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="glass-panel p-6 flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface mb-1">色彩分析</h1>
          <p className="text-on-surface-variant text-sm">上传图片，AI 将深度解析其色彩构成与风格倾向。</p>
        </div>
        <button className="btn-primary px-6 py-2 rounded-lg text-sm flex items-center gap-2">
          <Upload className="w-4 h-4" /> 上传新图片
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left: Image & Palette */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-panel p-4 flex flex-col gap-4">
            <h2 className="text-sm font-medium text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
              <Info className="w-4 h-4" /> 分析样本
            </h2>
            <div className="rounded-lg overflow-hidden border border-outline-variant/30 aspect-square relative">
              <img 
                src="https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80" 
                alt="Analyzed sample" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="pt-2 border-t border-outline-variant/20">
              <h3 className="text-xs text-on-surface-variant mb-3">主色板提取</h3>
              <div className="flex gap-2 h-12 rounded-lg overflow-hidden border border-outline-variant/30">
                <div className="flex-1 bg-[#1a0b2e]" title="深空紫"></div>
                <div className="flex-1 bg-[#5b156b]" title="霓虹紫"></div>
                <div className="flex-1 bg-[#00f2ff]" title="赛博青"></div>
                <div className="flex-1 bg-[#0c1220]" title="暗夜蓝"></div>
                <div className="flex-1 bg-[#ff0055]" title="高光品红"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Analysis Data */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium text-sm">明暗分布 (Luma)</span>
              </div>
              <div className="text-2xl font-bold font-mono">低对比 / 暗调</div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                图像大部分像素集中在暗部区域，高光极少，形成压抑且深邃的视觉感受。
              </p>
            </div>
            
            <div className="glass-panel p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-secondary">
                <Sun className="w-5 h-5" />
                <span className="font-medium text-sm">冷暖倾向 (Temp)</span>
              </div>
              <div className="text-2xl font-bold font-mono">极度偏冷 / 冷暖撞色</div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                整体色温偏冷，但在局部高光处使用了高纯度的暖色（品红）进行强烈的撞色对比。
              </p>
            </div>

            <div className="glass-panel p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-tertiary">
                <Droplet className="w-5 h-5" />
                <span className="font-medium text-sm">饱和度等级 (Saturation)</span>
              </div>
              <div className="text-2xl font-bold font-mono">高饱和点缀</div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                基底饱和度极低，但霓虹光源区域饱和度极高，溢出感明显。
              </p>
            </div>

            <div className="glass-panel p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary-fixed-dim">
                <Hash className="w-5 h-5" />
                <span className="font-medium text-sm">风格关键词</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-1 rounded bg-surface-container-high border border-outline-variant/50 text-xs font-mono">赛博朋克</span>
                <span className="px-2 py-1 rounded bg-surface-container-high border border-outline-variant/50 text-xs font-mono">夜景霓虹</span>
                <span className="px-2 py-1 rounded bg-surface-container-high border border-outline-variant/50 text-xs font-mono">高对比撞色</span>
                <span className="px-2 py-1 rounded bg-surface-container-high border border-outline-variant/50 text-xs font-mono">电影感</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 flex-1 flex flex-col">
            <h2 className="font-display text-lg font-bold text-on-surface mb-4">综合诊断报告</h2>
            <div className="bg-surface-container/50 rounded-lg p-5 border border-outline-variant/20 flex-1 font-mono text-sm text-on-surface-variant leading-relaxed">
              <p className="mb-3">{"[ 分析启动 ] -> 提取特征向量成功"}</p>
              <p className="mb-3 text-primary">{"检测到典型的 Cyberpunk 色彩架构。画面基调建立在黑紫与深蓝色之上，通过青色和品红色的发光体打破暗部沉闷。"}</p>
              <p className="mb-3">{"建议在生成 LUT 时，将【对比度】拉高，增加【阴影偏蓝/紫】的倾向，并在【肤色保护】选项上保持开启，以避免人物脸部被环境光完全污染。"}</p>
              <p className="text-secondary">{"结论：此风格适合赛博朋克、未来科幻题材的夜景人像或城市空镜。"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
