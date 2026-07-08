export interface StylePreset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  suitableFor: string;
  intensity: number;
  imageUrl: string;
}

export const MOCK_STYLES: StylePreset[] = [
  // 电影感
  {
    id: 'teal-orange',
    name: '青橙电影感',
    category: '电影感',
    tags: ['Blockbuster', 'High Contrast'],
    suitableFor: '街头、动作、电影叙事',
    intensity: 85,
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'cool-tones',
    name: '低饱和冷调',
    category: '电影感',
    tags: ['Minimalist', 'Cool Tones'],
    suitableFor: '悬疑、科幻、极简',
    intensity: 80,
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'black-gold',
    name: '黑金夜景',
    category: '电影感',
    tags: ['Luxury', 'Monotone+Gold'],
    suitableFor: '建筑、城市探索',
    intensity: 100,
    imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80'
  },
  // 人像摄影
  {
    id: 'korean-creamy',
    name: '韩系奶油',
    category: '人像摄影',
    tags: ['Soft', 'Warm Pastel'],
    suitableFor: '室内人像、咖啡馆、美食',
    intensity: 70,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'clean-japanese',
    name: '日系清透',
    category: '人像摄影',
    tags: ['Airy', 'Low Contrast'],
    suitableFor: '日间人像、自然、日常',
    intensity: 60,
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'warm-film-portrait',
    name: '暖调胶片',
    category: '人像摄影',
    tags: ['Warm', 'Film Grain'],
    suitableFor: '逆光人像、情绪写真',
    intensity: 75,
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80'
  },
  // 城市夜景
  {
    id: 'hk-neon',
    name: '港风霓虹',
    category: '城市夜景',
    tags: ['Moody', 'Neon Colors'],
    suitableFor: '城市夜景、人像、雨天',
    intensity: 90,
    imageUrl: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'rainy-street',
    name: '雨夜街头',
    category: '城市夜景',
    tags: ['Dark', 'Reflections'],
    suitableFor: '街头、纪实、夜景',
    intensity: 85,
    imageUrl: 'https://images.unsplash.com/photo-1519648023493-d8ce25ce0639?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'cyber-city',
    name: '赛博都市',
    category: '城市夜景',
    tags: ['High Saturation', 'Cyan/Magenta'],
    suitableFor: '夜景、未来感',
    intensity: 95,
    imageUrl: 'https://images.unsplash.com/photo-1502899576159-f224dc2349fa?auto=format&fit=crop&w=600&q=80'
  },
  // 复古胶片
  {
    id: 'vintage-film',
    name: '复古胶片',
    category: '复古胶片',
    tags: ['Nostalgic', 'Film Grain'],
    suitableFor: '生活方式、旅行、回忆',
    intensity: 75,
    imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '90s-hk-film',
    name: '90年代港片',
    category: '复古胶片',
    tags: ['Warm Green', 'Soft Focus'],
    suitableFor: '复古人像、扫街',
    intensity: 80,
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'warm-brown-film',
    name: '暖棕胶片',
    category: '复古胶片',
    tags: ['Brown Tones', 'Matte'],
    suitableFor: '秋季、咖啡馆、静物',
    intensity: 65,
    imageUrl: 'https://images.unsplash.com/photo-1495474472207-464a8d410db4?auto=format&fit=crop&w=600&q=80'
  },
  // 商业广告
  {
    id: 'premium-gray',
    name: '高级灰广告',
    category: '商业广告',
    tags: ['Neutral', 'Clean'],
    suitableFor: '产品、汽车、静物',
    intensity: 60,
    imageUrl: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'high-contrast-commercial',
    name: '高反差质感',
    category: '商业广告',
    tags: ['Punchy', 'Sharp'],
    suitableFor: '运动、时尚、服饰',
    intensity: 85,
    imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'clean-transparent',
    name: '干净通透',
    category: '商业广告',
    tags: ['Bright', 'True Color'],
    suitableFor: '美妆、护肤、家居',
    intensity: 50,
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80'
  },
  // 赛博风格
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    category: '赛博风格',
    tags: ['Sci-Fi', 'Neon Purple/Blue'],
    suitableFor: '夜景人像、未来感',
    intensity: 95,
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'blue-purple-neon',
    name: '蓝紫霓虹',
    category: '赛博风格',
    tags: ['Blue/Purple', 'Glowing'],
    suitableFor: '舞台、夜晚街头',
    intensity: 90,
    imageUrl: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'future-city',
    name: '未来都市',
    category: '赛博风格',
    tags: ['Desaturated Warm', 'Cool Highlights'],
    suitableFor: '科幻建筑、无人机夜景',
    intensity: 100,
    imageUrl: 'https://images.unsplash.com/photo-1502899576159-f224dc2349fa?auto=format&fit=crop&w=600&q=80'
  }
];
