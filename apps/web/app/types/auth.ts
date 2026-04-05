export type { User } from '@repo/types';

export interface AuthResponse {
  status: number;
  code: string;
  message: string;
  data: {
    user: User;
    accessToken: string;
  };
}

export interface GoogleAuthUrl {
  status: number;
  code: string;
  message: string;
  data: {
    authUrl: string;
  };
}
