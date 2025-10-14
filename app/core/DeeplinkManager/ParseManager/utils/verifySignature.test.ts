import QuickCrypto from 'react-native-quick-crypto';
import { CryptoKey } from 'react-native-quick-crypto/lib/typescript/src/keys';
import {
  verifyDeeplinkSignature,
  hasSignature,
  MISSING,
  VALID,
  INVALID,
} from './verifySignature';
import AppConstants from '../../../../core/AppConstants';

jest.mock('react-native-quick-crypto', () => ({
  webcrypto: {
    subtle: {
      importKey: jest.fn(),
      verify: jest.fn(),
    },
  },
}));

const mockSubtle = QuickCrypto.webcrypto.subtle as jest.Mocked<
  typeof QuickCrypto.webcrypto.subtle
> & {
  verify: jest.Mock<Promise<boolean>>;
};

describe('verifySignature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constants', () => {
    it('exports the correct constant values', () => {
      expect(MISSING).toBe('MISSING');
      expect(VALID).toBe('VALID');
      expect(INVALID).toBe('INVALID');
    });
  });

  describe('hasSignature', () => {
    it('returns true when URL has sig parameter', () => {
      const url = new URL('https://example.com?sig=abcd1234');
      expect(hasSignature(url)).toBe(true);
    });

    it('returns false when URL does not have sig parameter', () => {
      const url = new URL('https://example.com?param=value');
      expect(hasSignature(url)).toBe(false);
    });

    it('returns true when URL has empty sig parameter', () => {
      const url = new URL('https://example.com?sig=');
      expect(hasSignature(url)).toBe(true);
    });

    it('returns true when URL has sig parameter with other parameters', () => {
      const url = new URL(
        'https://example.com?param1=value1&sig=abcd1234&param2=value2',
      );
      expect(hasSignature(url)).toBe(true);
    });
  });

  describe('verifyDeeplinkSignature', () => {
    const mockKey = {
      type: 'public',
      extractable: false,
      algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
      usages: ['verify'],
    } as unknown as CryptoKey;
    const mockAlgorithm = {
      name: 'ECDSA',
      hash: 'SHA-256',
      namedCurve: 'P-256',
    };

    beforeEach(() => {
      mockSubtle.importKey.mockResolvedValue(mockKey);
    });

    it('returns MISSING when sig parameter is not present', async () => {
      const url = new URL('https://example.com?param=value');
      const result = await verifyDeeplinkSignature(url);
      expect(result).toBe(MISSING);
    });

    it('returns MISSING when sig parameter is empty', async () => {
      const url = new URL('https://example.com?sig=');
      const result = await verifyDeeplinkSignature(url);
      expect(result).toBe(MISSING);
    });

    it('returns INVALID when signature has wrong length', async () => {
      const shortSignature = Buffer.from('short').toString('base64');
      const url = new URL(`https://example.com?sig=${shortSignature}`);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(INVALID);
    });

    it('returns VALID when signature verification succeeds', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const url = new URL(
        `https://example.com?sig=${validSignature}&param1=value1`,
      );

      mockSubtle.verify.mockResolvedValue(true);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(VALID);
      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'jwk',
        {
          crv: 'P-256',
          ext: true,
          key_ops: ['verify'],
          kty: 'EC',
          x: AppConstants.MM_DEEP_LINK_PUBLIC_KEY_X,
          y: AppConstants.MM_DEEP_LINK_PUBLIC_KEY_Y,
        },
        {
          name: 'ECDSA',
          hash: 'SHA-256',
          namedCurve: 'P-256',
        },
        false,
        ['verify'],
      );
      expect(mockSubtle.verify).toHaveBeenCalledWith(
        mockAlgorithm,
        mockKey,
        expect.any(Uint8Array),
        expect.any(Uint8Array),
      );
    });

    it('returns INVALID when signature verification fails', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const url = new URL(
        `https://example.com?sig=${validSignature}&param1=value1`,
      );

      mockSubtle.verify.mockResolvedValue(false);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(INVALID);
    });

    it('canonicalizes URL by removing sig parameter and sorting others', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const url = new URL(
        `https://example.com/path?zebra=last&sig=${validSignature}&alpha=first`,
      );

      mockSubtle.verify.mockResolvedValue(true);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(VALID);

      const verifyCall = mockSubtle.verify.mock.calls[0];
      const dataBuffer = verifyCall[3] as Uint8Array;
      const canonicalUrl = new TextDecoder().decode(dataBuffer);
      expect(canonicalUrl).toBe(
        'https://example.com/path?alpha=first&zebra=last',
      );
    });

    it('handles URLs with no query parameters except sig', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const url = new URL(`https://example.com/path?sig=${validSignature}`);

      mockSubtle.verify.mockResolvedValue(true);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(VALID);
      const verifyCall = mockSubtle.verify.mock.calls[0];
      const dataBuffer = verifyCall[3] as Uint8Array;
      const canonicalUrl = new TextDecoder().decode(dataBuffer);
      expect(canonicalUrl).toBe('https://example.com/path');
    });

    it('handles base64 URL-safe encoding with padding', async () => {
      const urlSafeBase64 = Buffer.from(new Array(64).fill(0))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(new RegExp('/', 'g'), '_')
        .replace(/[=]/g, '');

      const url = new URL(`https://example.com?sig=${urlSafeBase64}`);

      mockSubtle.verify.mockResolvedValue(true);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(VALID);
    });

    it('handles base64 with different padding scenarios', async () => {
      const tests = [
        Buffer.from(new Array(64).fill(1)).toString('base64'), // Standard base64
        Buffer.from(new Array(64).fill(2)).toString('base64').slice(0, -1), // Missing 1 pad
        Buffer.from(new Array(64).fill(3)).toString('base64').slice(0, -2), // Missing 2 pads
      ];

      for (const sig of tests) {
        const url = new URL(`https://example.com?sig=${sig}`);
        mockSubtle.verify.mockResolvedValue(true);

        const result = await verifyDeeplinkSignature(url);
        expect(result).toBe(VALID);
      }
    });

    it('returns INVALID when crypto operation throws', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const url = new URL(`https://example.com?sig=${validSignature}`);

      const error = new Error('Crypto operation failed');
      mockSubtle.verify.mockRejectedValue(error);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(INVALID);
    });

    it('handles complex URLs with fragments and multiple query params', async () => {
      const validSignature = Buffer.from(new Array(64).fill(0)).toString(
        'base64',
      );
      const url = new URL(
        `https://example.com:8080/deep/path?c=3&sig=${validSignature}&a=1&b=2#fragment`,
      );

      mockSubtle.verify.mockResolvedValue(true);

      const result = await verifyDeeplinkSignature(url);

      expect(result).toBe(VALID);
      const verifyCall = mockSubtle.verify.mock.calls[0];
      const dataBuffer = verifyCall[3] as Uint8Array;
      const canonicalUrl = new TextDecoder().decode(dataBuffer);

      expect(canonicalUrl).toBe(
        'https://example.com:8080/deep/path?a=1&b=2&c=3',
      );
    });

    describe('sig_params support', () => {
      it('includes sig_params in the signature verification', async () => {
        // Given a URL with sig_params
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?token=ETH&amount=100&sig=${validSignature}&sig_params=token,amount`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying the signature
        const result = await verifyDeeplinkSignature(url);

        // Then sig_params should be included in canonicalization
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        // sig_params must be part of the signed data
        expect(canonicalUrl).toContain('sig_params=token%2Camount');
      });

      it('only includes params listed in sig_params', async () => {
        // Given a URL with sig_params and additional marketing params
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?token=ETH&amount=100&utm_source=email&gclid=123&sig=${validSignature}&sig_params=token,amount`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying the signature
        const result = await verifyDeeplinkSignature(url);

        // Then only listed params (and sig_params itself) are included
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        // Should include listed params and sig_params
        expect(canonicalUrl).toContain('token=ETH');
        expect(canonicalUrl).toContain('amount=100');
        expect(canonicalUrl).toContain('sig_params=token%2Camount');

        // Should NOT include marketing params
        expect(canonicalUrl).not.toContain('utm_source');
        expect(canonicalUrl).not.toContain('gclid');
      });

      it('sorts params alphabetically when using sig_params', async () => {
        // Given params that need alphabetic sorting
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?zebra=last&alpha=first&sig=${validSignature}&sig_params=zebra,alpha`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then params should be alphabetically sorted
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        // alpha comes before sig_params, sig_params before zebra
        const alphaIndex = canonicalUrl.indexOf('alpha=');
        const sigParamsIndex = canonicalUrl.indexOf('sig_params=');
        const zebraIndex = canonicalUrl.indexOf('zebra=');

        expect(alphaIndex).toBeLessThan(sigParamsIndex);
        expect(sigParamsIndex).toBeLessThan(zebraIndex);
      });

      it('handles empty sig_params gracefully', async () => {
        // Given sig_params with no value
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?token=ETH&sig=${validSignature}&sig_params=`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then should still include sig_params in signature
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        expect(canonicalUrl).toContain('sig_params=');
      });

      it('ignores params in sig_params that do not exist in URL', async () => {
        // Given sig_params listing non-existent params
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?token=ETH&sig=${validSignature}&sig_params=token,nonexistent,alsonothere`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then only existing params are included
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        expect(canonicalUrl).toContain('token=ETH');
        expect(canonicalUrl).not.toContain('nonexistent');
        expect(canonicalUrl).not.toContain('alsonothere');
      });

      it('maintains backward compatibility when sig_params is not present', async () => {
        // Given a URL without sig_params (legacy format)
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?token=ETH&amount=100&sig=${validSignature}`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then all params (except sig) should be included
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        expect(canonicalUrl).toContain('token=ETH');
        expect(canonicalUrl).toContain('amount=100');
        expect(canonicalUrl).not.toContain('sig_params');
      });

      it('prevents parameter injection attack via sig_params manipulation', async () => {
        // Given a URL where attacker tries to add malicious param not in sig_params
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?token=ETH&amount=100&malicious=true&sig=${validSignature}&sig_params=token,amount`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then malicious param should not be included in signature
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        expect(canonicalUrl).not.toContain('malicious');
      });

      it('handles real-world marketing scenario with multiple tracking params', async () => {
        // Given a URL from a marketing campaign with many tracking params
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://link.metamask.io/buy?token=ETH&amount=100&` +
            `utm_source=email&utm_medium=newsletter&utm_campaign=q4_2025&` +
            `gclid=Cj0KCQ&fbclid=IwAR&msclkid=abc123&` +
            `sig=${validSignature}&sig_params=token,amount`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then should verify successfully with only essential params
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        // Essential params included
        expect(canonicalUrl).toContain('token=ETH');
        expect(canonicalUrl).toContain('amount=100');

        // Marketing params excluded
        expect(canonicalUrl).not.toContain('utm_source');
        expect(canonicalUrl).not.toContain('utm_medium');
        expect(canonicalUrl).not.toContain('utm_campaign');
        expect(canonicalUrl).not.toContain('gclid');
        expect(canonicalUrl).not.toContain('fbclid');
        expect(canonicalUrl).not.toContain('msclkid');
      });

      it('preserves URL encoding in param values', async () => {
        // Given params with special characters that need encoding
        const validSignature = Buffer.from(new Array(64).fill(0)).toString(
          'base64',
        );
        const url = new URL(
          `https://example.com?address=0x123&callback=https%3A%2F%2Fexample.com%2Fcb&sig=${validSignature}&sig_params=address,callback`,
        );

        mockSubtle.verify.mockResolvedValue(true);

        // When verifying
        const result = await verifyDeeplinkSignature(url);

        // Then encoding should be preserved
        expect(result).toBe(VALID);
        const verifyCall = mockSubtle.verify.mock.calls[0];
        const dataBuffer = verifyCall[3] as Uint8Array;
        const canonicalUrl = new TextDecoder().decode(dataBuffer);

        expect(canonicalUrl).toContain(
          'callback=https%3A%2F%2Fexample.com%2Fcb',
        );
      });
    });
  });
});
