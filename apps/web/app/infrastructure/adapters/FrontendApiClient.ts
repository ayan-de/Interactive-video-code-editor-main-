import { ApiClient } from '../../core/application/ApiClient';

export class FrontendApiClient implements ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    url: string,
    method: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    let fullUrl = `${this.baseUrl}${url}`;

    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams(
        params as Record<string, string>
      ).toString();
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + query;
    }

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return response.json();
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.makeRequest<T>(url, 'GET', undefined, params);
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>(url, 'POST', data);
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>(url, 'PUT', data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.makeRequest<T>(url, 'DELETE');
  }

  async patch<T>(url: string, data: unknown): Promise<T> {
    return this.makeRequest<T>(url, 'PATCH', data);
  }
}
