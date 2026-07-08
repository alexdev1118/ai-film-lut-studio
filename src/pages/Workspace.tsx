import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, Info, ZoomIn, Maximize, Sparkles, HelpCircle, Download, ChevronsLeftRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { MOCK_STYLES } from '../types';

export default function Workspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const styleId = searchParams.get('style');
  
  const defaultStyle = MOCK_STYLES.find(s => s.id === styleId) || MOCK_STYLES[0];

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [intensity, setIntensity] = useState(defaultStyle.intensity);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [shadowMatch, setShadowMatch] = useState(60);
  const [midtoneMatch, setMidtoneMatch] = useState(70);
  const [highlightMatch, setHighlightMatch] = useState(50);
  
  const [skinProtection, setSkinProtection] = useState(true);
  const [preserveLuma, setPreserveLuma] = useState(true);
  const [preventOversat, setPreventOversat] = useState(false);
  
  const [lutName, setLutName] = useState('Cyber_Neon_Warm_V1');
  const [precision, setPrecision] = useState<'17'|'33'|'65'>('33');

  // Handle Split Dragging
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !splitContainerRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rect = splitContainerRef.current.getBoundingClientRect();
      let pos = ((clientX - rect.left) / rect.width) * 100;
      pos = Math.min(Math.max(pos, 0), 100);
      setSplitPosition(pos);
    };

    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setHasGenerated(false);
    // Simulate AI Generation
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 2000);
  };

  const handleExport = () => {
    navigate('/export');
  };

  return (
    <>
      {/* Left Column: Source */}
      <section className="w-sidebar-width flex flex-col glass-panel h-full relative z-10">
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-on-surface">目标素材</h2>
          <Info className="w-4 h-4 text-outline" />
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-primary/50 transition-colors cursor-pointer bg-surface-container/30">
            <Upload className="w-10 h-10 text-outline" />
            <div>
              <p className="font-medium text-sm">拖拽或点击上传目标静帧</p>
              <p className="text-xs text-outline mt-1">支持 JPG、PNG、TIFF</p>
            </div>
          </div>

          {/* Source Thumbnail */}
          <div className="rounded-xl overflow-hidden border border-outline-variant/30 relative group">
            <img 
              alt="Cinematic urban street scene" 
              className="w-full h-40 object-cover" 
              src="https://images.unsplash.com/photo-1555616654-e053db3bb084?auto=format&fit=crop&w=800&q=80"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button className="btn-glass px-4 py-2 rounded-lg text-sm font-medium text-primary">替换</button>
            </div>
          </div>

          {/* Input Color Space */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-on-surface-variant uppercase">输入色彩空间</label>
            <select className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none">
              <option>Rec.709</option>
              <option>S-Log3</option>
              <option>D-Log M</option>
              <option>C-Log3</option>
              <option>V-Log</option>
              <option>F-Log</option>
              <option>Unknown</option>
            </select>
            <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              V1 建议使用 Rec.709 或已还原素材
            </p>
          </div>

          {/* Metadata */}
          <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-outline">分辨率</span>
              <span className="font-mono text-on-surface">3840x2160</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-outline">格式</span>
              <span className="font-mono text-on-surface">16-bit TIFF</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-outline">色彩配置文件</span>
              <span className="font-mono text-on-surface">sRGB IEC61966-2.1</span>
            </div>
          </div>
        </div>
      </section>

      {/* Center Column: Preview */}
      <section className="flex-1 flex flex-col glass-panel relative z-0 h-full overflow-hidden">
        {/* Top Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-surface/40 backdrop-blur-xl p-1.5 rounded-full border border-outline-variant/40">
          <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-surface-variant text-on-surface hover:bg-surface-bright transition-colors">原图</button>
          <button className="px-4 py-1.5 rounded-full text-sm font-medium btn-glass text-primary">效果图</button>
        </div>
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button className="w-10 h-10 rounded-full bg-surface/40 backdrop-blur-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:text-primary transition-colors"><ZoomIn className="w-5 h-5" /></button>
          <button className="w-10 h-10 rounded-full bg-surface/40 backdrop-blur-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:text-primary transition-colors"><Maximize className="w-5 h-5" /></button>
        </div>
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-surface/40 backdrop-blur-xl border border-outline-variant/40 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isGenerating ? "bg-secondary-container animate-pulse shadow-[0_0_8px_rgba(255,138,0,0.8)]" : "bg-primary shadow-[0_0_8px_rgba(164,230,255,0.8)]")}></div>
            <span className={cn("font-mono text-xs", isGenerating ? "text-secondary-container" : "text-primary")}>
              {isGenerating ? "AI 正在分析参考图色彩、影调与对比度..." : "AI 就绪"}
            </span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
          <div 
            ref={splitContainerRef}
            className="relative w-full aspect-video max-w-6xl mx-auto rounded-lg overflow-hidden border border-outline-variant/20 shadow-2xl bg-black"
          >
            {/* Before Image */}
            <img 
              alt="Cinematic urban street scene original" 
              className="absolute inset-0 w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1555616654-e053db3bb084?auto=format&fit=crop&w=1200&q=80"
            />
            
            {/* After Image (Clipped) */}
            <div 
              className="absolute inset-0 w-full h-full overflow-hidden" 
              style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
            >
              <img 
                alt="Cinematic urban street scene graded" 
                className="absolute inset-0 w-full h-full object-cover max-w-none" 
                src="https://images.unsplash.com/photo-1555616654-e053db3bb084?auto=format&fit=crop&w=1200&q=80"
                style={hasGenerated ? { filter: `sepia(0.3) saturate(${1 + saturation/100}) contrast(${1 + contrast/100}) hue-rotate(-10deg)` } : {}}
              />
            </div>

            {/* Split Handle */}
            <div 
              className="split-handle" 
              style={{ left: `${splitPosition}%` }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <ChevronsLeftRight className="w-4 h-4 text-white z-11 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Labels */}
            <div className="absolute bottom-4 left-4 font-mono text-xs text-white/70 bg-black/50 px-2 py-1 rounded backdrop-blur-md">原图</div>
            <div className="absolute bottom-4 right-4 font-mono text-xs text-primary bg-black/50 px-2 py-1 rounded backdrop-blur-md">效果图</div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <span className="font-mono text-sm text-outline tracking-wider uppercase">选用风格: {defaultStyle.name}</span>
        </div>
      </section>

      {/* Right Column: References & Adjustments */}
      <section className="w-[360px] flex flex-col glass-panel overflow-y-auto h-full relative z-10 pb-16">
        {/* References Section */}
        <div className="p-4 border-b border-outline-variant/30">
          <h2 className="font-display text-xl font-bold text-on-surface mb-4">参考图</h2>
          <div className="rounded-xl overflow-hidden border border-primary/50 relative group mb-3 shadow-[0_0_15px_rgba(0,242,255,0.15)]">
            <img 
              alt="Reference style image" 
              className="w-full h-32 object-cover" 
              src={defaultStyle.imageUrl} 
            />
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded px-2 py-0.5 border border-white/10">
              <span className="text-[10px] font-mono text-primary uppercase">已激活目标风格</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-surface-container border border-outline-variant text-sm font-medium hover:bg-surface-variant transition-colors">上传</button>
            <button className="flex-1 py-2 rounded-lg btn-glass text-primary text-sm font-medium">风格库</button>
          </div>
        </div>

        {/* Parameters Section */}
        <div className="p-4 flex-1 flex flex-col gap-6">
          <h2 className="font-display text-xl font-bold text-on-surface">参数调节</h2>
          
          {/* Sliders */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">风格强度</label>
                <span className="font-mono text-xs text-primary">{intensity}</span>
              </div>
              <input type="range" min="0" max="100" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">对比度</label>
                <span className="font-mono text-xs text-outline">{contrast}</span>
              </div>
              <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">饱和度</label>
                <span className="font-mono text-xs text-outline">{saturation}</span>
              </div>
              <input type="range" min="-100" max="100" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />
            </div>
            
            <div className="h-px bg-outline-variant/30 my-2"></div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">阴影匹配</label>
                <span className="font-mono text-xs text-primary">{shadowMatch}</span>
              </div>
              <input type="range" min="0" max="100" value={shadowMatch} onChange={(e) => setShadowMatch(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">中间调匹配</label>
                <span className="font-mono text-xs text-primary">{midtoneMatch}</span>
              </div>
              <input type="range" min="0" max="100" value={midtoneMatch} onChange={(e) => setMidtoneMatch(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">高光匹配</label>
                <span className="font-mono text-xs text-primary">{highlightMatch}</span>
              </div>
              <input type="range" min="0" max="100" value={highlightMatch} onChange={(e) => setHighlightMatch(Number(e.target.value))} />
            </div>
          </div>

          {/* Advanced Switches */}
          <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-on-surface">肤色保护</span>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={skinProtection} onChange={() => setSkinProtection(!skinProtection)} />
                <div className="w-9 h-5 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-outline after:border-outline after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container peer-checked:after:bg-on-primary-container"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-on-surface">保留亮度结构</span>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={preserveLuma} onChange={() => setPreserveLuma(!preserveLuma)} />
                <div className="w-9 h-5 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-outline after:border-outline after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container peer-checked:after:bg-on-primary-container"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-on-surface">防止过度饱和</span>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={preventOversat} onChange={() => setPreventOversat(!preventOversat)} />
                <div className="w-9 h-5 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-outline after:border-outline after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container peer-checked:after:bg-on-primary-container"></div>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto flex flex-col gap-3 pt-4 mb-8">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 rounded-lg btn-primary shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? "正在分析色彩..." : "生成仿色预览"}
            </button>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-surface-container border border-outline-variant text-sm font-medium hover:bg-surface-variant transition-colors">重置参数</button>
              <button onClick={handleExport} className="flex-1 py-2 rounded-lg btn-glass text-primary text-sm font-medium">导出 .cube</button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Export Bar (Fixed to bottom) */}
      <footer className="fixed bottom-0 left-[64px] right-0 z-50 h-16 bg-surface/40 backdrop-blur-xl border-t border-outline-variant/30 flex items-center justify-between px-gutter">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-outline">LUT 名称</span>
          <input 
            type="text" 
            value={lutName} 
            onChange={(e) => setLutName(e.target.value)}
            className="bg-surface-container border border-outline-variant/50 rounded px-3 py-1.5 text-sm font-mono text-on-surface focus:border-primary outline-none w-64" 
          />
          <div className="h-6 w-px bg-outline-variant/50 mx-2"></div>
          <span className="font-mono text-xs text-outline uppercase">LUT 精度</span>
          <div className="flex bg-surface-container rounded border border-outline-variant/50 overflow-hidden">
            <button onClick={() => setPrecision('17')} className={cn("px-3 py-1.5 text-xs font-mono transition-colors", precision === '17' ? "bg-primary/20 text-primary" : "text-outline hover:bg-surface-variant")}>17</button>
            <button onClick={() => setPrecision('33')} className={cn("px-3 py-1.5 text-xs font-mono border-x border-outline-variant/50 transition-colors", precision === '33' ? "bg-primary/20 text-primary" : "text-outline hover:bg-surface-variant")}>33</button>
            <button onClick={() => setPrecision('65')} className={cn("px-3 py-1.5 text-xs font-mono transition-colors", precision === '65' ? "bg-primary/20 text-primary" : "text-outline hover:bg-surface-variant")}>65</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-on-surface-variant mr-4 hidden xl:block uppercase">© 2024 LUMINANCE STUDIO. HIGH-FIDELITY EXPORT ENGINE ACTIVE.</span>
          <button className="px-4 py-2 rounded text-sm font-medium border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> 使用说明
          </button>
          <button onClick={handleExport} className="px-6 py-2 rounded btn-glass text-primary text-sm font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> 导出 LUT
          </button>
        </div>
      </footer>
    </>
  );
}
