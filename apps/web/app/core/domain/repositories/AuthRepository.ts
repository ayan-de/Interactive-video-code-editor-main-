import { AuthResponse, GoogleAuthUrl } from '../../../types/auth';

export interface AuthRepository {
  getGoogleAuthUrl(): Promise<GoogleAuthUrl>;
  handleGoogleCallback(code: string): Promise<AuthResponse>;
  getProfile(): Promise<AuthResponse>;
  logout(): Promise<void>;
}
