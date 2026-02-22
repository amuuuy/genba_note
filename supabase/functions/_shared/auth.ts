/**
 * Decode a base64url-encoded string (JWT segments use base64url, not standard base64).
 * Converts base64url chars to standard base64 and adds padding before decoding.
 */
function decodeBase64Url(str: string): string {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

/**
 * Extract authenticated user ID from JWT payload.
 *
 * Supabase verify_jwt (in config.toml) already validated the JWT signature.
 * We decode the payload to check:
 *   - role must be "authenticated" (rejects "anon" key tokens)
 *   - sub must be present (the user UUID)
 */
export function extractUserId(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(auth.slice(7).split('.')[1]));
    if (payload.role !== 'authenticated' || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
