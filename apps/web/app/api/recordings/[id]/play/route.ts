import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { incrementPlayCount } from '@/lib/recordingsService';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  const { id } = await params;
  await incrementPlayCount(id);
  return NextResponse.json({
    status: 200,
    code: 'SUCCESS',
    message: 'Play count incremented',
  });
}
