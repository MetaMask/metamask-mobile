import { TokenI } from '../../../UI/Tokens/types';
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
      expect(isNativeToken({ isNative: true, isETH: false } as TokenI)).toBe(true);
      expect(isNativeToken({ isNative: false, isETH: true } as TokenI)).toBe(true);
      expect(isNativeToken({ isNative: false, isETH: false } as TokenI)).toBe(false);
    });
  });
});
