import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { createRecording, findUserRecordings } from '@/lib/recordingsService';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?._id) {
    return NextResponse.json(
      { status: 401, code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const result = await findUserRecordings(session.user._id, page, limit);
  return NextResponse.json({
    status: 200,
    code: 'SUCCESS',
    message: 'Recordings retrieved successfully',
    data: result,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?._id) {
    return NextResponse.json(
      { status: 401, code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  await connectToDatabase();
  const dto = await request.json();
  const recording = await createRecording(session.user._id, dto);
  return NextResponse.json(
    {
      status: 201,
      code: 'CREATED',
      message: 'Recording created successfully',
      data: recording,
    },
    { status: 201 }
  );
}
