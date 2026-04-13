'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';
import type { User } from '../types/auth';

export function useAuth() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const user: User | null = session?.user
    ? {
        _id: session.user._id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        picture: session.user.picture,
        provider: session.user.provider as 'google',
        providerId: session.user.providerId,
      }
    : null;

  const initiateGoogleLogin = useCallback(async () => {
    await signIn('google', { callbackUrl: '/auth/callback' });
  }, []);

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: '/' });
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    initiateGoogleLogin,
    logout,
  };
}
