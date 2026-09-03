const dimensionLabels = {
  focus: '焦点准确', motion: '运动模糊', sharpness: '整体锐度', noise: '噪点控制',
  exposure: '曝光准确', highlights: '高光保留', shadows: '暗部细节', whiteBalance: '白平衡', color: '色彩自然度',
  face: '人脸可用性', eyes: '眼睛状态', skin: '肤色与质感', composition: '构图平衡', horizon: '地平线水平', subject: '主体完整性',
} as const;
type DimensionId = keyof typeof dimensionLabels;
type VisionAnalysis = { score: number; composition: number; color: number; clarity: number; exposure: number; faceQuality: number; metrics: Partial<Record<DimensionId, number>>; issues: string[]; tags: string[]; entities: string[]; mood: string; summary: string };

const baseMetrics: Record<DimensionId, number> = { focus: 9.2, motion: 9.1, sharpness: 9, noise: 8.5, exposure: 8.8, highlights: 8.6, shadows: 8.4, whiteBalance: 8.8, color: 8.8, face: 9.1, eyes: 9.3, skin: 8.7, composition: 8.5, horizon: 9.2, subject: 9 };
const defaultDimensions: DimensionId[] = ['focus', 'motion', 'sharpness', 'exposure', 'highlights', 'composition'];
const clamp = (score: unknown, fallback: number) => Math.max(0, Math.min(10, Number(score) || fallback));

function normalizeDimensions(value: unknown): DimensionId[] {
  if (!Array.isArray(value)) return defaultDimensions;
  const selected = value.filter((id): id is DimensionId => typeof id === 'string' && id in dimensionLabels);
  return selected.length ? [...new Set(selected)].slice(0, 15) : defaultDimensions;
}

function demoAnalysis(dimensions: DimensionId[]): VisionAnalysis {
  const score = dimensions.reduce((sum, id) => sum + baseMetrics[id], 0) / dimensions.length;
  return { score, composition: baseMetrics.composition, color: baseMetrics.color, clarity: baseMetrics.sharpness, exposure: baseMetrics.exposure, faceQuality: baseMetrics.face, metrics: Object.fromEntries(dimensions.map((id) => [id, baseMetrics[id]])), issues: [], tags: ['旅行摄影', '自然光', '清晰'], entities: ['主体', '环境', '光影'], mood: '通透', summary: '主体清晰、曝光正常，达到当前自定义质量标准。' };
}

function normalize(raw: unknown, dimensions: DimensionId[]): VisionAnalysis {
  const fallback = demoAnalysis(dimensions); const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<VisionAnalysis>;
  const rawMetrics = value.metrics && typeof value.metrics === 'object' ? value.metrics : {};
  const metrics = Object.fromEntries(dimensions.map((id) => [id, clamp(rawMetrics[id], baseMetrics[id])])) as Partial<Record<DimensionId, number>>;
  const score = dimensions.reduce((sum, id) => sum + (metrics[id] ?? baseMetrics[id]), 0) / dimensions.length;
  return { score, composition: clamp(value.composition ?? metrics.composition, fallback.composition), color: clamp(value.color ?? metrics.color, fallback.color), clarity: clamp(value.clarity ?? metrics.sharpness ?? metrics.focus, fallback.clarity), exposure: clamp(value.exposure ?? metrics.exposure, fallback.exposure), faceQuality: clamp(value.faceQuality ?? metrics.face, fallback.faceQuality), metrics, issues: Array.isArray(value.issues) ? value.issues.slice(0, 8).map(String) : [], tags: Array.isArray(value.tags) ? value.tags.slice(0, 6).map(String) : fallback.tags, entities: Array.isArray(value.entities) ? value.entities.slice(0, 8).map(String) : fallback.entities, mood: String(value.mood || fallback.mood), summary: String(value.summary || fallback.summary) };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { imageDataUrl?: string; imageUrl?: string; dimensions?: string[] };
  const dimensions = normalizeDimensions(body.dimensions); const fallback = demoAnalysis(dimensions);
  const imageUrl = body.imageUrl || body.imageDataUrl;
  const apiKey = process.env.DEEPSEEK_API_KEY; const baseUrl = process.env.DEEPSEEK_VISION_BASE_URL || 'https://api.deepseek.com/chat/completions'; const model = process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp';
  if (!apiKey || !imageUrl) { await new Promise((resolve) => setTimeout(resolve, 650)); return Response.json({ mode: 'demo', analysis: fallback }); }
  const requested = dimensions.map((id) => `${id}（${dimensionLabels[id]}）`).join('、');
  const prompt = `你是专业摄影工作室的智能筛片助手，需要同时适用于人像、风景、街拍和旅行照片。只评估用户指定的质量维度：${requested}。只返回 JSON：{"metrics":{"维度id":0-10},"composition":0-10,"color":0-10,"clarity":0-10,"exposure":0-10,"faceQuality":0-10,"issues":["明确可观察问题"],"tags":["6个中文语义标签"],"entities":["8个中文可视实体"],"mood":"2-4字中文氛围","summary":"一句可解释筛片建议"}。metrics 必须仅包含上述维度 id，每项独立评分。重点识别人脸或风景主体虚焦、整体失焦、相机抖动、运动拖影、噪点、过曝、欠曝、高光溢出、暗部丢失、白平衡偏色、地平线倾斜、闭眼、遮挡与不当裁切。没有人脸时，人像专项指标应按主体可用性解释，不得因无人脸直接判低分。issues 没有问题时返回空数组。最终综合分由服务端按用户所选维度等权计算。`;
  try { const response = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, temperature: 0.15, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: prompt }, { role: 'user', content: [{ type: 'text', text: '请按指定维度分析这张照片。' }, { type: 'image_url', image_url: { url: imageUrl } }] }] }) }); if (!response.ok) throw new Error(`Vision API ${response.status}`); const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> }; const content = result.choices?.[0]?.message?.content || '{}'; return Response.json({ mode: 'live', dimensions, analysis: normalize(JSON.parse(content), dimensions) }); } catch (error) { return Response.json({ mode: 'fallback', dimensions, analysis: fallback, warning: error instanceof Error ? error.message : 'Vision API unavailable' }); }
}

export async function GET() {
  return Response.json({ configured: Boolean(process.env.DEEPSEEK_API_KEY), model: process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp' });
}
