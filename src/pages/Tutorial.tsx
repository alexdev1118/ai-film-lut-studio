import { BookOpen, Video, HelpCircle, FileText, MonitorPlay, AlertTriangle } from 'lucide-react';

export default function Tutorial() {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 h-full overflow-y-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl font-bold text-on-surface mb-4">使用教程与常见问题</h1>
        <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
          了解如何使用 AI 仿色工具，以及如何在主流剪辑软件中应用生成的 LUT 文件。
        </p>
      </div>

      <div className="space-y-12">
        {/* Section 1 */}
        <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">什么是 LUT？</h2>
          </div>
          <p className="text-on-surface-variant leading-relaxed mb-4">
            LUT (Look-Up Table) 中文名“颜色查找表”，本质上是一个数学公式，用于将一组颜色映射为另一组颜色。在影视后期中，它常被用来快速实现特定的色彩风格（如电影感、复古风），或者用于色彩空间转换（如 Log 转 Rec.709）。
          </p>
          <div className="bg-surface-container/50 p-4 rounded-lg border border-outline-variant/20 flex items-start gap-3 mt-6">
            <AlertTriangle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-on-surface-variant leading-relaxed">
              <strong>重要提示：</strong> 我们生成的 .cube LUT 是<strong>风格化 LUT (Creative LUT)</strong>。使用前，请确保您的素材已经还原到了 Rec.709 标准色彩空间。如果您拍摄的是 Log 素材，请先进行基础的色彩还原。
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">如何使用参考图仿色？</h2>
          </div>
          <ol className="list-decimal list-inside space-y-4 text-on-surface-variant">
            <li>在工作台左侧上传您的<strong>目标素材</strong>（你想调色的图）。</li>
            <li>在右侧面板上传或选择一张<strong>参考图</strong>（你想要的色彩风格）。</li>
            <li>调整“输入色彩空间”，确保与您的素材匹配。</li>
            <li>点击“生成仿色预览”，AI 会自动提取参考图的色调并应用到您的素材上。</li>
            <li>使用右侧参数面板微调对比度、饱和度和匹配度。</li>
            <li>满意后，点击底部“导出 LUT”下载 .cube 文件。</li>
          </ol>
        </section>

        {/* Section 3 */}
        <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-6">
            <MonitorPlay className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">软件导入指南</h2>
          </div>
          
          <div className="space-y-6">
            <div className="border-l-2 border-primary pl-4 py-1">
              <h3 className="text-lg font-bold text-on-surface mb-2">达芬奇 (DaVinci Resolve)</h3>
              <p className="text-sm text-on-surface-variant">将 .cube 文件放入 LUT 文件夹（项目设置 -{'>'} Color Management -{'>'} Open LUT Folder）。在色彩页面，添加一个串行节点，右键选择您的 LUT 应用即可。建议应用在节点树的末端。</p>
            </div>
            
            <div className="border-l-2 border-[#9999ff] pl-4 py-1">
              <h3 className="text-lg font-bold text-on-surface mb-2">Premiere Pro</h3>
              <p className="text-sm text-on-surface-variant">打开 Lumetri Color 面板，进入 "Creative"（创意）选项卡，在 "Look" 下拉菜单中选择 "Browse..." 并导入您的 .cube 文件。您可以使用下方的 Intensity 滑块控制 LUT 强度。</p>
            </div>

            <div className="border-l-2 border-outline pl-4 py-1">
              <h3 className="text-lg font-bold text-on-surface mb-2">剪映 (CapCut)</h3>
              <p className="text-sm text-on-surface-variant">在调节面板点击“自定义 LUT”，导入下载的 .cube 文件即可。部分高精度 65x65 的 LUT 在手机版剪映可能无法加载，建议生成时选择 33x33 精度。</p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-6">
            <Video className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">为什么网页预览和软件效果有差异？</h2>
          </div>
          <p className="text-on-surface-variant leading-relaxed">
            网页预览是在特定压缩比的静态图片上进行渲染的。当您将 LUT 应用到剪辑软件中的视频素材时，可能会因为以下原因出现轻微差异：
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4 text-sm text-on-surface-variant">
            <li>视频素材的初始曝光和白平衡与网页上传的测试图不同。</li>
            <li>软件内部的色彩管理设置（如 DaVinci YRGB Color Managed）。</li>
            <li>素材本身的色深（8-bit vs 10-bit/12-bit）。</li>
          </ul>
          <p className="text-on-surface-variant text-sm mt-4">
            <strong>建议：</strong> 在应用 LUT 之前，始终先在它前面的节点/图层对视频进行基本的曝光和白平衡校正。
          </p>
        </section>
      </div>
    </div>
  );
}
