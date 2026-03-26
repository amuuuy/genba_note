/**
 * Tests for supabaseAuthService
 *
 * Tests Supabase Anonymous Auth initialization and token retrieval.
 * Uses mocked @supabase/supabase-js.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { initializeAuth, getAccessToken, resetForTest } from '@/domain/auth/supabaseAuthService';

// --- Mocks ---

const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      signInAnonymously: mockSignInAnonymously,
    },
  })),
}));

const savedUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const savedKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  (SecureStore as unknown as { __reset: () => void }).__reset();
  resetForTest();
  // Set env vars so getClient() creates the mocked client
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
});

afterAll(() => {
  // Restore original env
  if (savedUrl !== undefined) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = savedUrl;
  } else {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  }
  if (savedKey !== undefined) {
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = savedKey;
  } else {
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

// --- initializeAuth ---

describe('initializeAuth', () => {
  it('calls signInAnonymously when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null });

    const result = await initializeAuth();

    expect(result.success).toBe(true);
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('skips signInAnonymously when session already exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'existing-tok' } },
      error: null,
    });

    const result = await initializeAuth();

    expect(result.success).toBe(true);
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('returns failure when Supabase client is not configured (missing env)', async () => {
    // Override env to empty to prevent client creation
    const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const origKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    // Re-require to pick up missing env
    jest.resetModules();
    jest.mock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({
        auth: {
          getSession: mockGetSession,
          signInAnonymously: mockSignInAnonymously,
        },
      })),
    }));
    const mod = require('@/domain/auth/supabaseAuthService');

    const result = await mod.initializeAuth();
    expect(result.success).toBe(false);

    // Restore env
    if (origUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origKey;
  });

  it('returns failure when signInAnonymously returns error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Sign in failed' },
    });

    const result = await initializeAuth();

    expect(result.success).toBe(false);
  });

  it('returns failure when getSession throws', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('session error'));

    const result = await initializeAuth();

    expect(result.success).toBe(false);
  });
});

// --- getAccessToken ---

describe('getAccessToken', () => {
  it('returns access token when session exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'user-jwt-token' } },
      error: null,
    });

    const token = await getAccessToken();

    expect(token).toBe('user-jwt-token');
  });

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const token = await getAccessToken();

    expect(token).toBeNull();
  });

  it('returns null when Supabase client is not configured', async () => {
    const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const origKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    jest.resetModules();
    jest.mock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({
        auth: {
          getSession: mockGetSession,
          signInAnonymously: mockSignInAnonymously,
        },
      })),
    }));
    const mod = require('@/domain/auth/supabaseAuthService');

    const token = await mod.getAccessToken();
    expect(token).toBeNull();

    if (origUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origKey;
  });
});

// --- SecureStoreAdapter regression ---

describe('SecureStoreAdapter passed to createClient', () => {
  it('passes a storage adapter with awaitable setItem/removeItem', async () => {
    // Trigger client creation
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null });
    await initializeAuth();

    const mockCreateClient = createClient as jest.Mock;
    expect(mockCreateClient).toHaveBeenCalledTimes(1);

    const options = mockCreateClient.mock.calls[0][2];
    const storage = options.auth.storage;

    // setItem should return a Promise (not undefined from fire-and-forget)
    const setResult = storage.setItem('test-key', 'test-value');
    expect(setResult).toBeInstanceOf(Promise);
    await setResult;

    // getItem should retrieve the stored value
    const value = await storage.getItem('test-key');
    expect(value).toBe('test-value');

    // removeItem should return a Promise
    const removeResult = storage.removeItem('test-key');
    expect(removeResult).toBeInstanceOf(Promise);
    await removeResult;

    // After removal, getItem should return null
    const removed = await storage.getItem('test-key');
    expect(removed).toBeNull();
  });

  it('stores typical anonymous session within SecureStore 2KB limit', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null });
    await initializeAuth();

    const mockCreateClient = createClient as jest.Mock;
    const storage = mockCreateClient.mock.calls[0][2].auth.storage;

    // Simulate a realistic anonymous session payload as Supabase SDK would store it
    const realisticSession = JSON.stringify({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'x'.repeat(400),
      refresh_token: 'r'.repeat(128),
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        is_anonymous: true,
        role: 'authenticated',
      },
    });

    // Verify session fits within expo-secure-store 2KB limit
    expect(Buffer.byteLength(realisticSession, 'utf8')).toBeLessThan(2048);

    // Verify round-trip storage works with realistic payload
    await storage.setItem('sb-test-auth-token', realisticSession);
    const retrieved = await storage.getItem('sb-test-auth-token');
    expect(retrieved).toBe(realisticSession);
  });

  it('propagates SecureStore errors through the adapter', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null });
    await initializeAuth();

    const mockCreateClient = createClient as jest.Mock;
    const storage = mockCreateClient.mock.calls[0][2].auth.storage;

    // Spy on SecureStore to simulate failure
    const spy = jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(new Error('SecureStore write failed'));

    await expect(storage.setItem('key', 'val')).rejects.toThrow('SecureStore write failed');
    spy.mockRestore();
  });
});
