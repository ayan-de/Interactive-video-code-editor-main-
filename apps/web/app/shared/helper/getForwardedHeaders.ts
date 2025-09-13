import { NextRequest } from 'next/server';

export function getForwardedHeaders(
  request: NextRequest
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Forward authorization header if present
  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.authorization = authorization;
  }

  // Forward cookie header if present
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.cookie = cookie;
  }

  // Forward user agent
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    headers['user-agent'] = userAgent;
  }

  // Forward x-forwarded-for
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    headers['x-forwarded-for'] = forwardedFor;
  }

  return headers;
}
