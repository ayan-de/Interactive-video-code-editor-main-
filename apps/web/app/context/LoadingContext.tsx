'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const showLoading = (message: string = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
    setNotification({ type: null, message: '' });
  };

  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage('');
  };

  const showSuccess = (message: string, duration: number = 3000) => {
    setIsLoading(false);
    setLoadingMessage('');
    setNotification({ type: 'success', message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, duration);
  };

  const showError = (message: string, duration: number = 4000) => {
    setIsLoading(false);
    setLoadingMessage('');
    setNotification({ type: 'error', message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, duration);
  };

  const value: LoadingContextType = {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    showSuccess,
    showError,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {/* Loading Overlay */}
      {(isLoading || notification.type) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

          {/* Loading Card */}
          {isLoading && (
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center max-w-sm mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {loadingMessage}
              </h2>
              <p className="text-white/70">
                Please wait while we complete your request.
              </p>
            </div>
          )}

          {/* Success Card */}
          {notification.type === 'success' && (
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center max-w-sm mx-4">
              <div className="text-green-400 mb-4">
                <svg
                  className="h-12 w-12 mx-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Success!
              </h2>
              <p className="text-white/70">{notification.message}</p>
            </div>
          )}

          {/* Error Card */}
          {notification.type === 'error' && (
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center max-w-sm mx-4">
              <div className="text-red-400 mb-4">
                <svg
                  className="h-12 w-12 mx-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
              <p className="text-white/70">{notification.message}</p>
            </div>
          )}
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
