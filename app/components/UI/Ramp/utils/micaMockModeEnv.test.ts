/**
 * Tests for micaMockModeEnv
 *
 * Note: Due to Babel's transform-inline-environment-variables, process.env
 * values are inlined at build/transform time, not runtime. These tests verify
 * the function exists and has the correct signature, but cannot test the
 * actual environment variable behavior since it's baked in during compilation.
 */

import { isMicaMockModeEnabled } from './micaMockModeEnv';

describe('micaMockModeEnv', () => {
  describe('isMicaMockModeEnabled', () => {
    it('is a function', () => {
      expect(typeof isMicaMockModeEnabled).toBe('function');
    });

    it('returns a boolean', () => {
      const result = isMicaMockModeEnabled();
      expect(typeof result).toBe('boolean');
    });

    // Note: We cannot reliably test the actual return value here because
    // Babel's transform-inline-environment-variables plugin inlines
    // process.env.MICA_MOCK_MODE at compile time. The value is determined
    // when the code is transpiled, not when the test runs.
    //
    // To test the actual mock mode behavior, use micaMockMode.test.ts which
    // mocks this entire module using jest.mock().
  });
});
