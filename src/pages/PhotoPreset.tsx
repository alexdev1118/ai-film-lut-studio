import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Info, ZoomIn, Maximize, Sparkles, Download, ChevronsLeftRight, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { MOCK_STYLES } from '../types';

export default function PhotoPreset() {
  const navigate = useNavigate();
  const defaultStyle = MOCK_STYLES[0];

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [intensity, setIntensity] = useState(80);
  const [contrast, setContrast] = useState(10);
  const [saturation, setSaturation] = useState(5);
  const [temperature, setTemperature] = useState(-5);
  const [tint, setTint] = useState(2);
  const [grain, setGrain] = useState(15);
  const [vignette, setVignette] = useState(20);

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
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 1500);
  };

  return (
    <>
      {/* Left Column: Source */}
      <section className="w-[320px] flex flex-col glass-panel h-full relative z-10">
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-on-surface">原图与参考图</h2>
          <Info className="w-4 h-4 text-outline" />
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-6">
          {/* Upload Original */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-outline uppercase">上传原图</span>
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-primary/50 transition-colors cursor-pointer bg-surface-container/30">
              <Upload className="w-8 h-8 text-outline" />
              <div>
                <p className="font-medium text-sm">拖拽或点击上传</p>
                <p className="text-xs text-outline mt-1">支持 JPG, PNG, RAW</p>
              </div>
            </div>
          </div>

          {/* Upload Reference */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-outline uppercase">参考风格图</span>
              <button className="text-xs text-primary hover:underline">从风格库选择</button>
            </div>
            <div className="rounded-xl overflow-hidden border border-primary/50 relative group shadow-[0_0_15px_rgba(0,242,255,0.15)]">
              <img 
                alt="Reference style" 
                className="w-full h-40 object-cover" 
                src={defaultStyle.imageUrl}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="btn-glass px-4 py-2 rounded-lg text-sm font-medium text-primary">替换参考图</button>
              </div>
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
            <div className={cn("w-2 h-2 rounded-full", isGenerating ? "bg-secondary-container animate-pulse shadow-[0_0_8px_rgba(255,138,0,0.8)]" : "bg-primary shadow-[0_0_8px_rgba(0,242,255,0.8)]")}></div>
            <span className={cn("font-mono text-xs", isGenerating ? "text-secondary-container" : "text-primary")}>
              {isGenerating ? "AI 正在分析参考图色彩、影调与对比度..." : "AI 就绪"}
            </span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
          <div 
            ref={splitContainerRef}
            className="relative w-full aspect-[4/3] max-w-5xl mx-auto rounded-lg overflow-hidden border border-outline-variant/20 shadow-2xl bg-black"
          >
            {/* Before Image */}
            <img 
              alt="Original photo" 
              className="absolute inset-0 w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80"
            />
            
            {/* After Image (Clipped) */}
            <div 
              className="absolute inset-0 w-full h-full overflow-hidden" 
              style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
            >
              <img 
                alt="Graded photo" 
                className="absolute inset-0 w-full h-full object-cover max-w-none" 
                src="https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80"
                style={hasGenerated ? { filter: `sepia(0.2) saturate(${1 + saturation/100}) contrast(${1 + contrast/100}) hue-rotate(${tint}deg)` } : {}}
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
      </section>

      {/* Right Column: Adjustments */}
      <section className="w-[360px] flex flex-col glass-panel overflow-y-auto h-full relative z-10 pb-4">
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
                <label className="font-mono text-xs text-on-surface-variant">色温</label>
                <span className="font-mono text-xs text-outline">{temperature}</span>
              </div>
              <input type="range" min="-100" max="100" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">色调</label>
                <span className="font-mono text-xs text-outline">{tint}</span>
              </div>
              <input type="range" min="-100" max="100" value={tint} onChange={(e) => setTint(Number(e.target.value))} />
            </div>
            
            <div className="h-px bg-outline-variant/30 my-2"></div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">颗粒感</label>
                <span className="font-mono text-xs text-outline">{grain}</span>
              </div>
              <input type="range" min="0" max="100" value={grain} onChange={(e) => setGrain(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end">
                <label className="font-mono text-xs text-on-surface-variant">暗角</label>
                <span className="font-mono text-xs text-outline">{vignette}</span>
              </div>
              <input type="range" min="0" max="100" value={vignette} onChange={(e) => setVignette(Number(e.target.value))} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 rounded-lg btn-primary shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? "正在分析..." : (hasGenerated ? "重新生成预览" : "生成图片预览")}
            </button>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-surface-container border border-outline-variant text-sm font-medium hover:bg-surface-variant transition-colors flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> 保存参数
              </button>
              <button className="flex-1 py-2 rounded-lg btn-glass text-primary text-sm font-medium flex items-center justify-center gap-1">
                <Download className="w-4 h-4" /> 导出图片
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
