'use client';

import { useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { get, post } from '../lib/api';
import type { GoogleAuthUrl, AuthResponse } from '../types/auth';

export function useAuth() {
  const { user, isLoading, login, logout: contextLogout } = useUser();

  const initiateGoogleLogin = useCallback(async () => {
    const response = await get<GoogleAuthUrl>('/auth/google');
    if (response.data?.authUrl) {
      window.location.href = response.data.authUrl;
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const response = await get<AuthResponse>('/auth/profile');
    if (response.data?.user) {
      login(response.data.user);
      return response.data.user;
    }
    return null;
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await post('/auth/logout');
    } catch {
      // still clear locally even if server call fails
    }
    contextLogout();
  }, [contextLogout]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    initiateGoogleLogin,
    fetchProfile,
    logout,
  };
}
