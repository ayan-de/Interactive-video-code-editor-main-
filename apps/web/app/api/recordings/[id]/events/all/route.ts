import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getAllEvents } from '@/lib/recordingsService';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  try {
    const { id } = await params;
    const events = await getAllEvents(id);
    return NextResponse.json({
      status: 200,
      code: 'SUCCESS',
      message: 'All events retrieved successfully',
      data: { events, total: events.length },
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
