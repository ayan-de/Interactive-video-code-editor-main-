import { NextRequest, NextResponse } from 'next/server';
import { ExternalApiClient } from '@/infrastructure/adapters/ExternalApiClient';
import { getForwardedHeaders } from '@/shared/helper/getForwardedHeaders';

export async function GET(request: NextRequest) {
  try {
    const headers = getForwardedHeaders(request);
    const data = await ExternalApiClient.get('/auth/google', {}, headers);
    return NextResponse.json(data);
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
        message: 'Failed to get Google auth URL',
        error: 'Internal Error',
      },
      { status: 500 }
    );
  }
}
