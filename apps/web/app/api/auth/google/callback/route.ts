import { NextRequest, NextResponse } from 'next/server';
import { ExternalApiClient } from '@/infrastructure/adapters/ExternalApiClient';
import { getForwardedHeaders } from '@/shared/helper/getForwardedHeaders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_CODE',
          message: 'Authorization code is required',
          error: 'Bad Request',
        },
        { status: 400 }
      );
    }

    const headers = getForwardedHeaders(request);
    const data = await ExternalApiClient.get(
      '/auth/google/callback',
      { code },
      headers
    );

    // Create response with user data
    const response = NextResponse.json(data);

    // If the backend returns cookies, forward them
    return response;
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
        message: 'Failed to handle Google callback',
        error: 'Internal Error',
      },
      { status: 500 }
    );
  }
}
