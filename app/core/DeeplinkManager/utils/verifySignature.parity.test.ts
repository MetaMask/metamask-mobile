import { verifyDeeplinkSignature, VALID, INVALID } from './verifySignature';

// react-native-quick-crypto is a native module and cannot run inside Jest.
// Delegate `subtle` to Node's WebCrypto implementation so ECDSA
// importKey/verify behaves exactly like the OpenSSL backend
// react-native-quick-crypto 1.x wraps natively.
jest.mock('react-native-quick-crypto', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../../util/test/nodeQuickCryptoMock'),
);

// Use a self-generated P-256 fixture key pair (not the real deeplink signing
// key, which we have no private half for) so this test can produce and
// verify a genuine signature end-to-end. Keep the rest of the module intact.
jest.mock('../../AppConstants', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('../../AppConstants').default;
  return {
    __esModule: true,
    default: {
      ...actual,
      MM_DEEP_LINK_PUBLIC_KEY_X: 'Y6bwijt8yRC8yD8qkk_3C3tjZMhLzH0cMV2dgX1Zx7E',
      MM_DEEP_LINK_PUBLIC_KEY_Y: 'ptWXABrvcKICzNCh4vZk-Ug71xTCfb8y0XD_HXwTPlk',
    },
  };
});

/**
 * ECDSA P-256/SHA-256 signature over the canonical string
 * "https://metamask.app.link/deeplink-parity-test" (a URL with only a `sig`
 * query param canonicalizes to `origin + pathname`, per
 * `canonicalize()` in ./verifySignature.ts), produced with the private half
 * of the fixture key pair above via Node's WebCrypto `subtle.sign`. This
 * proves `importKey('jwk', ...)` + `verify()` accept and correctly validate
 * a real ECDSA signature — the exact primitive path deeplink verification
 * depends on.
 */
const VALID_SIGNATURE_BASE64 =
  'SSQmcG7Yz95wSwrjC+h3Jae0IiQSNHVMnGJX0qmv1R1AWk8WWZfkJWf67TpGhkIDMBjLMaKefnzgHl8OZnpg/Q==';

describe('verifyDeeplinkSignature ECDSA parity', () => {
  it('returns VALID for a genuine ECDSA P-256 signature over the canonical URL', async () => {
    const url = new URL('https://metamask.app.link/deeplink-parity-test');
    url.searchParams.set('sig', VALID_SIGNATURE_BASE64);

    const result = await verifyDeeplinkSignature(url);

    expect(result).toBe(VALID);
  });

  it('returns INVALID when the signed message is tampered with', async () => {
    const tamperedUrl = new URL(
      'https://metamask.app.link/deeplink-parity-test-tampered',
    );
    tamperedUrl.searchParams.set('sig', VALID_SIGNATURE_BASE64);

    const result = await verifyDeeplinkSignature(tamperedUrl);

    expect(result).toBe(INVALID);
  });

  it('returns INVALID when the signature bytes are tampered with', async () => {
    const tamperedSignature = 'T' + VALID_SIGNATURE_BASE64.slice(1); // flip the first byte
    const url = new URL('https://metamask.app.link/deeplink-parity-test');
    url.searchParams.set('sig', tamperedSignature);

    const result = await verifyDeeplinkSignature(url);

    expect(result).toBe(INVALID);
  });
});
