import { Schema, model, Types } from 'mongoose';

const RecordingEventSchema = new Schema(
  {
    recordingId: {
      type: Types.ObjectId,
      ref: 'Recording',
      required: true,
      index: true,
    },
    sequenceIndex: { type: Number, required: true },
    events: { type: [{}], required: true },
  },
  { timestamps: true }
);

export default model('RecordingEventBatch', RecordingEventSchema);
