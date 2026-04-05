import { Controller, Get, Req, Res, Post } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      picture?: string;
      provider: 'google';
      providerId: string;
      createdAt: string;
      updatedAt: string;
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('google')
  async getGoogleAuthUrl() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL');
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=profile email` +
      `&access_type=offline`;

    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Google auth URL generated',
      data: {
        authUrl,
      },
    };
  }

  @Get('google/callback')
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (error) {
      return res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/auth/callback?error=missing_code`);
    }

    try {
      const user = await this.authService.handleGoogleCallback(code);

      req.session.user = user;

      return res.redirect(`${frontendUrl}/auth/callback?success=true`);
    } catch (err: any) {
      return res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(err.message)}`
      );
    }
  }

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = req.session.user;

    if (!user) {
      return {
        status: 401,
        code: 'NOT_AUTHENTICATED',
        message: 'Not authenticated',
        error: 'Unauthorized',
      };
    }

    return {
      status: 200,
      code: 'SUCCESS',
      message: 'Profile retrieved successfully',
      data: {
        user,
        accessToken: 'session-based',
      },
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          status: 500,
          code: 'LOGOUT_FAILED',
          message: 'Could not log out',
          error: 'Internal Server Error',
        });
      }
      res.clearCookie('connect.sid');
      res.json({
        status: 200,
        code: 'SUCCESS',
        message: 'Logged out successfully',
      });
    });
  }

  @Get('status')
  async getAuthStatus(@Req() req: Request) {
    const user = req.session.user;
    return {
      isAuthenticated: !!user,
      user: user ?? null,
    };
  }
}
