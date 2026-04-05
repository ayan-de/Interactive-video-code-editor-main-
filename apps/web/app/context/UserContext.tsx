'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import type { User } from '../types/auth';
import { get } from '@/lib/api';
import { USER_STORAGE_KEY } from '@/lib/constants';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasValidated = useRef(false);

  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const validateSession = async () => {
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        const profile = await get<{ user: User }>('/auth/profile').catch(
          () => null
        );

        if (profile?.user) {
          setUser(profile.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile.user));
        } else if (storedUser) {
          localStorage.removeItem(USER_STORAGE_KEY);
          setUser(null);
        }
      } catch {
        try {
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } catch {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Error removing user from localStorage:', error);
    }
  };

  const value: UserContextType = {
    user,
    isLoading,
    login,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
