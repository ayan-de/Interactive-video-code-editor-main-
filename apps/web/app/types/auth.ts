export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  provider: 'google';
  providerId: string;
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
