import QuickCrypto from 'react-native-quick-crypto';
import { generateRandomString, generateState } from './pkceHelpers';

jest.mock('react-native-quick-crypto');

const mockQuickCrypto = QuickCrypto as jest.Mocked<typeof QuickCrypto>;

describe('pkceHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQuickCrypto.getRandomValues.mockImplementation((array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateRandomString', () => {
    it('generates string of specified length', () => {
      const result = generateRandomString(10);

      expect(result).toHaveLength(10);
      expect(typeof result).toBe('string');
    });

    it('generates string with only allowed characters', () => {
      const result = generateRandomString(100);

      const allowedChars = /^[A-Za-z0-9\-._~]+$/;
      expect(result).toMatch(allowedChars);
    });

    it('uses crypto random values', () => {
      generateRandomString(20);

      expect(mockQuickCrypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
      expect(mockQuickCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    });

    it('generates different strings with different mock values', () => {
      const firstMock = new Uint8Array([0, 1, 2, 3, 4]);
      const secondMock = new Uint8Array([10, 20, 30, 40, 50]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockQuickCrypto.getRandomValues.mockImplementationOnce((array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = firstMock[i] || 0;
        }
        return array;
      });
      const result1 = generateRandomString(5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockQuickCrypto.getRandomValues.mockImplementationOnce((array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = secondMock[i] || 0;
        }
        return array;
      });
      const result2 = generateRandomString(5);

      expect(result1).not.toBe(result2);
    });

    it('handles zero length input', () => {
      const result = generateRandomString(0);

      expect(result).toBe('');
      expect(result).toHaveLength(0);
    });

    it('handles large length inputs', () => {
      const result = generateRandomString(1000);

      expect(result).toHaveLength(1000);
      expect(typeof result).toBe('string');
    });
  });

  describe('generateState', () => {
    it('generates 32-character string', () => {
      const result = generateState();

      expect(result).toHaveLength(32);
      expect(typeof result).toBe('string');
    });

    it('uses allowed characters for OAuth state', () => {
      const result = generateState();

      const allowedChars = /^[A-Za-z0-9\-._~]+$/;
      expect(result).toMatch(allowedChars);
    });

    it('calls getRandomValues for cryptographic randomness', () => {
      generateState();

      expect(mockQuickCrypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
    });
  });

  describe('error handling', () => {
    it('handles crypto unavailable scenario', () => {
      mockQuickCrypto.getRandomValues.mockImplementation(() => {
        throw new Error('Crypto not available');
      });

      expect(() => generateRandomString(10)).toThrow('Crypto not available');
    });
  });
});
