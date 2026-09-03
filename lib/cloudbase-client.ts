'use client';

import cloudbase from '@cloudbase/js-sdk';

export type CloudUser = {
  id: string;
  name: string;
  email: string;
  mode: 'cloud';
};

export type CloudPhotoDocument = {
  _id?: string;
  userId: string;
  fileId: string;
  cloudPath: string;
  title: string;
  filename: string;
  score: number;
  composition: number;
  color: number;
  clarity: number;
  exposure: number;
  faceQuality: number;
  tags: string[];
  entities: string[];
  mood: string;
  location: string;
  date: string;
  camera: string;
  colors: string[];
  issues: string[];
  favorite: boolean;
  pending: boolean;
  imported: boolean;
  createdAt: number;
  updatedAt: number;
};

const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID?.trim();
const region = process.env.NEXT_PUBLIC_TCB_REGION?.trim() || 'ap-shanghai';
const accessKey = process.env.NEXT_PUBLIC_TCB_PUBLISHABLE_KEY?.trim();

export const cloudbaseConfigured = Boolean(envId && accessKey);

let app: ReturnType<typeof cloudbase.init> | null = null;
let pendingOtpVerifier: ((params: { token: string | number }) => Promise<unknown>) | null = null;

function getApp() {
  if (!cloudbaseConfigured || !envId || !accessKey) throw new Error('腾讯云 CloudBase 尚未配置');
  if (!app) {
    app = cloudbase.init({ env: envId, region, accessKey, auth: { detectSessionInUrl: true } });
  }
  return app;
}

function getAuth() {
  return getApp().auth({ persistence: 'local' });
}

function toCloudUser(value: unknown): CloudUser | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as { id?: string; uid?: string; email?: string; user_metadata?: { name?: string; nickname?: string; username?: string } };
  const id = String(user.id || user.uid || '');
  if (!id) return null;
  const email = String(user.email || '');
  const metadata = user.user_metadata || {};
  return { id, email, name: String(metadata.name || metadata.nickname || metadata.username || email.split('@')[0] || 'LumiSort 用户'), mode: 'cloud' };
}

function throwAuthError(error: unknown) {
  if (!error) return;
  const detail = error as { message?: string; error_description?: string };
  throw new Error(detail.message || detail.error_description || '账号服务请求失败');
}

export async function restoreCloudUser(): Promise<CloudUser | null> {
  if (!cloudbaseConfigured) return null;
  const result = await getAuth().getSession();
  throwAuthError(result.error);
  return toCloudUser(result.data.user || result.data.session?.user);
}

export async function signInCloud(email: string, password: string): Promise<CloudUser> {
  const result = await getAuth().signInWithPassword({ email, password });
  throwAuthError(result.error);
  const user = toCloudUser(result.data.user || result.data.session?.user);
  if (!user) throw new Error('登录成功，但未能读取账号信息');
  return user;
}

export async function signUpCloud(name: string, email: string, password: string) {
  const result = await getAuth().signUp({ email, password, name });
  throwAuthError(result.error);
  pendingOtpVerifier = result.data.verifyOtp || null;
  return { user: toCloudUser(result.data.user || result.data.session?.user), verificationRequired: Boolean(pendingOtpVerifier) };
}

export async function verifyCloudSignUp(code: string): Promise<CloudUser> {
  if (!pendingOtpVerifier) throw new Error('验证码已失效，请重新创建账号');
  const result = await pendingOtpVerifier({ token: code }) as { data?: { user?: unknown; session?: { user?: unknown } }; error?: unknown };
  throwAuthError(result.error);
  pendingOtpVerifier = null;
  const user = toCloudUser(result.data?.user || result.data?.session?.user);
  if (!user) throw new Error('验证成功，但未能读取账号信息');
  return user;
}

export async function signOutCloud() {
  await getAuth().signOut();
}

function safeFilename(filename: string) {
  return filename.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(-120) || 'photo.jpg';
}

export async function uploadPhotoFile(file: File, userId: string) {
  const cloudPath = `users/${userId}/photos/${Date.now()}-${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const result = await getApp().uploadFile({ cloudPath, filePath: file as unknown as string });
  return { cloudPath, fileId: result.fileID };
}

export async function saveCloudPhoto(document: CloudPhotoDocument) {
  const result = await getApp().database().collection('photos').add(document);
  const id = result.id || result.insertedIds?.[0] || result.ids?.[0];
  if (!id) throw new Error(result.message || '照片元数据写入失败');
  return id;
}

export async function updateCloudPhoto(id: string, values: Partial<CloudPhotoDocument>) {
  await getApp().database().collection('photos').doc(id).update({ ...values, updatedAt: Date.now() });
}

export async function removeCloudPhoto(id: string, fileId?: string) {
  if (fileId) await getApp().deleteFile({ fileList: [fileId] });
  await getApp().database().collection('photos').doc(id).remove();
}

export async function loadCloudPhotos(userId: string) {
  const response = await getApp().database().collection('photos').where({ userId }).orderBy('createdAt', 'desc').limit(100).get();
  const documents = response.data as CloudPhotoDocument[];
  const fileIds = documents.map((item) => item.fileId).filter(Boolean);
  if (!fileIds.length) return documents.map((document) => ({ document, url: '' }));
  const urlResponse = await getApp().getTempFileURL({ fileList: fileIds });
  const urls = new Map((urlResponse.fileList || []).map((item) => [item.fileID, item.tempFileURL]));
  return documents.map((document) => ({ document, url: urls.get(document.fileId) || '' }));
}
