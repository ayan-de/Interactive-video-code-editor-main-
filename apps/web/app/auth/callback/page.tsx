'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '../../context/UserContext';

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useUser();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const error = searchParams.get('error');
      const success = searchParams.get('success');
      const userDataParam = searchParams.get('user');

      if (error) {
        setStatus('error');
        setError(
          error === 'missing_code' ? 'No authorization code received' : error
        );
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      if (success && userDataParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userDataParam));
          login(userData);
          setStatus('success');
          setTimeout(() => router.push('/'), 1000);
        } catch (err: any) {
          console.error('Failed to parse user data:', err);
          setStatus('error');
          setError('Failed to process authentication data');
          setTimeout(() => router.push('/'), 3000);
        }
        return;
      }

      // Fallback - no success or error parameters
      setStatus('error');
      setError('Invalid callback parameters');
      setTimeout(() => router.push('/'), 3000);
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Signing you in...
            </h2>
            <p className="text-white/70">
              Please wait while we complete your authentication.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
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
            <h2 className="text-xl font-semibold text-white mb-2">Success!</h2>
            <p className="text-white/70">
              You have been signed in successfully. Redirecting...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
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
            <h2 className="text-xl font-semibold text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-white/70 mb-4">{error}</p>
            <p className="text-white/50 text-sm">Redirecting to home page...</p>
          </>
        )}
      </div>
    </div>
  );
}
