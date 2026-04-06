'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { useLoading } from '../../context/LoadingContext';
import { get } from '../../lib/api';
import type { AuthResponse } from '../../types/auth';

function CallbackContent() {
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
          const data = await get<AuthResponse>('/auth/profile');

          if (!data.data?.user) {
            throw new Error('Failed to fetch user profile');
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

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
