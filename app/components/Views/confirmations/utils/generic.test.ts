import { getHostFromUrl } from './generic';

describe('generic utils', () => {
  describe('getHostFromUrl', () => {
    it('should return correct value', async () => {
      expect(getHostFromUrl('')).toBe(undefined);
      expect(getHostFromUrl('https://www.dummy.com')).toBe('www.dummy.com');
    });
  });
});
