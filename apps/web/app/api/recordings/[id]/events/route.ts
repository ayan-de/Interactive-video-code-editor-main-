import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getEvents } from '@/lib/recordingsService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const from = parseInt(searchParams.get('from') ?? '0', 10);
  const limit = parseInt(searchParams.get('limit') ?? '5000', 10);

  try {
    const { id } = await params;
    const result = await getEvents(id, from, limit);
    return NextResponse.json({
      status: 200,
      code: 'SUCCESS',
      message: 'Events retrieved successfully',
      data: result,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        status: 404,
        code: 'NOT_FOUND',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 404 }
    );
  }
}
