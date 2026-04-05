import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from '../schemas/user.schema';
import { Recording, RecordingSchema } from '../schemas/recording.schema';
import {
  RecordingEventBatch,
  RecordingEventSchema,
} from '../schemas/recording-event.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Recording.name, schema: RecordingSchema },
      { name: RecordingEventBatch.name, schema: RecordingEventSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
