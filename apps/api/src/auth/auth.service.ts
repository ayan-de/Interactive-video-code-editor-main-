import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  provider: 'google';
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}
  async validateUser(user: any): Promise<User> {
    // In a real application, you might want to save the user to a database
    // For now, we'll just return the user data from Google
    const now = new Date().toISOString();
    return {
      id: user.id,
      email: user.emails[0].value,
      firstName: user.name.givenName,
      lastName: user.name.familyName,
      picture: user.photos[0].value,
      provider: 'google',
      providerId: user.id,
      createdAt: now,
      updatedAt: now,
    };
  }

  async handleGoogleCallback(code: string): Promise<User> {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL'),
        }),
      });

      const tokens = (await tokenResponse.json()) as any;

      if (!tokenResponse.ok) {
        throw new Error(
          tokens.error_description || 'Failed to exchange code for tokens'
        );
      }

      // Get user info from Google
      const userResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
      );
      const googleUser = (await userResponse.json()) as any;

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information');
      }

      // Transform to our user format
      const now = new Date().toISOString();
      return {
        id: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        picture: googleUser.picture,
        provider: 'google',
        providerId: googleUser.id,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      throw new Error(`Google OAuth failed: ${error.message}`);
    }
  }

  async findUserById(id: string): Promise<User | null> {
    // In a real application, you would fetch the user from a database
    // For now, we'll return null as this is just a demo
    return null;
  }
}
