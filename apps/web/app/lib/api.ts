import { USER_STORAGE_KEY } from '@/lib/constants';

interface RequestOptions extends RequestInit {
  skipRedirectOn401?: boolean;
}

async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipRedirectOn401, ...fetchOptions } = options;
  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (response.status === 401 && !skipRedirectOn401) {
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

export async function get<T>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, { ...options, method: 'GET' });
}

export async function post<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function put<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function patch<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function del<T>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  return request<T>(url, { ...options, method: 'DELETE' });
}
