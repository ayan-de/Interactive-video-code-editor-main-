import { NextRequest, NextResponse } from 'next/server';
import { ExternalApiClient } from '@/infrastructure/adapters/ExternalApiClient';
import { getForwardedHeaders } from '@/shared/helper/getForwardedHeaders';

export async function POST(request: NextRequest) {
  try {
    const headers = getForwardedHeaders(request);
    await ExternalApiClient.post('/auth/logout', {}, headers);

    return NextResponse.json({
      status: 200,
      code: 'SUCCESS',
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      'code' in error &&
      'message' in error &&
      'error' in error
    ) {
      return NextResponse.json(error, { status: error.status });
    }

    // Fallback for unknown errors
    return NextResponse.json(
      {
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'Logout failed',
        error: 'Internal Error',
      },
      { status: 500 }
    );
  }
}
