import { toChecksumHexAddress } from '@metamask/controller-utils';

import {
  isKalshiDemoOnboardingEnabled,
  kalshiDemoPayoutNetwork,
  kalshiDemoPayoutWallet,
} from './demoOnboardingConfig';

describe('demoOnboardingConfig', () => {
  it('is on only for the exact build flag', () => {
    expect(isKalshiDemoOnboardingEnabled('true')).toBe(true);
    expect(isKalshiDemoOnboardingEnabled('false')).toBe(false);
    expect(isKalshiDemoOnboardingEnabled('')).toBe(false);
  });

  it('checksums the selected account and prefers the override', () => {
    const selected = '0x1234567890abcdef1234567890abcdef12345678';

    expect(kalshiDemoPayoutWallet(selected, '')).toBe(
      toChecksumHexAddress(selected),
    );
    expect(
      kalshiDemoPayoutWallet(
        selected,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ),
    ).toBe(toChecksumHexAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'));
  });

  it('rejects an address Kalshi would not accept', () => {
    expect(kalshiDemoPayoutWallet('not-an-address', '')).toBeUndefined();
  });

  it('defaults the network to base', () => {
    expect(kalshiDemoPayoutNetwork('')).toBe('base');
    expect(kalshiDemoPayoutNetwork('polygon')).toBe('polygon');
    expect(kalshiDemoPayoutNetwork('ethereum')).toBe('base');
  });
});
