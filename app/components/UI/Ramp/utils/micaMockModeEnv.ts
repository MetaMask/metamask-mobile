/**
 * Separate module for MiCA mock mode environment check.
 * Extracted to allow Jest mocking of the environment variable.
 */

export function isMicaMockModeEnabled(): boolean {
  return process.env.MICA_MOCK_MODE === 'true' && __DEV__;
}
