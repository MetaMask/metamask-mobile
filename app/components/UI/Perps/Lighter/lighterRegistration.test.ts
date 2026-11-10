import {
  assertLighterClientParameters,
  assertLighterRegistrationMessage,
} from './lighterRegistration';

// Actual pinned-WASM output for a disposable offline key; no wallet key used.
const params = { chainId: 300, accountIndex: 59, nonce: 123, apiKeyIndex: 8 };
const publicKey =
  'bb562af383a8e24c9443aa29f7130fab895f8d2cea7f9ae7abf747f32d1cf62f8bf2ed9c296e979b';
const body = `Register Lighter Account\n\npubkey: 0x${publicKey}\nnonce: 0x000000000000007b\naccount index: 0x000000000000003b\napi key index: 0x0000000000000008\nOnly sign this message for a trusted client!`;
const result = { success: true, pubKeySuccess: true, pk: publicKey, body };

describe('Lighter registration authorization', () => {
  it('accepts the pinned signer registration format for the requested metadata', () => {
    expect(() =>
      assertLighterRegistrationMessage(params, result),
    ).not.toThrow();
  });

  it.each([
    'Sign this unrelated message',
    body + '\nAdditional authorization',
    body.replace('000000000000007b', '000000000000007c'),
    body.replace('000000000000003b', '000000000000003c'),
    body.replace('0000000000000008', '0000000000000009'),
    body.replace(publicKey, 'a'.repeat(80)),
  ])('rejects an unrelated or mismatched registration body', (message) => {
    expect(() =>
      assertLighterRegistrationMessage(params, { ...result, body: message }),
    ).toThrow('does not match');
  });

  it.each([{ pk: 'short' }, { pubKeySuccess: false }, { success: false }])(
    'rejects unsuccessful or malformed public-key output',
    (override) => {
      expect(() =>
        assertLighterRegistrationMessage(params, { ...result, ...override }),
      ).toThrow('public key');
    },
  );

  it.each([
    { chainId: 1 },
    { nonce: -1 },
    { nonce: Number.NaN },
    { accountIndex: 1.5 },
    { accountIndex: Number.MAX_SAFE_INTEGER + 1 },
    { apiKeyIndex: 255 },
    { apiKeyIndex: Number.POSITIVE_INFINITY },
  ])('rejects unsupported client metadata', (override) => {
    expect(() =>
      assertLighterClientParameters({ ...params, ...override }),
    ).toThrow('parameters');
  });
});
