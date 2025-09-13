import { config } from '@/config/backend';

export class ExternalApiClient {
  private static buildApiRoute(route: string): string {
    const base = config.backend.apiBaseUrl || 'http://localhost:3001';
    return `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
  }

  static async get<T>(
    route: string,
    params?: Record<string, string | number | boolean>,
    headers: Record<string, string> = {}
  ): Promise<T> {
    let url = this.buildApiRoute(route);

    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      url += (url.includes('?') ? '&' : '?') + query;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  static async post<T>(
    route: string,
    data?: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildApiRoute(route);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  static async put<T>(
    route: string,
    data?: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildApiRoute(route);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  static async delete<T>(
    route: string,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildApiRoute(route);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }

  static async patch<T>(
    route: string,
    data: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildApiRoute(route);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await response.json();
    }

    return response.json();
  }
}
