import { resolveA2tIssuerUrl } from './a2tIssuerUrl';

/**
 * PoC local issuer. Remove this file once the A2T service has an external URL.
 * It covers localhost, the Android emulator rewrite, and a LAN address.
 */
describe('resolveA2tIssuerUrl', () => {
  it('keeps localhost on an iOS simulator', () => {
    expect(
      resolveA2tIssuerUrl('http://localhost:4445', {
        os: 'ios',
        isEmulator: true,
      }),
    ).toBe('http://localhost:4445');
  });

  it('rewrites localhost to 10.0.2.2 on an Android emulator', () => {
    expect(
      resolveA2tIssuerUrl('http://localhost:4445', {
        os: 'android',
        isEmulator: true,
      }),
    ).toBe('http://10.0.2.2:4445');
  });

  it('keeps an explicit LAN address', () => {
    expect(
      resolveA2tIssuerUrl('http://192.168.1.20:4445/', {
        os: 'ios',
        isEmulator: false,
      }),
    ).toBe('http://192.168.1.20:4445');
  });

  it('rejects localhost on a physical device', () => {
    expect(() =>
      resolveA2tIssuerUrl('http://127.0.0.1:4445', {
        os: 'ios',
        isEmulator: false,
      }),
    ).toThrow('mac-lan-address');
  });

  it('rejects a missing URL', () => {
    expect(() =>
      resolveA2tIssuerUrl('  ', { os: 'ios', isEmulator: true }),
    ).toThrow('MM_A2T_URL is not set');
  });
});
