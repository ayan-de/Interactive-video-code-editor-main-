'use client';

import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';
import { useLoading } from '../context/LoadingContext';
import UserMenu from './UserMenu';

export interface NavbarProps {
  mainText: string;
}

export default function Navbar({ mainText }: NavbarProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { showLoading, showError } = useLoading();

  const handleSignUp = async () => {
    try {
      showLoading('Redirecting to Google...');
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      if (data.data?.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        showError('Failed to get Google auth URL');
      }
    } catch (error) {
      console.error('Failed to initiate Google login:', error);
      showError('Failed to initiate Google login');
    }
  };

  return (
    <div className="w-full flex justify-center pt-3 md:pt-6 px-3 md:px-6">
      <nav className="flex justify-between items-center backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-3 md:px-6 py-2 md:py-3 max-w-2xl w-full">
        <div className="flex items-center">
          <h2 className="text-lg md:text-xl font-bold text-white">
            {mainText}
          </h2>
        </div>
        <div className="flex gap-1 md:gap-2 items-center">
          {isLoading ? (
            <div className="w-8 h-8 animate-pulse bg-white/20 rounded-full"></div>
          ) : isAuthenticated && user ? (
            <UserMenu user={user} />
          ) : (
            <Button
              onClick={handleSignUp}
              size="sm"
              className="bg-white text-black hover:bg-gray-100 px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 cursor-pointer"
            >
              Sign Up
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
