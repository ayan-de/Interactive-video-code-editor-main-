import { USER_STORAGE_KEY } from '@/lib/constants';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem(USER_STORAGE_KEY);
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/' &&
      window.location.pathname !== '/auth/callback'
    ) {
      window.location.href = '/';
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

export async function get<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET' });
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function patch<T>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}
