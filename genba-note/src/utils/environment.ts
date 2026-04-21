/**
 * Environment Utilities
 *
 * Provides safe environment detection for development mode checking.
 */

/**
 * Check if app is running in development mode
 *
 * Returns true when __DEV__ is true (React Native dev mode via Metro/Expo Go).
 * In production builds (App Store), __DEV__ is always false.
 */
export function isDevelopmentMode(): boolean {
  // __DEV__ is a React Native global - always false in production builds.
  // EXPO_PUBLIC_APP_ENV is bundled at build time and could be misconfigured,
  // so we do NOT use it as a standalone bypass for production builds.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDevBuild =
    typeof (global as any).__DEV__ !== 'undefined' ? (global as any).__DEV__ : false;

  return isDevBuild;
}

/**
 * Check if app is running in production mode
 *
 * Returns true only when NOT in development mode.
 */
export function isProductionMode(): boolean {
  return !isDevelopmentMode();
}
