import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecordingEventDocument = RecordingEventBatch & Document;

@Schema({ timestamps: true })
export class RecordingEventBatch {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Recording', index: true })
  recordingId: Types.ObjectId;

  @Prop({ required: true })
  sequenceIndex: number;

  @Prop({ required: true, type: [{}] })
  events: Record<string, any>[];
}

export const RecordingEventSchema =
  SchemaFactory.createForClass(RecordingEventBatch);
