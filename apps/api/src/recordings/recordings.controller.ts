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
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordingsService } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { readTantricaBuffer, writeTantricaBuffer } from '@repo/openscrim-core';
import type { TantricaFile } from '@repo/openscrim-core';

@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  async create(@Req() req: Request, @Body() dto: CreateRecordingDto) {
    const userId = req.session!.user!._id;
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
    const userId = req.session!.user!._id;
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

    const userId = req.session!.user!._id;

    let parsed: TantricaFile;
    try {
      parsed = readTantricaBuffer(file.buffer);
    } catch (e: any) {
      return {
        status: 400,
        code: 'BAD_REQUEST',
        message: `Failed to parse file: ${e.message}`,
      };
    }

    const dto: CreateRecordingDto = {
      title: parsed.metadata?.title ?? file.originalname,
      description: parsed.metadata?.description,
      language: parsed.metadata?.language ?? 'javascript',
      duration: parsed.metadata?.duration ?? 0,
      eventCount: parsed.metadata?.eventCount ?? 0,
      initialContent: parsed.initialContent ?? '',
      finalContent: parsed.finalContent ?? '',
      editorConfig: parsed.editorConfig ?? {
        fontSize: 14,
        tabSize: 2,
        theme: 'vs-dark',
        wordWrap: true,
      },
      tags: parsed.metadata?.tags ?? [],
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
    const userId = req.session!.user!._id;
    const recording = await this.recordingsService.findOne(id, userId);
    const events = await this.recordingsService.getAllEvents(id);

    const file: TantricaFile = {
      version: 1,
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
      events: events as TantricaFile['events'],
    };

    const tantricaFile = writeTantricaBuffer(file);

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
    const userId = req.session!.user!._id;
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
    const userId = req.session!.user!._id;
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
