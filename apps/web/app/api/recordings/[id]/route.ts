import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import {
  findOneRecording,
  updateRecording,
  deleteRecording,
} from '@/lib/recordingsService';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?._id;
  await connectToDatabase();

  try {
    const { id } = await params;
    const recording = await findOneRecording(id, userId);
    return NextResponse.json({
      status: 200,
      code: 'SUCCESS',
      message: 'Recording retrieved successfully',
      data: recording,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const status = msg === 'Recording not found' ? 404 : 403;
    return NextResponse.json(
      { status, code: 'ERROR', message: msg },
      { status }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return NextResponse.json(
      { status: 401, code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  await connectToDatabase();

  try {
    const { id } = await params;
    const dto = await request.json();
    const recording = await updateRecording(id, session.user._id, dto);
    return NextResponse.json({
      status: 200,
      code: 'SUCCESS',
      message: 'Recording updated successfully',
      data: recording,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const status = msg === 'Recording not found' ? 404 : 403;
    return NextResponse.json(
      { status, code: 'ERROR', message: msg },
      { status }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return NextResponse.json(
      { status: 401, code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  await connectToDatabase();

  try {
    const { id } = await params;
    await deleteRecording(id, session.user._id);
    return NextResponse.json({
      status: 200,
      code: 'SUCCESS',
      message: 'Recording deleted successfully',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const status = msg === 'Recording not found' ? 404 : 403;
    return NextResponse.json(
      { status, code: 'ERROR', message: msg },
      { status }
    );
  }
}
