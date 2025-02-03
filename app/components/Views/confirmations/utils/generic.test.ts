import { getHostFromUrl, isNativeToken } from './generic';

describe('generic utils', () => {
  describe('getHostFromUrl', () => {
    it('should return correct value', async () => {
      expect(getHostFromUrl('')).toBe(undefined);
      expect(getHostFromUrl('https://www.dummy.com')).toBe('www.dummy.com');
    });
  });
  describe('isNativeToken', () => {
    it('should return correct value', async () => {
      expect(isNativeToken(true, false)).toBe(true);
      expect(isNativeToken(false, true)).toBe(true);
      expect(isNativeToken(false, false)).toBe(false);
    });
  });
});
