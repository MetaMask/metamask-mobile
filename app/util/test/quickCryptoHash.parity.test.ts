import Crypto from 'react-native-quick-crypto';
import { generateCodeChallenge } from '../../components/UI/Card/util/pkceHelpers';
import { bytesToHex } from './nodeQuickCryptoMock';

// react-native-quick-crypto is a native module and cannot run inside Jest.
// Delegate to Node's `crypto`/WebCrypto implementation so digest/HMAC output
// is byte-exact against RFC known-answer vectors — the same OpenSSL backend
// react-native-quick-crypto 1.x wraps natively.
jest.mock('react-native-quick-crypto', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./nodeQuickCryptoMock'),
);

describe('SHA-256 digest parity (subtle.digest)', () => {
  /**
   * RFC 6234 §8.5 SHA-256 example message digests.
   * https://www.rfc-editor.org/rfc/rfc6234#section-8.5
   */
  const SHA256_VECTORS = [
    {
      label: 'empty message',
      message: '',
      expected:
        'e3b0c44298fc1c149afbf4c8996fb92' +
        '427ae41e4649b934ca495991b7852b8' +
        '55',
    },
    {
      label: '"abc"',
      message: 'abc',
      expected:
        'ba7816bf8f01cfea414140de5dae222' +
        '3b00361a396177a9cb410ff61f20015' +
        'ad',
    },
  ] as const;

  it.each(SHA256_VECTORS)(
    'produces the correct digest for $label',
    async ({ message, expected }) => {
      const data = new TextEncoder().encode(message);

      const digest = await Crypto.subtle.digest('SHA-256', data);

      expect(bytesToHex(new Uint8Array(digest))).toBe(expected);
    },
  );

  it('derives the RFC 7636 Appendix B PKCE code_challenge from its code_verifier', async () => {
    // https://www.rfc-editor.org/rfc/rfc7636#appendix-B
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

    const challenge = await generateCodeChallenge(verifier);

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});

describe('HMAC-SHA256 parity (createHmac)', () => {
  /**
   * RFC 4231 §4.2 Test Case 1.
   * https://www.rfc-editor.org/rfc/rfc4231#section-4.2
   */
  it('produces the correct MAC for RFC 4231 test case 1', () => {
    const key = Buffer.alloc(20, 0x0b);
    const data = 'Hi There';

    const mac = Crypto.createHmac('sha256', key).update(data).digest('hex');

    expect(mac).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
  });
});
