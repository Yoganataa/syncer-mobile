import { Platform } from 'react-native';
import log from './logger';

const apiLog = log.extend('API');

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://syncer-5c6f6cef5712.herokuapp.com/api/v1';
const TOKEN_KEY = 'auth_token';
const REQUEST_TIMEOUT = 15_000;

const isWeb = Platform.OS === 'web';

export async function setToken(token: string) {
  if (isWeb) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(TOKEN_KEY);
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken() {
  if (isWeb) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

class ApiClient {
  private base: string;

  constructor(base: string) {
    this.base = base;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const start = Date.now();

    try {
      apiLog.debug(`${method} ${path}`);

      const token = await getToken();
      const headers: Record<string, string> = {
        'Accept-Encoding': 'gzip',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${this.base}${path}`, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const ms = Date.now() - start;

      if (res.status === 401) {
        apiLog.warn(`401 ${method} ${path} — auto-logout`);
        await removeToken();
        throw new ApiClientError('Unauthorized', 401);
      }

      if (res.status === 204) {
        apiLog.debug(`${res.status} ${method} ${path} (${ms}ms)`);
        return undefined as T;
      }

      const data = await res.json();
      if (!res.ok) {
        const detail = (data as { detail?: string }).detail ?? 'Unknown error';
        apiLog.error(`${res.status} ${method} ${path}: ${detail} (${ms}ms)`);
        throw new ApiClientError(detail, res.status);
      }

      apiLog.debug(`${res.status} ${method} ${path} (${ms}ms)`);
      return data as T;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      apiLog.error(`${method} ${path} failed: ${(err as Error).message} (${Date.now() - start}ms)`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiClientError';
  }
}

export const api = new ApiClient(API_BASE);
