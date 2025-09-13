'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { useLoading } from '../../context/LoadingContext';

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useUser();
  const { showSuccess, showError } = useLoading();

  const errorParam = searchParams.get('error');
  const successParam = searchParams.get('success');
  const userDataParam = searchParams.get('user');

  useEffect(() => {
    const processCallback = () => {
      console.log('Processing callback...');

      console.log('Callback params:', {
        error: errorParam,
        success: successParam,
        userDataParam: !!userDataParam,
      });

      if (errorParam) {
        console.log('Auth error:', errorParam);
        const errorMessage =
          errorParam === 'missing_code'
            ? 'No authorization code received'
            : decodeURIComponent(errorParam);
        showError(errorMessage);
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      if (successParam && userDataParam) {
        try {
          console.log('Processing user data...');
          const userData = JSON.parse(decodeURIComponent(userDataParam));
          console.log('User data parsed:', userData);
          login(userData);
          showSuccess('You have been signed in successfully!');
          setTimeout(() => router.push('/'), 1500);
        } catch (err: any) {
          console.error('Failed to parse user data:', err);
          showError('Failed to process authentication data');
          setTimeout(() => router.push('/'), 3000);
        }
        return;
      }

      // If we get here, redirect immediately
      console.log('No valid params, redirecting to home');
      router.push('/');
    };

    processCallback();
  }, [errorParam, successParam, userDataParam]);

  // Return nothing - completely transparent
  return null;
}
