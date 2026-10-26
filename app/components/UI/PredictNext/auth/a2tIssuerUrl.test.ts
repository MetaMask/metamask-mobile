import { resolveA2tIssuerUrl } from './a2tIssuerUrl';

/**
 * PoC local issuer. Remove this file once the A2T service has an external URL.
 * It covers localhost, the Android emulator rewrite, and a LAN address.
 */
describe('resolveA2tIssuerUrl', () => {
  it('keeps localhost on an iOS simulator', () => {
    expect(
      resolveA2tIssuerUrl('http://localhost:3333', {
        os: 'ios',
        isEmulator: true,
      }),
    ).toBe('http://localhost:3333');
  });

  it('rewrites localhost to 10.0.2.2 on an Android emulator', () => {
    expect(
      resolveA2tIssuerUrl('http://localhost:3333', {
        os: 'android',
        isEmulator: true,
      }),
    ).toBe('http://10.0.2.2:3333');
  });

  it('keeps an explicit LAN address', () => {
    expect(
      resolveA2tIssuerUrl('http://192.168.1.20:3333/', {
        os: 'ios',
        isEmulator: false,
      }),
    ).toBe('http://192.168.1.20:3333');
  });

  it('rejects localhost on a physical device', () => {
    expect(() =>
      resolveA2tIssuerUrl('http://127.0.0.1:3333', {
        os: 'ios',
        isEmulator: false,
      }),
    ).toThrow('mac-lan-address');
  });

  it('returns undefined when the URL is missing', () => {
    expect(resolveA2tIssuerUrl('  ', { os: 'ios', isEmulator: true })).toBe(
      undefined,
    );
    expect(
      resolveA2tIssuerUrl(undefined, { os: 'ios', isEmulator: true }),
    ).toBe(undefined);
  });
});
