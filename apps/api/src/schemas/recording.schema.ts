import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecordingDocument = Recording & Document;

@Schema({ timestamps: true })
export class Recording {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  eventCount: number;

  @Prop({ default: 0 })
  fileSize: number;

  @Prop({ default: '' })
  initialContent: string;

  @Prop({ default: '' })
  finalContent: string;

  @Prop({
    _id: false,
    type: {
      fontSize: { type: Number, default: 14 },
      tabSize: { type: Number, default: 2 },
      theme: { type: String, default: 'vs-dark' },
      wordWrap: { type: Boolean, default: true },
    },
  })
  editorConfig: {
    fontSize: number;
    tabSize: number;
    theme: string;
    wordWrap: boolean;
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: 0 })
  playCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const RecordingSchema = SchemaFactory.createForClass(Recording);
