'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Aperture, ArrowDownToLine, Camera, Check, CircleHelp, Clock3, FileJson, FolderOpen, Heart, ImageIcon, ImageOff, Info, Languages, LayoutGrid, ListFilter, LoaderCircle, LogIn, LogOut, Mail, MapPin, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, Star, Trash2, Type, Upload, UserRound, WandSparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

type Photo = {
  id: string; src: string; title: string; filename: string; score: number; composition: number;
  color: number; clarity: number; tags: string[]; entities: string[]; mood: string; location: string;
  date: string; camera: string; colors: string[]; exposure?: number; faceQuality?: number; issues?: string[];
  favorite?: boolean; pending?: boolean; imported?: boolean;
};

const qualityDimensions = [
  { id: 'focus', label: '焦点准确', group: '清晰度', defaultOn: true },
  { id: 'motion', label: '运动模糊', group: '清晰度', defaultOn: true },
  { id: 'sharpness', label: '整体锐度', group: '清晰度', defaultOn: true },
  { id: 'noise', label: '噪点控制', group: '清晰度', defaultOn: false },
  { id: 'exposure', label: '曝光准确', group: '光线色彩', defaultOn: true },
  { id: 'highlights', label: '高光保留', group: '光线色彩', defaultOn: true },
  { id: 'shadows', label: '暗部细节', group: '光线色彩', defaultOn: false },
  { id: 'whiteBalance', label: '白平衡', group: '光线色彩', defaultOn: false },
  { id: 'color', label: '色彩自然度', group: '光线色彩', defaultOn: false },
  { id: 'face', label: '人脸可用性', group: '人像专项', defaultOn: false },
  { id: 'eyes', label: '眼睛状态', group: '人像专项', defaultOn: false },
  { id: 'skin', label: '肤色与质感', group: '人像专项', defaultOn: false },
  { id: 'composition', label: '构图平衡', group: '场景结构', defaultOn: true },
  { id: 'horizon', label: '地平线水平', group: '场景结构', defaultOn: false },
  { id: 'subject', label: '主体完整性', group: '场景结构', defaultOn: false },
] as const;
type DimensionId = typeof qualityDimensions[number]['id'];
type UiLanguage = 'zh-CN' | 'en' | 'zh-TW';
type DemoUser = { name: string; email: string };
const defaultDimensions = qualityDimensions.filter((item) => item.defaultOn).map((item) => item.id);
const dimensionPresets: Record<string, DimensionId[]> = {
  '快速技术': ['focus', 'motion', 'sharpness', 'exposure', 'highlights', 'composition'],
  '人像交付': ['focus', 'motion', 'sharpness', 'exposure', 'highlights', 'face', 'eyes', 'skin', 'subject'],
  '风景精选': ['focus', 'motion', 'sharpness', 'noise', 'exposure', 'highlights', 'shadows', 'whiteBalance', 'color', 'composition', 'horizon', 'subject'],
};

const uiCopy = {
  'zh-CN': { nav: { all: '全部照片', picks: '达标照片', rejects: '废片筛选', pending: '待处理', favorites: '我的收藏' }, library: '素材库', detector: '通用照片质量检测流', detectorDesc: '人像与风景通用 · 按所选维度实时重算质量分', dimensions: '项检测', analyze: 'AI 质量检测', analyzing: '正在分析', headline: '先过滤模糊、失焦与曝光问题，再挑选值得交付的照片。', search: '搜索「清晰的山谷晨雾」…', upload: '导入照片', export: '导出', guest: '游客模式', account: '个人与通用设置' },
  en: { nav: { all: 'All photos', picks: 'Qualified', rejects: 'Rejected', pending: 'Pending', favorites: 'Favorites' }, library: 'LIBRARY', detector: 'Universal photo quality flow', detectorDesc: 'Portraits + landscapes · Scores update with selected dimensions', dimensions: 'checks', analyze: 'AI quality check', analyzing: 'Analyzing', headline: 'Filter blur, missed focus, and exposure issues before selecting deliverables.', search: 'Search “sharp mountain morning mist”…', upload: 'Import', export: 'Export', guest: 'Guest mode', account: 'Account & preferences' },
  'zh-TW': { nav: { all: '全部照片', picks: '達標照片', rejects: '廢片篩選', pending: '待處理', favorites: '我的收藏' }, library: '素材庫', detector: '通用照片品質檢測流', detectorDesc: '人像與風景通用 · 按所選維度即時重算品質分', dimensions: '項檢測', analyze: 'AI 品質檢測', analyzing: '正在分析', headline: '先過濾模糊、失焦與曝光問題，再挑選值得交付的照片。', search: '搜尋「清晰的山谷晨霧」…', upload: '匯入照片', export: '匯出', guest: '訪客模式', account: '個人與通用設定' },
} as const;

function dimensionScore(photo: Photo, id: DimensionId) {
  const clarity = photo.clarity || 0; const exposure = photo.exposure ?? photo.color; const face = photo.faceQuality ?? photo.composition;
  const issue = (term: string) => photo.issues?.some((item) => item.includes(term));
  const scores: Record<DimensionId, number> = {
    focus: issue('失焦') || issue('虚焦') || issue('焦点') ? Math.min(clarity, 3.4) : clarity,
    motion: issue('抖动') || issue('拖影') || issue('模糊') ? Math.min(clarity, 3.6) : Math.min(10, clarity + .2),
    sharpness: clarity,
    noise: Math.max(0, Math.min(10, (clarity + exposure) / 2)),
    exposure,
    highlights: issue('过曝') || issue('高光') ? Math.min(exposure, 2.8) : Math.min(10, exposure + .2),
    shadows: issue('欠曝') || issue('暗部') ? Math.min(exposure, 3.2) : Math.max(0, exposure - .1),
    whiteBalance: photo.color,
    color: photo.color,
    face,
    eyes: issue('闭眼') ? 2.2 : face,
    skin: Math.max(0, Math.min(10, (photo.color + exposure + face) / 3)),
    composition: photo.composition,
    horizon: issue('地平线') || issue('倾斜') ? 3.2 : Math.min(10, photo.composition + .2),
    subject: issue('裁切') || issue('遮挡') ? Math.min(face, 4) : Math.max(photo.composition, face),
  };
  return scores[id];
}

function calculatedScore(photo: Photo, dimensions: DimensionId[]) {
  if (photo.pending || !dimensions.length) return photo.score;
  return dimensions.reduce((sum, id) => sum + dimensionScore(photo, id), 0) / dimensions.length;
}

