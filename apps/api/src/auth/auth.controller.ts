import { Controller, Get, Req, Res, UseGuards, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  async getGoogleAuthUrl() {
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${process.env.GOOGLE_CALLBACK_URL}` +
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

    if (error) {
      // Redirect to frontend with error
      return res.redirect(
        `http://localhost:3000/auth/callback?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      // Redirect to frontend with error
      return res.redirect(
        'http://localhost:3000/auth/callback?error=missing_code'
      );
    }

    try {
      const user = await this.authService.handleGoogleCallback(code);

      // Store user in session
      (req.session as any).user = user;

      // Redirect to frontend with success and user data
      const userData = encodeURIComponent(JSON.stringify(user));
      return res.redirect(
        `http://localhost:3000/auth/callback?success=true&user=${userData}`
      );
    } catch (error) {
      // Redirect to frontend with error
      return res.redirect(
        `http://localhost:3000/auth/callback?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = (req.session as any).user;

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
    const user = (req.session as any).user;
    return {
      isAuthenticated: !!user,
      user: user || null,
    };
  }
}
