// Environment configuration helper
// This file centralizes environment variable access and provides type safety

export const env = {
  // Node environment
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',

  // App configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Interactive Video Code Editor',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Recording configuration
  MAX_RECORDING_DURATION:
    Number(process.env.NEXT_PUBLIC_MAX_RECORDING_DURATION) || 300000, // 5 minutes default
  AUTO_SAVE_RECORDINGS: process.env.NEXT_PUBLIC_AUTO_SAVE_RECORDINGS === 'true',

  // Debug configuration
  DEBUG_RECORDING: process.env.NEXT_PUBLIC_DEBUG_RECORDING === 'true',
  DEBUG_MONACO: process.env.NEXT_PUBLIC_DEBUG_MONACO === 'true',

  // Helper functions
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test',
} as const;

export type Environment = typeof env;
