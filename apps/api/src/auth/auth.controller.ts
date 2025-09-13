import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // Handle the Google OAuth callback
    const user = req.user;

    if (user) {
      // Store user in session
      (req.session as any).user = user;

      // Redirect to frontend with success
      res.redirect('http://localhost:3000?auth=success');
    } else {
      // Redirect to frontend with error
      res.redirect('http://localhost:3000?auth=error');
    }
  }

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = (req.session as any).user;

    if (!user) {
      return { message: 'Not authenticated' };
    }

    return { user };
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
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
