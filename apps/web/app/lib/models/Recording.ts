import { Schema, model, Types } from 'mongoose';

const RecordingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    language: { type: String, required: true },
    duration: { type: Number, required: true },
    eventCount: { type: Number, required: true },
    fileSize: { type: Number, default: 0 },
    initialContent: { type: String, default: '' },
    finalContent: { type: String, default: '' },
    editorConfig: {
      _id: false,
      type: {
        fontSize: { type: Number, default: 14 },
        tabSize: { type: Number, default: 2 },
        theme: { type: String, default: 'vs-dark' },
        wordWrap: { type: Boolean, default: true },
      },
    },
    tags: { type: [String], default: [] },
    isPublic: { type: Boolean, default: false },
    playCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model('Recording', RecordingSchema);
