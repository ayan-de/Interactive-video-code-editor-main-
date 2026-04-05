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
