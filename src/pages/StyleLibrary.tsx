import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, SlidersHorizontal } from 'lucide-react';
import { MOCK_STYLES } from '../types';
import { cn } from '../lib/utils';

export default function StyleLibrary() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const categories = ['全部', '电影感', '人像摄影', '城市夜景', '复古胶片', '商业广告', '赛博风格'];

  const filteredStyles = activeCategory === '全部' 
    ? MOCK_STYLES 
    : MOCK_STYLES.filter(style => style.category === activeCategory);

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-gutter md:px-margin-desktop py-12 h-full overflow-y-auto">
      {/* Header Section */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl text-on-surface mb-4 glow-text tracking-tight font-bold">选择一个你喜欢的电影风格</h1>
        <p className="text-lg text-on-surface-variant opacity-80">从经典电影感、港风霓虹、复古胶片、日系清透等内置风格中选择，快速生成专属 LUT。</p>
      </div>

      {/* Filtering */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-6 py-2 rounded-full transition-all border",
              activeCategory === cat 
                ? "glass-panel glow-border bg-primary/10 text-primary font-medium border-primary/30"
                : "glass-panel hover:bg-surface-variant text-on-surface-variant hover:text-on-surface border-outline-variant/30"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
        {filteredStyles.map((style) => (
          <div key={style.id} className="glass-panel glow-border rounded-xl overflow-hidden flex flex-col group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,242,255,0.15)] hover:border-primary/40">
            <div className="h-48 overflow-hidden relative">
              <img 
                src={style.imageUrl} 
                alt={style.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest/90 via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-surface-variant/80 backdrop-blur rounded text-xs font-mono text-primary flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> {style.intensity}% 风格强度
              </div>
            </div>
            
            <div className="p-5 flex-grow flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-display text-xl font-bold text-on-surface">{style.name}</h3>
                <span className="text-xs text-on-surface-variant px-2 py-1 bg-surface-container rounded-full border border-outline-variant/50">{style.category}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {style.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-sm bg-surface-container-high border border-outline-variant/50 text-[11px] font-mono text-on-surface-variant uppercase">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-sm text-on-surface-variant mb-6 flex-grow">
                <span className="text-outline text-xs block mb-1">适合场景:</span>
                {style.suitableFor}
              </div>
              
              <Link 
                to={`/workspace?style=${style.id}`}
                className="w-full py-2.5 rounded-lg bg-surface-container-high hover:bg-primary/20 border border-primary/20 text-primary font-medium transition-colors flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-on-primary"
              >
                <Play className="w-4 h-4 fill-current" /> 立即使用
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
