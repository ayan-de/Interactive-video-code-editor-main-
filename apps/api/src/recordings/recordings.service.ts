import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recording, RecordingDocument } from '../schemas/recording.schema';
import {
  RecordingEventBatch,
  RecordingEventDocument,
} from '../schemas/recording-event.schema';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';

const EVENTS_PER_BATCH = 100;

@Injectable()
export class RecordingsService {
  constructor(
    @InjectModel(Recording.name)
    private recordingModel: Model<RecordingDocument>,
    @InjectModel(RecordingEventBatch.name)
    private eventBatchModel: Model<RecordingEventDocument>
  ) {}

  async create(
    userId: string,
    dto: CreateRecordingDto
  ): Promise<RecordingDocument> {
    const recording = await this.recordingModel.create({
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
      await this.storeEvents(recording._id as Types.ObjectId, dto.events);
    }

    return recording;
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ recordings: RecordingDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [recordings, total] = await Promise.all([
      this.recordingModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.recordingModel
        .countDocuments({ userId: new Types.ObjectId(userId) })
        .exec(),
    ]);
    return { recordings, total };
  }

  async findOne(id: string, userId?: string): Promise<RecordingDocument> {
    const recording = await this.recordingModel.findById(id).exec();
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }
    if (
      !recording.isPublic &&
      userId &&
      recording.userId.toString() !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }
    return recording;
  }

  async findPublic(
    page = 1,
    limit = 20
  ): Promise<{ recordings: RecordingDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [recordings, total] = await Promise.all([
      this.recordingModel
        .find({ isPublic: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.recordingModel.countDocuments({ isPublic: true }).exec(),
    ]);
    return { recordings, total };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateRecordingDto
  ): Promise<RecordingDocument> {
    const recording = await this.recordingModel.findById(id).exec();
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }
    if (recording.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }
    Object.assign(recording, dto);
    return recording.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const recording = await this.recordingModel.findById(id).exec();
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }
    if (recording.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await Promise.all([
      this.eventBatchModel.deleteMany({ recordingId: recording._id }).exec(),
      this.recordingModel.deleteOne({ _id: recording._id }).exec(),
    ]);
  }

  async getEvents(
    recordingId: string,
    from = 0,
    limit = 5000
  ): Promise<{ events: Record<string, any>[]; total: number }> {
    const recording = await this.recordingModel.findById(recordingId).exec();
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const fromBatch = Math.floor(from / EVENTS_PER_BATCH);

    const batchesNeeded = Math.ceil(limit / EVENTS_PER_BATCH) + 1;
    const batches = await this.eventBatchModel
      .find({ recordingId: new Types.ObjectId(recordingId) })
      .sort({ sequenceIndex: 1 })
      .skip(fromBatch)
      .limit(batchesNeeded)
      .exec();

    const allEvents: Record<string, any>[] = [];
    for (const batch of batches) {
      allEvents.push(...batch.events);
    }

    const sliced = allEvents.slice(
      from % EVENTS_PER_BATCH,
      (from % EVENTS_PER_BATCH) + limit
    );

    return {
      events: sliced,
      total: recording.eventCount,
    };
  }

  async getAllEvents(recordingId: string): Promise<Record<string, any>[]> {
    const recording = await this.recordingModel.findById(recordingId).exec();
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const batches = await this.eventBatchModel
      .find({ recordingId: new Types.ObjectId(recordingId) })
      .sort({ sequenceIndex: 1 })
      .exec();

    const events: Record<string, any>[] = [];
    for (const batch of batches) {
      events.push(...batch.events);
    }
    return events;
  }

  async incrementPlayCount(id: string): Promise<void> {
    await this.recordingModel
      .updateOne({ _id: new Types.ObjectId(id) }, { $inc: { playCount: 1 } })
      .exec();
  }

  private async storeEvents(
    recordingId: Types.ObjectId,
    events: Record<string, any>[]
  ): Promise<void> {
    const batches: Partial<RecordingEventDocument>[] = [];
    for (let i = 0; i < events.length; i += EVENTS_PER_BATCH) {
      const chunk = events.slice(i, i + EVENTS_PER_BATCH);
      batches.push({
        recordingId,
        sequenceIndex: Math.floor(i / EVENTS_PER_BATCH),
        events: chunk,
      });
    }
    if (batches.length > 0) {
      await this.eventBatchModel.insertMany(batches);
    }
  }
}
