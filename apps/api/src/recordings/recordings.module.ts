import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { Recording, RecordingSchema } from '../schemas/recording.schema';
import {
  RecordingEventBatch,
  RecordingEventSchema,
} from '../schemas/recording-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recording.name, schema: RecordingSchema },
      { name: RecordingEventBatch.name, schema: RecordingEventSchema },
    ]),
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
