import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { findPublicRecordings } from '@/lib/recordingsService';

export async function GET(request: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const result = await findPublicRecordings(page, limit);
  return NextResponse.json({
    status: 200,
    code: 'SUCCESS',
    message: 'Public recordings retrieved successfully',
    data: result,
  });
}
