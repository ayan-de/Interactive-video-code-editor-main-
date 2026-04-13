/* eslint-disable turbo/no-undeclared-env-vars */
import mongoose from 'mongoose';

declare global {
  var _mongooseCache:
    | {
        conn: mongoose.Mongoose | null;
        promise: Promise<mongoose.Mongoose> | null;
      }
    | undefined;
}

export async function connectToDatabase(): Promise<mongoose.Mongoose> {
  if (global._mongooseCache?.conn) return global._mongooseCache.conn;

  if (!global._mongooseCache) {
    global._mongooseCache = { conn: null, promise: null };
  }

  if (!global._mongooseCache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');
    global._mongooseCache.promise = mongoose.connect(uri);
  }

  global._mongooseCache.conn = await global._mongooseCache.promise;
  return global._mongooseCache.conn;
}
