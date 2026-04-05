import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  async validateUser(user: any): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({ providerId: user.id })
      .exec();

    if (existingUser) {
      return existingUser;
    }

    const now = new Date();
    return this.userModel.create({
      email: user.emails[0].value,
      firstName: user.name.givenName,
      lastName: user.name.familyName,
      picture: user.photos[0].value,
      provider: 'google',
      providerId: user.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  async handleGoogleCallback(code: string): Promise<UserDocument> {
    try {
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

      const userResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
      );
      const googleUser = (await userResponse.json()) as any;

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information');
      }

      return this.findOrCreateUser({
        providerId: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        picture: googleUser.picture,
      });
    } catch (error: any) {
      throw new Error(`Google OAuth failed: ${error.message}`);
    }
  }

  private async findOrCreateUser(data: {
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  }): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({ providerId: data.providerId })
      .exec();

    if (existingUser) {
      return existingUser;
    }

    return this.userModel.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      picture: data.picture,
      provider: 'google',
      providerId: data.providerId,
    });
  }

  async findUserById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}
