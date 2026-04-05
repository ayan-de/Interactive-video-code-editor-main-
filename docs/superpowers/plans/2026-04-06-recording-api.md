# Phase 1.3 — Recording API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Recording CRUD API with event streaming and file upload endpoints.

**Architecture:** NestJS REST API with Mongoose ODM. Recordings are stored in MongoDB with events batched in a separate collection (~100 events per document). Session-based auth protects all endpoints. File uploads use Multer.

**Tech Stack:** NestJS 10, Mongoose 9, Multer, zlib (Node built-in)

---

## File Structure

| Action | File                                                  | Purpose                 |
| ------ | ----------------------------------------------------- | ----------------------- |
| Create | `apps/api/src/common/guards/session-auth.guard.ts`    | Session auth guard      |
| Create | `apps/api/src/recordings/dto/create-recording.dto.ts` | Create recording DTO    |
| Create | `apps/api/src/recordings/dto/update-recording.dto.ts` | Update recording DTO    |
| Create | `apps/api/src/recordings/recordings.service.ts`       | Business logic          |
| Create | `apps/api/src/recordings/recordings.controller.ts`    | REST endpoints          |
| Create | `apps/api/src/recordings/recordings.module.ts`        | NestJS module           |
| Modify | `apps/api/src/app.module.ts`                          | Import RecordingsModule |

---

### Task 1: Install dependencies

**Files:**

- Modify: `apps/api/package.json`

- [ ] **Step 1: Install multer**

Run: `pnpm add multer && pnpm add -D @types/multer --filter @repo/api`
(from repo root)

- [ ] **Step 2: Verify install**

Run: `pnpm ls multer --filter @repo/api`
Expected: `multer x.x.x` listed

---

### Task 2: Create session auth guard

**Files:**

- Create: `apps/api/src/common/guards/session-auth.guard.ts`

- [ ] **Step 1: Create the guard**

```typescript
// apps/api/src/common/guards/session-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.session?.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    return true;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit --project apps/api/tsconfig.json`
Expected: no errors

---

### Task 3: Create DTOs

**Files:**

- Create: `apps/api/src/recordings/dto/create-recording.dto.ts`
- Create: `apps/api/src/recordings/dto/update-recording.dto.ts`

- [ ] **Step 1: Create create-recording.dto.ts**

```typescript
// apps/api/src/recordings/dto/create-recording.dto.ts
export interface EditorConfigDto {
  fontSize: number;
  tabSize: number;
  theme: string;
  wordWrap: boolean;
}

export interface CreateRecordingDto {
  title: string;
  description?: string;
  language: string;
  duration: number;
  eventCount: number;
  initialContent?: string;
  finalContent?: string;
  editorConfig?: EditorConfigDto;
  tags?: string[];
  isPublic?: boolean;
  events: Record<string, any>[];
}
```

- [ ] **Step 2: Create update-recording.dto.ts**

```typescript
// apps/api/src/recordings/dto/update-recording.dto.ts
export interface UpdateRecordingDto {
  title?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm exec tsc --noEmit --project apps/api/tsconfig.json`
Expected: no errors

---

### Task 4: Create recordings service

**Files:**

- Create: `apps/api/src/recordings/recordings.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// apps/api/src/recordings/recordings.service.ts
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
    const totalBatches = await this.eventBatchModel
      .countDocuments({ recordingId: new Types.ObjectId(recordingId) })
      .exec();

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
```

- [ ] **Step 2: Verify compilation**

Run: `pnpm exec tsc --noEmit --project apps/api/tsconfig.json`
Expected: no errors

---

### Task 5: Create recordings controller

**Files:**

