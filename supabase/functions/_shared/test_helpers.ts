/**
 * Shared test helpers for Edge Function tests.
 *
 * Creates fake JWTs for testing auth logic.
 * Not cryptographically valid — verify_jwt is not active in unit tests.
 */

/** Create a fake JWT with the given payload (base64url-safe). */
export function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

/** Create a JWT that mimics the Supabase anon key (role=anon, no sub). */
export function createAnonKeyJwt(): string {
  return createFakeJwt({
    iss: 'supabase',
    ref: 'test-project',
    role: 'anon',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

/** Create a JWT that mimics an authenticated user session. */
export function createUserJwt(userId = 'test-user-uuid-001'): string {
  return createFakeJwt({
    iss: 'supabase',
    sub: userId,
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}
