'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLoading } from '../../context/LoadingContext';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useLoading();

  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (status === 'loading') return;

    if (errorParam) {
      const errorMessage =
        errorParam === 'missing_code'
          ? 'No authorization code received'
          : decodeURIComponent(errorParam);
      showError(errorMessage);
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    if (session?.user) {
      showSuccess('You have been signed in successfully!');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [session, status, errorParam, showError, showSuccess, router]);

  return null;
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
