'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { useLoading } from '../../context/LoadingContext';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useUser();
  const { showSuccess, showError } = useLoading();

  const errorParam = searchParams.get('error');
  const successParam = searchParams.get('success');

  useEffect(() => {
    const processCallback = async () => {
      if (errorParam) {
        const errorMessage =
          errorParam === 'missing_code'
            ? 'No authorization code received'
            : decodeURIComponent(errorParam);
        showError(errorMessage);
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      if (successParam) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            credentials: 'include',
          });
          const data = await res.json();

          if (!res.ok || !data.data?.user) {
            throw new Error(data.message || 'Failed to fetch user profile');
          }

          login(data.data.user);
          showSuccess('You have been signed in successfully!');
          setTimeout(() => router.push('/'), 1500);
        } catch (err: any) {
          console.error('Failed to fetch user profile:', err);
          showError('Failed to process authentication data');
          setTimeout(() => router.push('/'), 3000);
        }
        return;
      }

      router.push('/');
    };

    processCallback();
  }, [errorParam, successParam, login, showError, showSuccess, router]);

  return null;
}
