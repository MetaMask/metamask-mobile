import QuickCrypto from 'react-native-quick-crypto';
import {
  generateRandomString,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  validateCodeVerifier,
  generateState,
  PKCEPair,
} from './pkceHelpers';

jest.mock('react-native-quick-crypto');

const mockQuickCrypto = QuickCrypto as jest.Mocked<typeof QuickCrypto>;

describe('pkceHelpers', () => {
  const mockHashResult = new ArrayBuffer(32);
  const mockHashView = new Uint8Array(mockHashResult);
  mockHashView.set([
    0x9f, 0x86, 0xd0, 0x81, 0x88, 0x4c, 0x7d, 0x65, 0x9a, 0x2f, 0xea, 0xa0,
    0xc5, 0x5a, 0xd0, 0x15, 0xa3, 0xbf, 0x4f, 0x1b, 0x2b, 0x0b, 0x82, 0x2c,
    0xd1, 0x5d, 0x6c, 0x15, 0xb0, 0xf0, 0x0a, 0x08,
  ]);

  beforeEach(() => {
    jest.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQuickCrypto.getRandomValues.mockImplementation((array: any) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });

    mockQuickCrypto.subtle = {
      digest: jest.fn().mockResolvedValue(mockHashResult),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    global.TextEncoder = jest.fn().mockImplementation(() => ({
      encode: jest.fn().mockReturnValue(new Uint8Array([116, 101, 115, 116])),
    }));

    global.btoa = jest.fn().mockReturnValue('base64encodedstring==');
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

  describe('generateCodeVerifier', () => {
    it('generates 64-character string', () => {
      const result = generateCodeVerifier();

      expect(result).toHaveLength(64);
      expect(typeof result).toBe('string');
    });

    it('uses allowed PKCE characters', () => {
      const result = generateCodeVerifier();

      const allowedChars = /^[A-Za-z0-9\-._~]+$/;
      expect(result).toMatch(allowedChars);
    });

    it('calls getRandomValues for cryptographic randomness', () => {
      generateCodeVerifier();

      expect(mockQuickCrypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
    });
  });

  describe('generateCodeChallenge', () => {
    it('generates challenge from verifier string', async () => {
      (global.btoa as jest.Mock).mockReturnValue(
        'n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=',
      );

      const result = await generateCodeChallenge('test-verifier');

      expect(TextEncoder).toHaveBeenCalled();
      expect(mockQuickCrypto.subtle.digest).toHaveBeenCalledWith(
        'SHA-256',
        expect.any(Uint8Array),
      );
      expect(global.btoa).toHaveBeenCalled();
      expect(result).toBe('n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg');
    });

    it('applies base64 URL encoding transformations', async () => {
      (global.btoa as jest.Mock).mockReturnValue('test+string/with==');

      const result = await generateCodeChallenge('test-input');

      expect(result).toBe('test-string_with');
    });

    it('handles empty verifier input', async () => {
      const encoder = { encode: jest.fn().mockReturnValue(new Uint8Array(0)) };
      (global.TextEncoder as jest.Mock).mockImplementation(() => encoder);
      (global.btoa as jest.Mock).mockReturnValue('');

      const result = await generateCodeChallenge('');

      expect(encoder.encode).toHaveBeenCalledWith('');
      expect(result).toBe('');
    });

    it('propagates crypto digest errors', async () => {
      const cryptoError = new Error('Crypto digest failed');
      mockQuickCrypto.subtle.digest = jest.fn().mockRejectedValue(cryptoError);

      await expect(generateCodeChallenge('test')).rejects.toThrow(
        'Crypto digest failed',
      );
    });

    it('handles btoa encoding errors', async () => {
      (global.btoa as jest.Mock).mockImplementation(() => {
        throw new Error('btoa encoding failed');
      });

      await expect(generateCodeChallenge('test')).rejects.toThrow(
        'btoa encoding failed',
      );
    });

    it('removes all padding characters', async () => {
      (global.btoa as jest.Mock).mockReturnValue('teststring===');

      const result = await generateCodeChallenge('test-input');

      expect(result).toBe('teststring');
    });
  });

  describe('generatePKCEPair', () => {
    it('returns object with codeVerifier and codeChallenge', async () => {
      (global.btoa as jest.Mock).mockReturnValue('mockChallenge');

      const result: PKCEPair = await generatePKCEPair();

      expect(result).toHaveProperty('codeVerifier');
      expect(result).toHaveProperty('codeChallenge');
      expect(typeof result.codeVerifier).toBe('string');
      expect(typeof result.codeChallenge).toBe('string');
      expect(result.codeVerifier).toHaveLength(64);
    });

    it('generates matching verifier and challenge', async () => {
      (global.btoa as jest.Mock).mockReturnValue('matchingChallenge');

      const result = await generatePKCEPair();

      expect(mockQuickCrypto.getRandomValues).toHaveBeenCalled();
      expect(mockQuickCrypto.subtle.digest).toHaveBeenCalled();
      expect(result.codeChallenge).toBe('matchingChallenge');
    });

    it('propagates errors from challenge generation', async () => {
      const error = new Error('Challenge generation failed');
      mockQuickCrypto.subtle.digest = jest.fn().mockRejectedValue(error);

      await expect(generatePKCEPair()).rejects.toThrow(
        'Challenge generation failed',
      );
    });
  });

  describe('validateCodeVerifier', () => {
    it('validates verifier with correct length and characters', () => {
      const validVerifier = 'A'.repeat(64);
      const result = validateCodeVerifier(validVerifier);

      expect(result).toBe(true);
    });

    it('validates verifier at minimum length boundary', () => {
      const minLengthVerifier = 'A'.repeat(43);
      const result = validateCodeVerifier(minLengthVerifier);

      expect(result).toBe(true);
    });

    it('validates verifier at maximum length boundary', () => {
      const maxLengthVerifier = 'A'.repeat(128);
      const result = validateCodeVerifier(maxLengthVerifier);

      expect(result).toBe(true);
    });

    it('rejects verifier shorter than minimum length', () => {
      const shortVerifier = 'A'.repeat(42);
      const result = validateCodeVerifier(shortVerifier);

      expect(result).toBe(false);
    });

    it('rejects verifier longer than maximum length', () => {
      const longVerifier = 'A'.repeat(129);
      const result = validateCodeVerifier(longVerifier);

      expect(result).toBe(false);
    });

    it('validates verifier with all allowed characters', () => {
      const verifier =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const result = validateCodeVerifier(verifier);

      expect(result).toBe(true);
    });

    it('rejects verifier with invalid characters', () => {
      const invalidVerifier = 'A'.repeat(43) + '!@#$';
      const result = validateCodeVerifier(invalidVerifier);

      expect(result).toBe(false);
    });

    it('rejects verifier with spaces', () => {
      const verifierWithSpaces = 'A'.repeat(40) + ' ' + 'A'.repeat(23);
      const result = validateCodeVerifier(verifierWithSpaces);

      expect(result).toBe(false);
    });

    it('rejects verifier with plus signs', () => {
      const verifierWithPlus = 'A'.repeat(40) + '+' + 'A'.repeat(23);
      const result = validateCodeVerifier(verifierWithPlus);

      expect(result).toBe(false);
    });

    it('rejects verifier with forward slashes', () => {
      const verifierWithSlash = 'A'.repeat(40) + '/' + 'A'.repeat(23);
      const result = validateCodeVerifier(verifierWithSlash);

      expect(result).toBe(false);
    });

    it('rejects verifier with equals signs', () => {
      const verifierWithEquals = 'A'.repeat(40) + '=' + 'A'.repeat(23);
      const result = validateCodeVerifier(verifierWithEquals);

      expect(result).toBe(false);
    });

    it('handles empty string', () => {
      const result = validateCodeVerifier('');

      expect(result).toBe(false);
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

  describe('integration scenarios', () => {
    it('generates complete PKCE flow', async () => {
      (global.btoa as jest.Mock).mockReturnValue('integrationChallenge');

      const pair = await generatePKCEPair();
      const isValid = validateCodeVerifier(pair.codeVerifier);

      expect(isValid).toBe(true);
      expect(pair.codeVerifier).toHaveLength(64);
      expect(pair.codeChallenge).toBe('integrationChallenge');
    });

    it('generates different pairs for multiple calls', async () => {
      (global.btoa as jest.Mock)
        .mockReturnValueOnce('firstChallenge')
        .mockReturnValueOnce('secondChallenge');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockQuickCrypto.getRandomValues.mockImplementationOnce((array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      });
      const pair1 = await generatePKCEPair();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockQuickCrypto.getRandomValues.mockImplementationOnce((array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + 100) % 256;
        }
        return array;
      });
      const pair2 = await generatePKCEPair();

      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).toBe('firstChallenge');
      expect(pair2.codeChallenge).toBe('secondChallenge');
    });

    it('validates generated code verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const state = generateState();

      expect(validateCodeVerifier(verifier1)).toBe(true);
      expect(validateCodeVerifier(verifier2)).toBe(true);
      expect(validateCodeVerifier(state)).toBe(false); // State is too short
    });
  });

  describe('error handling and edge cases', () => {
    it('handles crypto unavailable scenario', () => {
      mockQuickCrypto.getRandomValues.mockImplementation(() => {
        throw new Error('Crypto not available');
      });

      expect(() => generateRandomString(10)).toThrow('Crypto not available');
    });

    it('handles TextEncoder errors', async () => {
      (global.TextEncoder as jest.Mock).mockImplementation(() => {
        throw new Error('TextEncoder failed');
      });

      await expect(generateCodeChallenge('test')).rejects.toThrow(
        'TextEncoder failed',
      );
    });

    it('handles very long verifier for challenge generation', async () => {
      const longVerifier = 'A'.repeat(10000);
      (global.btoa as jest.Mock).mockReturnValue('longVerifierChallenge');

      const result = await generateCodeChallenge(longVerifier);

      expect(result).toBe('longVerifierChallenge');
    });
  });
});
