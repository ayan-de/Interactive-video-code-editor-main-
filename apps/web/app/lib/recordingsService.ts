import { Types } from 'mongoose';
import RecordingModel from './models/Recording';
import RecordingEventBatchModel from './models/RecordingEventBatch';

const EVENTS_PER_BATCH = 100;

export async function createRecording(
  userId: string,
  dto: {
    title: string;
    description?: string;
    language: string;
    duration: number;
    eventCount: number;
    initialContent?: string;
    finalContent?: string;
    editorConfig?: {
      fontSize: number;
      tabSize: number;
      theme: string;
      wordWrap: boolean;
    };
    tags?: string[];
    isPublic?: boolean;
    events?: Record<string, unknown>[];
  }
) {
  const recording = await RecordingModel.create({
    userId: new Types.ObjectId(userId),
    title: dto.title,
    description: dto.description,
    language: dto.language,
    duration: dto.duration,
    eventCount: dto.eventCount,
    initialContent: dto.initialContent ?? '',
    finalContent: dto.finalContent ?? '',
    editorConfig: dto.editorConfig ?? {
      fontSize: 14,
      tabSize: 2,
      theme: 'vs-dark',
      wordWrap: true,
    },
    tags: dto.tags ?? [],
    isPublic: dto.isPublic ?? false,
    fileSize: 0,
  });

  if (dto.events && dto.events.length > 0) {
    await storeEvents(recording._id as Types.ObjectId, dto.events);
  }

  return recording;
}

export async function findUserRecordings(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [recordings, total] = await Promise.all([
    RecordingModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RecordingModel.countDocuments({ userId: new Types.ObjectId(userId) }),
  ]);
  return { recordings, total };
}

export async function findPublicRecordings(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [recordings, total] = await Promise.all([
    RecordingModel.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RecordingModel.countDocuments({ isPublic: true }),
  ]);
  return { recordings, total };
}

export async function findOneRecording(id: string, userId?: string) {
  const recording = await RecordingModel.findById(id);
  if (!recording) {
    throw new Error('Recording not found');
  }
  if (!recording.isPublic && userId && recording.userId.toString() !== userId) {
    throw new Error('Access denied');
  }
  if (!recording.isPublic && !userId) {
    throw new Error('Access denied');
  }
  return recording;
}

export async function updateRecording(
  id: string,
  userId: string,
  dto: {
    title?: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  }
) {
  const recording = await RecordingModel.findById(id);
  if (!recording) throw new Error('Recording not found');
  if (recording.userId.toString() !== userId) throw new Error('Access denied');
  Object.assign(recording, dto);
  await recording.save();
  return recording;
}

export async function deleteRecording(id: string, userId: string) {
  const recording = await RecordingModel.findById(id);
  if (!recording) throw new Error('Recording not found');
  if (recording.userId.toString() !== userId) throw new Error('Access denied');
  await Promise.all([
    RecordingEventBatchModel.deleteMany({ recordingId: recording._id }),
    RecordingModel.deleteOne({ _id: recording._id }),
  ]);
}

export async function getEvents(recordingId: string, from = 0, limit = 5000) {
  const recording = await RecordingModel.findById(recordingId);
  if (!recording) throw new Error('Recording not found');

  const fromBatch = Math.floor(from / EVENTS_PER_BATCH);
  const batchesNeeded = Math.ceil(limit / EVENTS_PER_BATCH) + 1;
  const batches = await RecordingEventBatchModel.find({
    recordingId: new Types.ObjectId(recordingId),
  })
    .sort({ sequenceIndex: 1 })
    .skip(fromBatch)
    .limit(batchesNeeded);

  const allEvents: Record<string, unknown>[] = [];
  for (const batch of batches) {
    allEvents.push(...batch.events);
  }

  const sliced = allEvents.slice(
    from % EVENTS_PER_BATCH,
    (from % EVENTS_PER_BATCH) + limit
  );

  return { events: sliced, total: recording.eventCount };
}

export async function getAllEvents(recordingId: string) {
  const recording = await RecordingModel.findById(recordingId);
  if (!recording) throw new Error('Recording not found');

  const batches = await RecordingEventBatchModel.find({
    recordingId: new Types.ObjectId(recordingId),
  }).sort({ sequenceIndex: 1 });

  const events: Record<string, unknown>[] = [];
  for (const batch of batches) {
    events.push(...batch.events);
  }
  return events;
}

export async function incrementPlayCount(id: string) {
  await RecordingModel.updateOne(
    { _id: new Types.ObjectId(id) },
    { $inc: { playCount: 1 } }
  );
}

async function storeEvents(
  recordingId: Types.ObjectId,
  events: Record<string, unknown>[]
) {
  const batches: {
    recordingId: Types.ObjectId;
    sequenceIndex: number;
    events: Record<string, unknown>[];
  }[] = [];
  for (let i = 0; i < events.length; i += EVENTS_PER_BATCH) {
    const chunk = events.slice(i, i + EVENTS_PER_BATCH);
    batches.push({
      recordingId,
      sequenceIndex: Math.floor(i / EVENTS_PER_BATCH),
      events: chunk,
    });
  }
  if (batches.length > 0) {
    return RecordingEventBatchModel.insertMany(batches);
  }
}
