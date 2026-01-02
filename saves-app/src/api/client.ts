import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, Transaction, Stats, MonthlyStats, User, AuthResponse } from '../types';

const API_BASE = 'https://saves-api.luyoung0001.workers.dev';
const TOKEN_KEY = 'saves_auth_token';
const USER_KEY = 'saves_user';

let authToken: string | null = null;

// 初始化时加载 token
export async function initAuth(): Promise<User | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (token && userStr) {
      authToken = token;
      return JSON.parse(userStr);
    }
  } catch (error) {
    console.error('Failed to load auth:', error);
  }
  return null;
}

// 保存认证信息
async function saveAuth(token: string, user: User): Promise<void> {
  authToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

// 清除认证信息
export async function clearAuth(): Promise<void> {
  authToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

// 获取当前 token
export function getToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
}

// ========== Auth API ==========

export async function register(username: string, password: string, confirmPassword: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, confirm_password: confirmPassword }),
  });
  await saveAuth(data.token, data.user);
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  await saveAuth(data.token, data.user);
  return data;
}

export async function logout(): Promise<void> {
  await clearAuth();
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return request<{ user: User }>('/api/auth/me');
}

// ========== Categories API ==========

export async function getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  const query = type ? `?type=${type}` : '';
  return request<Category[]>(`/api/categories${query}`);
}

export async function createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
  return request<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========== Transactions API ==========

export async function getTransactions(params?: {
  type?: 'income' | 'expense';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  const query = new URLSearchParams();
  if (params?.type) query.set('type', params.type);
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const queryString = query.toString();
  return request<Transaction[]>(`/api/transactions${queryString ? `?${queryString}` : ''}`);
}

export async function createTransaction(data: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_icon'>): Promise<Transaction> {
  return request<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id: number, data: Partial<Omit<Transaction, 'id' | 'created_at'>>): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  await request(`/api/transactions/${id}`, {
    method: 'DELETE',
  });
}

// ========== Stats API ==========

export async function getStats(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<Stats> {
  const query = new URLSearchParams();
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);

  const queryString = query.toString();
  return request<Stats>(`/api/stats${queryString ? `?${queryString}` : ''}`);
}

export async function getMonthlyStats(): Promise<MonthlyStats[]> {
  return request<MonthlyStats[]>('/api/stats/monthly');
}
