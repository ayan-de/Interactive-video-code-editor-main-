import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      picture?: string;
      email: string;
      provider: string;
      providerId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    _id?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    provider?: string;
    providerId?: string;
  }
}
