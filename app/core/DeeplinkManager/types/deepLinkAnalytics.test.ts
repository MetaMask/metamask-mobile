/**
 * Unit tests for deep link analytics type definitions
 * Tests enum values and their correct string representations
 */

import {
  InterstitialState,
  SignatureStatus,
  AppInstallationStatus,
  DeepLinkRoute,
} from './deepLinkAnalytics';

describe('deepLinkAnalytics types', () => {
  describe('InterstitialState enum', () => {
    it.each([
      ['ACCEPTED', 'accepted'],
      ['REJECTED', 'rejected'],
      ['NOT_SHOWN', 'not shown'],
      ['SKIPPED', 'skipped'],
    ])('defines %s state with correct value', (state, expectedValue) => {
      const actualValue = InterstitialState[state as keyof typeof InterstitialState];

      expect(actualValue).toBe(expectedValue);
    });

    it('contains all required interstitial states', () => {
      const expectedStates = ['accepted', 'rejected', 'not shown', 'skipped'];
      const actualStates = Object.values(InterstitialState);

      expect(actualStates).toEqual(expect.arrayContaining(expectedStates));
      expect(actualStates).toHaveLength(expectedStates.length);
    });
  });

  describe('SignatureStatus enum', () => {
    it.each([
      ['VALID', 'valid'],
      ['INVALID', 'invalid'],
      ['MISSING', 'missing'],
    ])('defines %s status with correct value', (status, expectedValue) => {
      const actualValue = SignatureStatus[status as keyof typeof SignatureStatus];

      expect(actualValue).toBe(expectedValue);
    });

    it('contains all required signature statuses', () => {
      const expectedStatuses = ['valid', 'invalid', 'missing'];
      const actualStatuses = Object.values(SignatureStatus);

      expect(actualStatuses).toEqual(expect.arrayContaining(expectedStatuses));
      expect(actualStatuses).toHaveLength(expectedStatuses.length);
    });
  });

  describe('AppInstallationStatus enum', () => {
    it.each([
      ['INSTALLED', 'installed'],
      ['NOT_INSTALLED', 'not_installed'],
    ])('defines %s status with correct value', (status, expectedValue) => {
      const actualValue = AppInstallationStatus[status as keyof typeof AppInstallationStatus];

      expect(actualValue).toBe(expectedValue);
    });

    it('contains all required installation statuses', () => {
      const expectedStatuses = ['installed', 'not_installed'];
      const actualStatuses = Object.values(AppInstallationStatus);

      expect(actualStatuses).toEqual(expect.arrayContaining(expectedStatuses));
      expect(actualStatuses).toHaveLength(expectedStatuses.length);
    });
  });

  describe('DeepLinkRoute enum', () => {
    it.each([
      ['HOME', 'home'],
      ['SWAP', 'swap'],
      ['PERPS', 'perps'],
      ['DEPOSIT', 'deposit'],
      ['TRANSACTION', 'transaction'],
      ['BUY', 'buy'],
      ['INVALID', 'invalid'],
    ])('defines %s route with correct value', (route, expectedValue) => {
      const actualValue = DeepLinkRoute[route as keyof typeof DeepLinkRoute];

      expect(actualValue).toBe(expectedValue);
    });

    it('contains all required deep link routes', () => {
      const expectedRoutes = [
        'home',
        'swap',
        'perps',
        'deposit',
        'transaction',
        'buy',
        'invalid',
      ];
      const actualRoutes = Object.values(DeepLinkRoute);

      expect(actualRoutes).toEqual(expect.arrayContaining(expectedRoutes));
      expect(actualRoutes).toHaveLength(expectedRoutes.length);
    });
  });

});