const seedPhotos: Photo[] = [
  { id: 'p1', src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=88', title: '海岸人像', filename: 'DSC_4821.ARW', score: 9.4, composition: 9.0, color: 9.2, clarity: 9.6, exposure: 9.3, faceQuality: 9.7, issues: [], tags: ['旅拍人像', '自然光', '海岸'], entities: ['人像', '海面', '天空'], mood: '清新', location: '葡萄牙 · 里斯本', date: '2026.07.18', camera: 'Sony A7C II · 85mm · f/2.0', colors: ['#d8c9b7', '#83a2aa', '#293b39'], favorite: true },
  { id: 'p2', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=88', title: '古城街拍', filename: 'DSC_5018.ARW', score: 9.0, composition: 8.8, color: 9.0, clarity: 9.2, exposure: 8.9, faceQuality: 9.3, issues: [], tags: ['旅拍人像', '街头', '自然光'], entities: ['人像', '建筑', '石板路'], mood: '松弛', location: '意大利 · 罗马', date: '2026.06.09', camera: 'Sony A7C II · 50mm · f/2.2', colors: ['#cab19b', '#8d735e', '#43372e'] },
  { id: 'p3', src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=88', title: '窗边特写', filename: 'DSC_5382.ARW', score: 8.8, composition: 8.5, color: 8.7, clarity: 9.1, exposure: 8.8, faceQuality: 9.0, issues: [], tags: ['人像特写', '柔光', '浅景深'], entities: ['人脸', '窗光', '背景虚化'], mood: '温柔', location: '法国 · 巴黎', date: '2026.05.27', camera: 'Sony A7C II · 85mm · f/1.8', colors: ['#e2c2ac', '#aa7e70', '#52413d'], favorite: true },
  { id: 'p4', src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=88', title: '山野旅人', filename: 'DSC_4420.ARW', score: 8.7, composition: 9.0, color: 8.6, clarity: 8.8, exposure: 8.6, faceQuality: 8.7, issues: [], tags: ['环境人像', '山野', '纪实'], entities: ['旅人', '背包', '山谷'], mood: '自由', location: '瑞士 · 卢塞恩', date: '2026.04.14', camera: 'Sony A7C II · 70mm · f/4', colors: ['#d8d3c5', '#6f867f', '#394741'], favorite: true },
  { id: 'p5', src: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=88', title: '夜景人像', filename: 'DSC_3954.ARW', score: 8.5, composition: 8.7, color: 8.9, clarity: 8.4, exposure: 8.2, faceQuality: 8.6, issues: [], tags: ['夜景人像', '霓虹', '城市'], entities: ['人像', '灯光', '街道'], mood: '时尚', location: '日本 · 东京', date: '2026.03.03', camera: 'Sony A7C II · 50mm · f/1.8', colors: ['#ef8d8b', '#4ba3ae', '#172a37'] },
  { id: 'p6', src: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=88', title: '黄昏侧逆光', filename: 'DSC_3640.ARW', score: 8.6, composition: 8.6, color: 8.8, clarity: 8.7, exposure: 8.4, faceQuality: 8.7, issues: [], tags: ['逆光人像', '黄昏', '暖色'], entities: ['人像', '阳光', '头发轮廓'], mood: '温暖', location: '西班牙 · 巴塞罗那', date: '2026.02.21', camera: 'Sony A7C II · 85mm · f/2', colors: ['#d6a06f', '#9d6144', '#4c322d'] },
  { id: 'p7', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=72', title: '连拍 07 · 焦点偏移', filename: 'DSC_3147.ARW', score: 4.8, composition: 7.6, color: 6.8, clarity: 3.2, exposure: 6.1, faceQuality: 4.5, issues: ['人脸虚焦', '轻微拖影'], tags: ['连拍', '待淘汰'], entities: ['人脸', '背景'], mood: '未判定', location: '意大利 · 罗马', date: '2026.06.09', camera: 'Sony A7C II · 50mm · 1/40s', colors: ['#907f73', '#554b46', '#252525'] },
  { id: 'p8', src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=72', title: '连拍 12 · 严重过曝', filename: 'DSC_2879.ARW', score: 3.9, composition: 7.3, color: 4.0, clarity: 7.1, exposure: 2.2, faceQuality: 5.0, issues: ['面部过曝', '高光溢出'], tags: ['连拍', '待淘汰'], entities: ['人脸', '窗光'], mood: '未判定', location: '法国 · 巴黎', date: '2026.05.27', camera: 'Sony A7C II · 85mm · +2.3EV', colors: ['#f4eee9', '#d9c3b7', '#a58f85'] },
  { id: 'p9', src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=88', title: '山谷晨雾', filename: 'DSC_2744.ARW', score: 8.9, composition: 9.3, color: 8.8, clarity: 9.1, exposure: 8.7, faceQuality: 8.5, issues: [], tags: ['风景摄影', '山谷', '晨雾'], entities: ['山脉', '森林', '云雾'], mood: '宁静', location: '新西兰 · 皇后镇', date: '2026.01.18', camera: 'Sony A7C II · 35mm · f/8', colors: ['#b9c2b2', '#65766b', '#27342e'] },
  { id: 'p10', src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=72', title: '山景 04 · 相机抖动', filename: 'DSC_2748.ARW', score: 4.1, composition: 8.2, color: 7.4, clarity: 2.9, exposure: 7.2, faceQuality: 7.0, issues: ['整体失焦', '相机抖动'], tags: ['风景摄影', '待淘汰'], entities: ['山脉', '天空', '森林'], mood: '未判定', location: '新西兰 · 皇后镇', date: '2026.01.18', camera: 'Sony A7C II · 70mm · 1/20s', colors: ['#a9b1ae', '#65716c', '#303935'] },
];

const navItems = [
  { key: 'all', label: '全部照片', icon: LayoutGrid }, { key: 'picks', label: '达标照片', icon: Sparkles },
  { key: 'rejects', label: '废片筛选', icon: ImageOff }, { key: 'pending', label: '待处理', icon: Clock3 }, { key: 'favorites', label: '我的收藏', icon: Heart },
] as const;
const quickSearches = ['清晰的人像特写', '风景整体失焦', '黄昏逆光', '过曝废片'];

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
}

export function PhotoWorkspace() {
  const [photos, setPhotos] = useState(seedPhotos);
  const [activeNav, setActiveNav] = useState<'all' | 'picks' | 'rejects' | 'pending' | 'favorites'>('picks');
  const [query, setQuery] = useState(''); const [minScore, setMinScore] = useState(8);
  const [selected, setSelected] = useState<Photo | null>(null); const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0); const [dragging, setDragging] = useState(false);
  const [showFilters, setShowFilters] = useState(false); const [showHelp, setShowHelp] = useState(false); const [showDimensions, setShowDimensions] = useState(false); const [notice, setNotice] = useState('');
  const [selectedDimensions, setSelectedDimensions] = useState<DimensionId[]>(defaultDimensions);
  const [showAccount, setShowAccount] = useState(false); const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [language, setLanguage] = useState<UiLanguage>('zh-CN'); const [fontScale, setFontScale] = useState(100);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [deleted, setDeleted] = useState<{ photo: Photo; index: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = uiCopy[language];

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('lumisort-preferences') || '{}') as { language?: UiLanguage; fontScale?: number }; if (saved.language && saved.language in uiCopy) setLanguage(saved.language); if (saved.fontScale && saved.fontScale >= 90 && saved.fontScale <= 115) setFontScale(saved.fontScale); } catch { /* Keep safe defaults. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language; document.documentElement.style.fontSize = `${fontScale}%`;
    try { localStorage.setItem('lumisort-preferences', JSON.stringify({ language, fontScale })); } catch { /* Preferences remain available for this session. */ }
  }, [language, fontScale]);
  useEffect(() => { fetch('/api/analyze').then((response) => response.json()).then((value) => setApiConfigured(Boolean(value.configured))).catch(() => setApiConfigured(false)); }, []);

  const scoredPhotos = useMemo(() => photos.map((photo) => ({ ...photo, score: calculatedScore(photo, selectedDimensions) })), [photos, selectedDimensions]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoredPhotos.filter((photo) => {
      if (activeNav === 'picks' && photo.score < 7.5) return false;
      if (activeNav === 'rejects' && (photo.score >= 7.5 || photo.pending)) return false;
      if (activeNav === 'pending' && !photo.pending) return false;
      if (activeNav === 'favorites' && !photo.favorite) return false;
      if (activeNav !== 'rejects' && activeNav !== 'pending' && photo.score < minScore) return false;
      if (!q) return true;
      const haystack = [photo.title, photo.mood, photo.location, ...photo.tags, ...photo.entities].join(' ').toLowerCase();
      const semanticHints: Record<string, string[]> = { '清晰': ['清晰', '特写', '柔光'], '虚焦': ['人脸虚焦', '整体失焦', '拖影', '待淘汰'], '失焦': ['整体失焦', '焦点偏移', '待淘汰'], '风景': ['风景摄影', '山谷', '山脉'], '过曝': ['过曝', '高光溢出', '待淘汰'], '逆光': ['逆光人像', '黄昏', '阳光'], '人像': ['旅拍人像', '人像特写', '环境人像'] };
      const expanded = [q, ...Object.entries(semanticHints).filter(([key]) => q.includes(key)).flatMap(([, values]) => values)];
      return expanded.some((term) => haystack.includes(term));
    }).sort((a, b) => b.score - a.score);
  }, [scoredPhotos, activeNav, query, minScore]);

  const importedCount = photos.filter((p) => p.imported).length;
  const pendingCount = scoredPhotos.filter((p) => p.pending).length;
  const favoriteCount = scoredPhotos.filter((p) => p.favorite).length;

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/')).slice(0, 12); if (!files.length) return;
    const created = await Promise.all(files.map(async (file, index): Promise<Photo> => ({
      id: `upload-${Date.now()}-${index}`, src: await readFile(file), title: file.name.replace(/\.[^/.]+$/, ''), filename: file.name,
      score: 0, composition: 0, color: 0, clarity: 0, exposure: 0, faceQuality: 0, issues: [], tags: ['待分析'], entities: [], mood: '未知', location: 'EXIF 待读取',
      date: new Date().toLocaleDateString('zh-CN').replaceAll('/', '.'), camera: '待读取 EXIF', colors: ['#777777', '#4d4d4d', '#292929'], pending: true, imported: true,
    })));
    setPhotos((current) => [...created, ...current]); setActiveNav('pending');
    setNotice(`已导入 ${created.length} 张照片，可开始 AI 分析`); window.setTimeout(() => setNotice(''), 3200);
  }

  async function analyzePending() {
    const pending = photos.filter((p) => p.pending);
    if (!pending.length) { setNotice('当前没有待处理照片，先导入几张试试'); window.setTimeout(() => setNotice(''), 3000); return; }
    setAnalyzing(true); setProgress(6); const timer = window.setInterval(() => setProgress((value) => Math.min(value + 7, 90)), 180);
    let result: Partial<Photo> = {};
    try { const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageDataUrl: pending[0].src, dimensions: selectedDimensions }) }); if (response.ok) result = (await response.json()).analysis ?? {}; } catch { /* Offline demo fallback. */ }
    window.clearInterval(timer); setProgress(100); const moods = ['治愈', '通透', '故事感', '宁静'];
    setPhotos((current) => current.map((photo, index) => photo.pending ? { ...photo,
      score: index === 0 && result.score ? Number(result.score) : index % 4 === 3 ? 4.8 : 8.3 + (index % 4) * 0.2,
      composition: index === 0 && result.composition ? Number(result.composition) : 8.2,
      color: index === 0 && result.color ? Number(result.color) : 8.5, clarity: index === 0 && result.clarity ? Number(result.clarity) : index % 4 === 3 ? 3.6 : 8.7,
      exposure: index === 0 && result.exposure ? Number(result.exposure) : index % 4 === 3 ? 5.2 : 8.6,
      faceQuality: index === 0 && result.faceQuality ? Number(result.faceQuality) : index % 4 === 3 ? 4.4 : 8.8,
      issues: index === 0 && Array.isArray(result.issues) ? result.issues : index % 4 === 3 ? ['人像模糊', '焦点偏移'] : [],
      tags: index === 0 && Array.isArray(result.tags) ? result.tags : ['旅行摄影', '自然光', '纪实'],
      entities: index === 0 && Array.isArray(result.entities) ? result.entities : ['主体', '环境'],
      mood: index === 0 && result.mood ? String(result.mood) : moods[index % moods.length], pending: false,
    } : photo));
    window.setTimeout(() => { setAnalyzing(false); setActiveNav('picks'); setNotice(`AI 已完成 ${pending.length} 张照片的评分与标签`); window.setTimeout(() => setNotice(''), 3200); }, 450);
  }

  function toggleFavorite(id: string) { setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, favorite: !photo.favorite } : photo)); setSelected((current) => current?.id === id ? { ...current, favorite: !current.favorite } : current); }
  function deletePhoto(id: string) {
    setPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === id); if (index < 0) return current;
      const photo = current[index]; setDeleted({ photo, index });
      window.setTimeout(() => setDeleted((value) => value?.photo.id === id ? null : value), 6000);
      return current.filter((item) => item.id !== id);
    });
    setSelected(null);
  }
  function undoDelete() {
    if (!deleted) return;
    setPhotos((current) => { const restored = [...current]; restored.splice(Math.min(deleted.index, restored.length), 0, deleted.photo); return restored; });
    setDeleted(null); setNotice('照片已恢复'); window.setTimeout(() => setNotice(''), 2600);
  }
  function exportJson() { const payload = scoredPhotos.map(({ src, ...photo }) => ({ ...photo, selectedDimensions, dimensionScores: Object.fromEntries(selectedDimensions.map((id) => [id, Number(dimensionScore(photo, id).toFixed(1))])), image: src.startsWith('data:') ? '[local-image]' : src })); const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'lumisort-photo-assets.json'; link.click(); URL.revokeObjectURL(url); setNotice('结构化照片资产已导出'); window.setTimeout(() => setNotice(''), 3000); }

  return <main className="min-h-screen bg-[#0c0d0d] text-[#f3f0e8]">
    <input ref={inputRef} className="hidden" type="file" accept="image/*" multiple onChange={(event) => event.target.files && addFiles(event.target.files)} />
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-white/8 bg-[#0c0d0d]/92 px-4 backdrop-blur-xl md:px-7">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-[#d7ff61] text-[#111]"><Aperture className="size-5" /></div><div><div className="text-[15px] font-semibold tracking-tight">LumiSort <span className="font-normal text-white/30">/ 旅光</span></div><div className="text-[9px] tracking-[0.2em] text-white/36">AI PHOTO CURATOR</div></div></div>
      <div className="flex items-center gap-2"><div className="mr-1 hidden items-center gap-2 rounded-full border border-white/8 px-3 py-1.5 text-[11px] text-white/45 lg:flex"><span className={`size-1.5 rounded-full ${apiConfigured ? 'bg-[#d7ff61] shadow-[0_0_8px_#d7ff61]' : 'bg-[#ffd36a]'}`} />API · {apiConfigured ? 'DeepSeek Vision' : '演示模式'}</div>
        <Button aria-label={copy.account} variant="ghost" size="icon" onClick={() => setShowAccount(true)} className="rounded-full text-white/55 hover:bg-white/7 hover:text-white md:hidden"><UserRound /></Button>
        <Button aria-label="演示指南" variant="ghost" size="icon" onClick={() => setShowHelp(true)} className="rounded-full text-white/55 hover:bg-white/7 hover:text-white"><CircleHelp /></Button>
        <Button variant="outline" className="hidden h-9 rounded-full border-white/10 bg-white/[0.025] px-4 text-white/68 hover:bg-white/8 hover:text-white sm:inline-flex" onClick={exportJson}><FileJson />{copy.export}</Button>
        <Button className="h-9 rounded-full bg-[#d7ff61] px-4 text-[#111] hover:bg-[#e1ff8a]" onClick={() => inputRef.current?.click()}><Upload />{copy.upload}</Button>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1720px] gap-5 p-3 sm:p-4 md:grid-cols-[220px_minmax(0,1fr)] md:p-5">
      <aside className="hidden min-h-[calc(100vh-108px)] flex-col rounded-[20px] border border-white/8 bg-[#131515] p-3 md:flex">
        <p className="mb-2 px-3 pt-2 text-[10px] font-medium tracking-[0.18em] text-white/30">{copy.library}</p><nav className="space-y-1">{navItems.map(({ key, icon: Icon }) => { const count = key === 'all' ? scoredPhotos.length + 2140 : key === 'picks' ? scoredPhotos.filter((p) => p.score >= 7.5).length + 34 : key === 'rejects' ? scoredPhotos.filter((p) => p.score < 7.5 && !p.pending).length + 186 : key === 'pending' ? pendingCount : favoriteCount; return <button key={key} onClick={() => setActiveNav(key)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${activeNav === key ? 'bg-[#d7ff61] font-medium text-[#101111]' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}><Icon className="size-4" /><span className="flex-1">{copy.nav[key]}</span><span className="text-[11px] opacity-55">{count}</span></button>; })}</nav>
        <div className="my-5 border-t border-white/7" /><p className="mb-2 px-3 text-[10px] font-medium tracking-[0.18em] text-white/30">智能相册</p>{['可交付人像', '清晰风景', '需人工复核'].map((album, index) => <button key={album} onClick={() => setQuery(index === 1 ? '清晰风景' : index === 2 ? '整体失焦' : '清晰人像')} className="flex items-center gap-2 px-3 py-2 text-left text-[12px] text-white/42 hover:text-white"><FolderOpen className="size-3.5" />{album}</button>)}
        <div className="mt-auto space-y-3"><div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><div className="mb-6 flex items-center justify-between"><Sparkles className="size-5 text-[#d7ff61]" /><span className="text-[10px] text-white/28">THIS MONTH</span></div><p className="text-sm font-medium">2,148 张已结构化</p><p className="mt-1 text-[11px] leading-5 text-white/35">累计节省约 14.6 小时人工筛选时间</p></div><button onClick={() => setShowAccount(true)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-left transition hover:border-white/16 hover:bg-white/[0.05]"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${demoUser ? 'bg-[#d7ff61] text-black' : 'bg-white/7 text-white/45'}`}>{demoUser ? demoUser.name.slice(0, 1).toUpperCase() : <UserRound className="size-4" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-medium">{demoUser?.name || copy.guest}</strong><span className="mt-0.5 block truncate text-[10px] text-white/32">{demoUser?.email || copy.account}</span></span><Settings2 className="size-3.5 text-white/28" /></button></div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">{navItems.map(({ key }) => <button key={key} onClick={() => setActiveNav(key)} className={`shrink-0 rounded-full px-3 py-2 text-xs ${activeNav === key ? 'bg-[#d7ff61] text-black' : 'bg-white/6 text-white/55'}`}>{copy.nav[key]}</button>)}</div>
        <section onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={`mb-5 overflow-hidden rounded-[22px] border p-4 transition sm:p-5 ${dragging ? 'border-[#d7ff61] bg-[#d7ff61]/8' : 'border-white/8 bg-[#131515]'}`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d7ff61]/10 text-[#d7ff61]"><WandSparkles className="size-5" /></div><div><div className="flex items-center gap-2"><h1 className="text-lg font-medium tracking-[-0.02em]">{copy.detector}</h1><Badge className="bg-white/7 text-[10px] text-white/48 hover:bg-white/7">AUTO CULLING</Badge></div><p className="mt-1 text-xs text-white/38">{copy.detectorDesc}</p></div></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" className="h-9 rounded-xl border-white/10 bg-black/15 text-white hover:bg-white/8" onClick={() => setShowDimensions(true)}><Settings2 />{selectedDimensions.length} {copy.dimensions}</Button><div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs"><span className="text-white/30">{copy.nav.pending}</span><strong className="ml-2 font-medium">{pendingCount}</strong></div><div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs"><span className="text-white/30">自动过滤</span><strong className="ml-2 font-medium text-[#ff8d82]">{scoredPhotos.filter((p) => p.score < 7.5 && !p.pending).length}</strong></div><Button className="h-9 rounded-xl bg-[#d7ff61] px-4 text-black hover:bg-[#e1ff8a]" onClick={analyzePending} disabled={analyzing}><Sparkles />{analyzing ? copy.analyzing : copy.analyze}</Button></div></div>
        </section>

        <div className="mb-5 flex flex-col gap-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><Badge className={`mb-2 ${activeNav === 'rejects' ? 'bg-[#ff6b5f]/12 text-[#ff8d82]' : 'bg-[#d7ff61]/11 text-[#d7ff61]'} hover:bg-white/8`}>{copy.nav[activeNav]}</Badge><h2 className="text-2xl font-medium tracking-[-0.035em] sm:text-3xl">{activeNav === 'rejects' && language === 'zh-CN' ? '低分废片已自动隔离，等待复核。' : copy.headline}</h2></div><div className="flex items-center gap-2"><label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-[#151717] px-4 lg:w-[340px]"><Search className="size-4 shrink-0 text-white/35" /><input aria-label="语义搜索" value={query} onChange={(event) => setQuery(event.target.value)} className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-white/28" placeholder={copy.search} />{query && <button aria-label="清除搜索" onClick={() => setQuery('')}><X className="size-3.5 text-white/35" /></button>}</label><Button aria-label="筛选" variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={`size-10 rounded-full border-white/10 hover:text-white ${showFilters ? 'bg-[#d7ff61] text-black hover:bg-[#d7ff61]' : 'bg-[#151717] text-white hover:bg-white/8'}`}><ListFilter /></Button></div></div>
          <div className="flex gap-2 overflow-x-auto pb-1">{quickSearches.map((item) => <button key={item} onClick={() => setQuery(item)} className="shrink-0 rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/38 transition hover:border-white/18 hover:text-white/70">{item}</button>)}</div>
          {showFilters && <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#141616] p-4 sm:flex-row sm:items-center"><Settings2 className="size-4 text-[#d7ff61]" /><span className="text-xs text-white/45">最低评分</span><input aria-label="最低评分" type="range" min="0" max="95" value={minScore * 10} onChange={(event) => setMinScore(Number(event.target.value) / 10)} className="accent-[#d7ff61] sm:w-48" /><strong className="w-8 text-sm font-medium">{minScore.toFixed(1)}</strong><span className="text-xs text-white/26">{filtered.length} 个结果</span><Button variant="ghost" size="sm" className="sm:ml-auto" onClick={() => { setMinScore(0); setQuery(''); }}>重置筛选</Button></div>}
        </div>

        {activeNav === 'pending' && pendingCount === 0 ? <EmptyState onUpload={() => inputRef.current?.click()} /> : filtered.length === 0 ? <NoResults onReset={() => { setQuery(''); setMinScore(0); setActiveNav('all'); }} /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{filtered.map((photo, index) => <PhotoCard key={photo.id} photo={photo} featured={!query && activeNav === 'picks' && index === 0} onSelect={() => setSelected(photo)} onFavorite={() => toggleFavorite(photo.id)} onDelete={() => deletePhoto(photo.id)} />)}</div>}
      </section>
    </div>
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#efffc4] px-4 py-2.5 text-xs font-medium text-[#101111] shadow-2xl"><Check className="size-4" />{notice}</div>}
    {deleted && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-[#efffc4] py-2 pl-4 pr-2 text-xs font-medium text-[#101111] shadow-2xl"><Trash2 className="size-4" />已移除「{deleted.photo.title}」<button onClick={undoDelete} className="flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 transition hover:bg-black/15"><RotateCcw className="size-3" />撤销</button></div>}
    {analyzing && <AnalysisOverlay progress={progress} pendingCount={pendingCount} dimensionCount={selectedDimensions.length} />}
    {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    {showAccount && <AccountSettings user={demoUser} language={language} fontScale={fontScale} onLanguage={setLanguage} onFontScale={setFontScale} onClose={() => setShowAccount(false)} onLogin={(user) => { setDemoUser(user); setNotice(`已切换为 ${user.name} 的演示登录状态`); window.setTimeout(() => setNotice(''), 2800); }} onLogout={() => { setDemoUser(null); setNotice('已切换为游客模式'); window.setTimeout(() => setNotice(''), 2800); }} />}
    {showDimensions && <QualitySettings selected={selectedDimensions} onClose={() => setShowDimensions(false)} onPreset={(dimensions) => setSelectedDimensions(dimensions)} onToggle={(id) => setSelectedDimensions((current) => current.includes(id) ? current.length === 1 ? current : current.filter((item) => item !== id) : [...current, id])} />}
    <PhotoDetail photo={selected} dimensions={selectedDimensions} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} onFavorite={() => selected && toggleFavorite(selected.id)} onDelete={() => selected && deletePhoto(selected.id)} />
  </main>;
}

function PhotoCard({ photo, featured, onSelect, onFavorite, onDelete }: { photo: Photo; featured: boolean; onSelect: () => void; onFavorite: () => void; onDelete: () => void }) {
  const rejected = !photo.pending && photo.score < 7.5;
  const defectFilter = photo.issues?.some((issue) => issue.includes('虚焦') || issue.includes('拖影')) ? 'blur-[1.1px]' : photo.issues?.some((issue) => issue.includes('过曝')) ? 'brightness-125 contrast-75' : '';
  return <article className={`group/card relative ${featured ? 'sm:col-span-2 lg:col-span-2 2xl:col-span-2' : ''}`}><button onClick={onSelect} className={`group relative block w-full overflow-hidden rounded-[18px] bg-[#1a1c1c] text-left ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}><img src={photo.src} alt={photo.title} className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] group-focus-visible:scale-[1.025] ${defectFilter}`} /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10" /><div className="absolute left-3 top-3 flex gap-1.5">{photo.pending ? <Badge className="bg-[#ffd36a] text-black hover:bg-[#ffd36a]"><Clock3 />待分析</Badge> : <><Badge className={rejected ? 'bg-[#ff6b5f] text-white hover:bg-[#ff6b5f]' : 'bg-black/52 text-white backdrop-blur hover:bg-black/52'}><Star className={rejected ? 'text-white' : 'fill-[#d7ff61] text-[#d7ff61]'} />{photo.score.toFixed(1)}</Badge><Badge className={rejected ? 'bg-black/58 text-[#ff9b92] backdrop-blur hover:bg-black/58' : 'bg-[#d7ff61] text-black hover:bg-[#d7ff61]'}>{rejected ? '建议淘汰' : '达标'}</Badge></>}{photo.imported && <Badge className="bg-[#d7ff61] text-black hover:bg-[#d7ff61]">NEW</Badge>}</div><div className="absolute inset-x-0 bottom-0 p-4"><p className={`${featured ? 'text-xl' : 'text-[15px]'} font-medium`}>{photo.title}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{(rejected ? photo.issues ?? [] : photo.tags).slice(0, 3).map((tag) => <span key={tag} className={`text-[10px] ${rejected ? 'rounded-full bg-[#ff6b5f]/20 px-2 py-0.5 text-[#ffb1aa]' : 'text-white/52'}`}>{rejected ? tag : `#${tag}`}</span>)}</div></div></button><button aria-label={`删除${photo.title}`} onClick={onDelete} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/52 text-white/65 opacity-0 backdrop-blur transition hover:bg-[#ff6b5f] hover:text-white focus:opacity-100 group-hover/card:opacity-100"><Trash2 className="size-3.5" /></button><div className="flex items-center gap-2 px-1 pb-1 pt-2"><MapPin className="size-3 text-white/25" /><span className="flex-1 truncate text-[10px] text-white/34">{photo.location}</span><button aria-label={photo.favorite ? '取消收藏' : '收藏'} onClick={onFavorite} className="rounded-full p-1 text-white/28 hover:bg-white/5 hover:text-white"><Heart className={`size-3.5 ${photo.favorite ? 'fill-[#d7ff61] text-[#d7ff61]' : ''}`} /></button></div></article>;
}

function EmptyState({ onUpload }: { onUpload: () => void }) { return <div className="grid min-h-[360px] place-items-center rounded-[22px] border border-dashed border-white/12 bg-white/[0.015] p-8 text-center"><div><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5"><ImageIcon className="size-6 text-white/35" /></div><h3 className="mt-4 font-medium">待处理队列是空的</h3><p className="mt-1 text-xs text-white/35">拖入旅拍照片，或从本地选择文件。</p><Button onClick={onUpload} className="mt-5 rounded-full bg-[#d7ff61] text-black hover:bg-[#e1ff8a]"><Upload />选择照片</Button></div></div>; }
function NoResults({ onReset }: { onReset: () => void }) { return <div className="grid min-h-[300px] place-items-center rounded-[22px] border border-white/8 bg-[#131515] p-8 text-center"><div><Search className="mx-auto size-7 text-white/25" /><h3 className="mt-4 font-medium">这次没找到匹配画面</h3><p className="mt-1 text-xs text-white/35">换一种描述，或降低评分门槛。</p><Button variant="outline" onClick={onReset} className="mt-5 rounded-full border-white/10 bg-transparent text-white hover:bg-white/8">查看全部</Button></div></div>; }
function AnalysisOverlay({ progress, pendingCount, dimensionCount }: { progress: number; pendingCount: number; dimensionCount: number }) { const stage = progress < 25 ? '正在识别主体与画面类型' : progress < 55 ? '正在检测焦点、抖动与噪点' : progress < 82 ? '正在评估曝光、色彩与场景结构' : '正在按所选维度生成综合分'; return <div className="fixed inset-0 z-40 grid place-items-center bg-black/66 p-5 backdrop-blur-md"><div className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#151717] p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-2xl bg-[#d7ff61]/12"><LoaderCircle className="size-5 animate-spin text-[#d7ff61]" /></div><Badge className="bg-[#d7ff61]/10 text-[#d7ff61] hover:bg-[#d7ff61]/10">VISION MODEL READY</Badge></div><h3 className="mt-8 text-xl font-medium">正在检测 {pendingCount} 张照片</h3><p className="mt-2 text-sm text-white/40">{stage}</p><div className="mt-7 flex items-center justify-between text-xs text-white/45"><span>{dimensionCount} 项自定义质量检测</span><span>{Math.round(progress)}%</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-[#d7ff61] transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-5 grid grid-cols-4 gap-2 text-center text-[9px] text-white/28">{['清晰度', '光线色彩', '人像专项', '场景结构'].map((item) => <span key={item}>{item}</span>)}</div></div></div>; }

function AccountSettings({ user, language, fontScale, onLanguage, onFontScale, onLogin, onLogout, onClose }: { user: DemoUser | null; language: UiLanguage; fontScale: number; onLanguage: (language: UiLanguage) => void; onFontScale: (scale: number) => void; onLogin: (user: DemoUser) => void; onLogout: () => void; onClose: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [error, setError] = useState('');
  function createAccount(event: FormEvent) { event.preventDefault(); if (!name.trim() || !email.includes('@')) { setError('请填写昵称和有效邮箱'); return; } setError(''); onLogin({ name: name.trim(), email: email.trim() }); }
  return <div role="dialog" aria-modal="true" aria-labelledby="account-title" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><div className="my-auto w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/10 bg-[#151717] shadow-2xl"><div className="flex items-start justify-between border-b border-white/8 p-5 sm:p-6"><div><Badge className="bg-[#d7ff61]/10 text-[#d7ff61] hover:bg-[#d7ff61]/10">PROFILE & PREFERENCES</Badge><h2 id="account-title" className="mt-3 text-xl font-medium">个人与通用设置</h2><p className="mt-1 text-xs text-white/38">管理演示登录状态，以及仅保存在当前设备的界面偏好。</p></div><Button aria-label="关闭" variant="ghost" size="icon" onClick={onClose} className="shrink-0 rounded-full text-white/45 hover:bg-white/7 hover:text-white"><X /></Button></div><div className="grid md:grid-cols-[1fr_1.05fr]"><section className="border-b border-white/8 p-5 sm:p-6 md:border-b-0 md:border-r"><div className="mb-4 flex items-center gap-2 text-xs font-medium text-white/55"><UserRound className="size-4 text-[#d7ff61]" />账号状态</div>{user ? <div><div className="flex items-center gap-3 rounded-2xl border border-[#d7ff61]/18 bg-[#d7ff61]/6 p-4"><span className="grid size-11 place-items-center rounded-full bg-[#d7ff61] font-medium text-black">{user.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="truncate text-sm">{user.name}</strong><Badge className="bg-[#d7ff61]/12 text-[9px] text-[#d7ff61] hover:bg-[#d7ff61]/12">已登录</Badge></div><p className="mt-1 truncate text-[11px] text-white/38">{user.email}</p></div></div><Button variant="outline" onClick={onLogout} className="mt-4 w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/7"><LogOut />切换为游客模式</Button></div> : <form onSubmit={createAccount}><div className="rounded-2xl border border-white/8 bg-black/15 p-4"><div className="flex items-center gap-2 text-sm font-medium"><LogIn className="size-4 text-[#d7ff61]" />创建演示账号</div><p className="mt-1 text-[10px] leading-4 text-white/30">不会创建真实云端账户，也不会上传或保存以下信息。</p><label className="mt-4 block text-[10px] text-white/38">昵称<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：Alex" className="mt-1.5 h-10 border-white/10 bg-white/[0.025] text-white placeholder:text-white/20" /></label><label className="mt-3 block text-[10px] text-white/38">邮箱<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="mt-1.5 h-10 border-white/10 bg-white/[0.025] text-white placeholder:text-white/20" /></label>{error && <p className="mt-2 text-[10px] text-[#ff8d82]">{error}</p>}<Button type="submit" className="mt-4 w-full rounded-xl bg-[#d7ff61] text-black hover:bg-[#e1ff8a]"><Mail />创建并登录</Button></div><button type="button" onClick={() => onLogin({ name: 'Lumi Guest', email: 'guest@lumisort.demo' })} className="mt-3 w-full text-center text-[11px] text-white/38 hover:text-white/70">一键切换为演示登录状态</button></form>}</section><section className="p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-medium text-white/55"><Languages className="size-4 text-[#d7ff61]" />界面语言</div><div className="mt-3 grid grid-cols-3 gap-2">{([['zh-CN', '简体中文'], ['en', 'English'], ['zh-TW', '繁體中文']] as const).map(([value, label]) => <button key={value} onClick={() => onLanguage(value)} className={`rounded-xl border px-2 py-2.5 text-xs transition ${language === value ? 'border-[#d7ff61]/45 bg-[#d7ff61]/10 text-[#d7ff61]' : 'border-white/8 bg-white/[0.025] text-white/42 hover:text-white/70'}`}>{label}</button>)}</div><div className="mt-7 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-medium text-white/55"><Type className="size-4 text-[#d7ff61]" />字体大小</div><strong className="text-xs text-[#d7ff61]">{fontScale}%</strong></div><Slider min={90} max={115} step={5} value={[fontScale]} onValueChange={(value) => onFontScale(Number(Array.isArray(value) ? value[0] : value))} className="mt-5 [&_[data-slot=slider-range]]:bg-[#d7ff61] [&_[data-slot=slider-track]]:bg-white/10" /><div className="mt-2 flex justify-between text-[9px] text-white/25"><span>紧凑</span><span>标准</span><span>大字</span></div><div className="mt-7 rounded-2xl border border-white/8 bg-black/15 p-4"><div className="flex items-center gap-2 text-xs text-white/55"><ShieldCheck className="size-4 text-[#d7ff61]" />隐私说明</div><p className="mt-2 text-[10px] leading-5 text-white/30">语言与字体偏好保存在当前浏览器。演示账号仅存在于本次页面会话，刷新后恢复游客模式；接入真实账号系统后才支持跨设备同步。</p></div></section></div></div></div>;
}

function QualitySettings({ selected, onToggle, onPreset, onClose }: { selected: DimensionId[]; onToggle: (id: DimensionId) => void; onPreset: (ids: DimensionId[]) => void; onClose: () => void }) {
  const groups = [...new Set(qualityDimensions.map((item) => item.group))];
  return <div role="dialog" aria-modal="true" aria-labelledby="quality-title" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><div className="my-auto w-full max-w-2xl rounded-[26px] border border-white/10 bg-[#151717] p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><Badge className="bg-[#d7ff61]/10 text-[#d7ff61] hover:bg-[#d7ff61]/10">CUSTOM QUALITY MODEL</Badge><h2 id="quality-title" className="mt-3 text-xl font-medium">选择 AI 质量检测维度</h2><p className="mt-1 text-xs leading-5 text-white/38">当前选择 {selected.length}/15 项，综合分按所选维度等权计算；可针对人像或风景切换预设。</p></div><Button aria-label="关闭" variant="ghost" size="icon" onClick={onClose} className="shrink-0 rounded-full text-white/45 hover:bg-white/7 hover:text-white"><X /></Button></div><div className="mt-5 flex flex-wrap gap-2">{Object.entries(dimensionPresets).map(([name, ids]) => <button key={name} onClick={() => onPreset(ids)} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/55 transition hover:border-[#d7ff61]/40 hover:text-[#d7ff61]">{name} · {ids.length}项</button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2">{groups.map((group) => <section key={group} className="rounded-2xl border border-white/8 bg-black/15 p-4"><p className="mb-3 text-[10px] font-medium tracking-[.16em] text-white/30">{group}</p><div className="grid grid-cols-2 gap-x-3 gap-y-3">{qualityDimensions.filter((item) => item.group === group).map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs text-white/62"><Checkbox checked={selected.includes(item.id)} onCheckedChange={() => onToggle(item.id)} className="border-white/20 data-checked:border-[#d7ff61] data-checked:bg-[#d7ff61] data-checked:text-black" /><span>{item.label}</span></label>)}</div></section>)}</div><div className="mt-5 flex items-center justify-between gap-3"><p className="text-[10px] text-white/28">至少保留 1 项；修改后素材库评分与筛选结果会实时更新。</p><Button onClick={onClose} className="rounded-xl bg-[#d7ff61] text-black hover:bg-[#e1ff8a]">应用评分模型</Button></div></div></div>;
}

function HelpOverlay({ onClose }: { onClose: () => void }) { return <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="fixed inset-0 z-50 grid place-items-center bg-black/66 p-5 backdrop-blur-sm" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><div className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#171919] p-6 shadow-2xl"><Button aria-label="关闭" variant="ghost" size="icon" onClick={onClose} className="absolute right-3 top-3 rounded-full text-white/45 hover:bg-white/7 hover:text-white"><X /></Button><h2 id="help-title" className="text-lg font-medium">智能筛片演示指南</h2><p className="mt-2 text-sm text-white/42">这是一个可完整交互的产品 demo，人像与风景照片都可检测，导入数据仅保留在当前页面。</p><div className="mt-6 space-y-3 text-sm text-white/65"><p>1. 先选择快速技术、人像交付或风景精选预设，也可自由勾选 15 项指标。</p><p>2. 导入照片并点击「AI 质量检测」，按所选维度生成综合分。</p><p>3. 低于 7.5 分的照片自动进入「废片筛选」，并展示具体原因。</p><p>4. 人工复核后可收藏、删除、撤销删除或导出结构化结果。</p></div><Button onClick={onClose} className="mt-6 w-full rounded-xl bg-[#d7ff61] text-black hover:bg-[#e1ff8a]">开始体验</Button></div></div>; }

function PhotoDetail({ photo, dimensions, open, onOpenChange, onFavorite, onDelete }: { photo: Photo | null; dimensions: DimensionId[]; open: boolean; onOpenChange: (open: boolean) => void; onFavorite: () => void; onDelete: () => void }) {
  if (!photo) return null;
  if (!open) return null;
  const rejected = photo.score < 7.5;
  return <div role="dialog" aria-modal="true" aria-label={photo.title} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(event) => event.currentTarget === event.target && onOpenChange(false)}><div className="my-auto grid w-full max-w-[920px] overflow-hidden rounded-[24px] border border-white/10 bg-[#131515] text-[#f3f0e8] shadow-2xl md:grid-cols-[1.2fr_.8fr]"><div className="relative min-h-[340px] overflow-hidden bg-black md:min-h-[650px]"><img src={photo.src} alt={photo.title} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/20" /><Button variant="ghost" size="icon" aria-label="关闭" onClick={() => onOpenChange(false)} className="absolute left-3 top-3 rounded-full bg-black/35 text-white hover:bg-black/55"><X /></Button><div className="absolute inset-x-0 bottom-0 p-5"><p className="text-xl font-medium">{photo.title}</p><p className="mt-1 text-xs text-white/50">{photo.filename}</p></div></div><div className="flex max-h-[760px] flex-col overflow-y-auto p-5 md:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] tracking-[.16em] text-white/28">CUSTOM QUALITY SCORE · {dimensions.length} DIMENSIONS</p><div className="mt-1 flex items-end gap-2"><strong className={`text-4xl font-medium tracking-[-.05em] ${rejected ? 'text-[#ff8d82]' : ''}`}>{photo.score.toFixed(1)}</strong><span className="pb-1 text-xs text-white/30">/ 10 · {rejected ? '建议淘汰' : '达到交付标准'}</span></div></div><button aria-label="收藏" onClick={onFavorite} className="rounded-full border border-white/9 p-2.5"><Heart className={`size-4 ${photo.favorite ? 'fill-[#d7ff61] text-[#d7ff61]' : 'text-white/45'}`} /></button></div><div className="mt-6 space-y-3">{dimensions.map((id) => { const value = dimensionScore(photo, id); const label = qualityDimensions.find((item) => item.id === id)?.label ?? id; return <div key={id} className="grid grid-cols-[72px_1fr_28px] items-center gap-3 text-xs"><span className="text-white/38">{label}</span><div className="h-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full ${value < 6 ? 'bg-[#ff6b5f]' : 'bg-[#d7ff61]'}`} style={{ width: `${value * 10}%` }} /></div><strong className="font-medium">{value.toFixed(1)}</strong></div>; })}</div><p className="mt-3 text-[10px] leading-4 text-white/28">综合分 = 所选 {dimensions.length} 个检测维度的等权平均值；切换维度后实时重算。</p>{photo.issues?.length ? <div className="mt-5 rounded-xl border border-[#ff6b5f]/20 bg-[#ff6b5f]/8 p-3"><p className="text-[10px] tracking-[.14em] text-[#ff9b92]">检测到的废片风险</p><div className="mt-2 flex flex-wrap gap-2">{photo.issues.map((issue) => <Badge key={issue} className="bg-[#ff6b5f]/15 text-[#ffb1aa] hover:bg-[#ff6b5f]/15">{issue}</Badge>)}</div></div> : null}<div className="my-6 border-t border-white/8" /><DetailRow icon={Sparkles} label="氛围" value={photo.mood} /><DetailRow icon={MapPin} label="地点" value={photo.location} /><DetailRow icon={Camera} label="EXIF" value={photo.camera} /><DetailRow icon={Clock3} label="拍摄日期" value={photo.date} /><div className="mt-5"><p className="text-[10px] tracking-[.14em] text-white/28">语义标签</p><div className="mt-2 flex flex-wrap gap-2">{[...photo.tags, ...photo.entities].map((tag) => <Badge key={tag} className="bg-white/6 text-white/54 hover:bg-white/6">{tag}</Badge>)}</div></div><div className="mt-auto grid grid-cols-[auto_1fr] gap-2 pt-5"><Button aria-label="删除照片" variant="destructive" size="icon" onClick={onDelete} className="size-9 rounded-xl"><Trash2 /></Button><Button className="rounded-xl bg-[#d7ff61] text-black hover:bg-[#e1ff8a]"><ArrowDownToLine />{rejected ? '保留并重新评估' : '加入可交付精选'}</Button></div></div></div></div>;
}
function DetailRow({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) { return <div className="mb-3 grid grid-cols-[20px_64px_1fr] items-start gap-2 text-xs"><Icon className="mt-0.5 size-3.5 text-white/24" /><span className="text-white/30">{label}</span><span className="text-right text-white/66">{value}</span></div>; }
