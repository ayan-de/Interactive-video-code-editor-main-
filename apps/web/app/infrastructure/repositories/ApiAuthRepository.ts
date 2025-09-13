import { AuthRepository } from '../../core/domain/repositories/AuthRepository';
import { AuthResponse, GoogleAuthUrl } from '../../types/auth';
import { ApiClient } from '../../core/application/ApiClient';

export class ApiAuthRepository implements AuthRepository {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async getGoogleAuthUrl(): Promise<GoogleAuthUrl> {
    return this.apiClient.get<GoogleAuthUrl>('/api/auth/google');
  }

  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    // This method is no longer needed since backend handles callback directly
    // But we'll keep it for backwards compatibility
    return this.apiClient.get<AuthResponse>('/api/auth/google/callback', {
      code,
    });
  }

  async getProfile(): Promise<AuthResponse> {
    return this.apiClient.get<AuthResponse>('/api/auth/profile');
  }

  async logout(): Promise<void> {
    await this.apiClient.post('/api/auth/logout');
  }
}
