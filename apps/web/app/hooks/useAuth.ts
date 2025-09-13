'use client';

import { useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { AuthRepository } from '../core/domain/repositories/AuthRepository';
import { ApiAuthRepository } from '../infrastructure/repositories/ApiAuthRepository';
import { FrontendApiClient } from '../infrastructure/adapters/FrontendApiClient';

const apiClient = new FrontendApiClient();
const authRepository: AuthRepository = new ApiAuthRepository(apiClient);

export function useAuth() {
  const { user, isLoading, login, logout: contextLogout } = useUser();

  const initiateGoogleLogin = useCallback(async () => {
    try {
      const response = await authRepository.getGoogleAuthUrl();
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate Google login:', error);
      throw error;
    }
  }, []);

  const handleGoogleCallback = useCallback(
    async (code: string) => {
      try {
        const response = await authRepository.handleGoogleCallback(code);
        if (response.data?.user) {
          login(response.data.user);
          return response.data.user;
        }
      } catch (error) {
        console.error('Failed to handle Google callback:', error);
        throw error;
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await authRepository.logout();
      contextLogout();
    } catch (error) {
      console.error('Failed to logout:', error);
      // Still logout locally even if server call fails
      contextLogout();
      throw error;
    }
  }, [contextLogout]);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await authRepository.getProfile();
      if (response.data?.user) {
        login(response.data.user);
        return response.data.user;
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  }, [login]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    initiateGoogleLogin,
    handleGoogleCallback,
    logout,
    fetchProfile,
  };
}