- Create: `apps/api/src/recordings/recordings.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// apps/api/src/recordings/recordings.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';

declare module 'express-session' {
  interface SessionData {
    user?: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      picture?: string;
      provider: 'google';
      providerId: string;
    };
  }
}

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(@Req() req: Request, @Body() dto: CreateRecordingDto) {
    const userId = req.session.user!._id;
    const recording = await this.recordingsService.create(userId, dto);
    return {
      status: 201,
      code: 'CREATED',
      message: 'Recording created successfully',
      data: recording,
    };
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.session.user!._id;
    const result = await this.recordingsService.findAll(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Recordings retrieved successfully',
      data: result,
    };
  }

  @Get('public')
  async findPublic(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const result = await this.recordingsService.findPublic(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Public recordings retrieved successfully',
      data: result,
    };
  }

  @Post('upload')
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined
  ) {
    if (!file) {
      return {
        status: 400,
        code: 'BAD_REQUEST',
        message: 'No file uploaded',
      };
    }

    const userId = req.session.user!._id;

    let parsed: any;
    try {
      const buffer = file.buffer;
      if (
        buffer[0] === 0x54 &&
        buffer[1] === 0x4e &&
        buffer[2] === 0x54 &&
        buffer[3] === 0x43
      ) {
        const headerLength = buffer.readUInt32BE(6);
        const headerJson = buffer
          .slice(10, 10 + headerLength)
          .toString('utf-8');
        const header = JSON.parse(headerJson);

        const zlib = require('zlib');
        const compressedData = buffer.slice(10 + headerLength);
        const decompressed = zlib.gunzipSync(compressedData);
        parsed = JSON.parse(decompressed.toString('utf-8'));
      } else {
        parsed = JSON.parse(buffer.toString('utf-8'));
      }
    } catch (e: any) {
      return {
        status: 400,
        code: 'BAD_REQUEST',
        message: `Failed to parse file: ${e.message}`,
      };
    }

    const dto: CreateRecordingDto = {
      title: parsed.metadata?.title ?? parsed.title ?? file.originalname,
      description: parsed.metadata?.description ?? parsed.description,
      language: parsed.metadata?.language ?? parsed.language ?? 'javascript',
      duration: parsed.metadata?.duration ?? parsed.duration ?? 0,
      eventCount: parsed.metadata?.eventCount ?? parsed.eventCount ?? 0,
      initialContent: parsed.initialContent ?? '',
      finalContent: parsed.finalContent ?? '',
      editorConfig: parsed.editorConfig ?? {
        fontSize: 14,
        tabSize: 2,
        theme: 'vs-dark',
        wordWrap: true,
      },
      tags: parsed.metadata?.tags ?? parsed.tags ?? [],
      isPublic: false,
      events: parsed.events ?? [],
    };

    const recording = await this.recordingsService.create(userId, dto);

    return {
      status: 201,
      code: 'CREATED',
      message: 'Recording uploaded successfully',
      data: recording,
    };
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const userId = req.session?.user?._id;
    const recording = await this.recordingsService.findOne(id, userId);
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Recording retrieved successfully',
      data: recording,
    };
  }

  @Get(':id/events')
  async getEvents(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('limit') limit?: string
  ) {
    const result = await this.recordingsService.getEvents(
      id,
      from ? parseInt(from, 10) : 0,
      limit ? parseInt(limit, 10) : 5000
    );
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Events retrieved successfully',
      data: result,
    };
  }

  @Get(':id/events/all')
  async getAllEvents(@Param('id') id: string) {
    const events = await this.recordingsService.getAllEvents(id);
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'All events retrieved successfully',
      data: { events, total: events.length },
    };
  }

  @Get(':id/download')
  @UseGuards(SessionAuthGuard)
  async download(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string
  ) {
    const userId = req.session.user!._id;
    const recording = await this.recordingsService.findOne(id, userId);
    const events = await this.recordingsService.getAllEvents(id);

    const payload = {
      version: 1 as const,
      metadata: {
        id: recording._id.toString(),
        title: recording.title,
        description: recording.description,
        author: {
          id: recording.userId.toString(),
          name: '',
        },
        language: recording.language,
        duration: recording.duration,
        eventCount: recording.eventCount,
        createdAt: recording.createdAt.toISOString(),
        tags: recording.tags,
      },
      initialContent: recording.initialContent,
      finalContent: recording.finalContent,
      editorConfig: recording.editorConfig,
      events,
    };

    const zlib = require('zlib');
    const jsonStr = JSON.stringify(payload);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));

    const headerJson = JSON.stringify(payload.metadata);
    const headerBuf = Buffer.from(headerJson, 'utf-8');

    const magic = Buffer.from('TNTC', 'ascii');
    const version = Buffer.alloc(2);
    version.writeUInt16BE(1, 0);
    const headerLen = Buffer.alloc(4);
    headerLen.writeUInt32BE(headerBuf.length, 0);

    const tantricaFile = Buffer.concat([
      magic,
      version,
      headerLen,
      headerBuf,
      compressed,
    ]);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.tantrica"`
    );
    res.setHeader('Content-Length', tantricaFile.length);
    res.send(tantricaFile);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRecordingDto
  ) {
    const userId = req.session.user!._id;
    const recording = await this.recordingsService.update(id, userId, dto);
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Recording updated successfully',
      data: recording,
    };
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = req.session.user!._id;
    await this.recordingsService.remove(id, userId);
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Recording deleted successfully',
    };
  }

  @Post(':id/play')
  async incrementPlayCount(@Param('id') id: string) {
    await this.recordingsService.incrementPlayCount(id);
    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Play count incremented',
    };
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `pnpm exec tsc --noEmit --project apps/api/tsconfig.json`
Expected: no errors

---

### Task 6: Create recordings module and wire up

**Files:**

- Create: `apps/api/src/recordings/recordings.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create recordings.module.ts**

```typescript
// apps/api/src/recordings/recordings.module.ts
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
```

- [ ] **Step 2: Update app.module.ts to import RecordingsModule**

Add `RecordingsModule` to the imports array:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RecordingsModule } from './recordings/recordings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    RecordingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build --filter @repo/api`
Expected: successful build

---

### Task 7: Lint and typecheck

- [ ] **Step 1: Run lint**

Run: `pnpm lint --filter @repo/api`
Expected: no errors

- [ ] **Step 2: Run typecheck**

Run: `pnpm check-types --filter @repo/api`
Expected: no errors

---

## Self-Review

### Spec coverage check:

- [x] POST `/recordings` — create endpoint (Task 5)
- [x] GET `/recordings` — list user recordings paginated (Task 5)
- [x] GET `/recordings/:id` — get metadata (Task 5)
- [x] GET `/recordings/:id/events` — paginated events (Task 5)
- [x] GET `/recordings/:id/events/all` — all events (Task 5)
- [x] DELETE `/recordings/:id` — delete (Task 5)
- [x] PATCH `/recordings/:id` — update metadata (Task 5)
- [x] POST `/recordings/upload` — upload .tantrica file (Task 5)
- [x] GET `/recordings/:id/download` — download as .tantrica (Task 5)
- [x] Auth protection on all mutation endpoints (Tasks 2, 5)
- [x] Event batching (~100 per document) (Task 4)

### Placeholder scan:

- No TBDs, TODOs, or placeholders found.

### Type consistency:

- `CreateRecordingDto` used in service and controller — consistent.
- `UpdateRecordingDto` used in service and controller — consistent.
- `RecordingDocument` and `RecordingEventDocument` types used consistently.
- Session user type declared in controller matches auth controller.
