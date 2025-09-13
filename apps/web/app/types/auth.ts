export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  provider: 'google';
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

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
