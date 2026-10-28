import { toChecksumHexAddress } from '@metamask/controller-utils';

import {
  DEMO_PAYOUT_WALLET,
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

  it('defaults to the Stripe sandbox wallet, not the selected account', () => {
    const selected = '0x44934055428d2eF7E3F97D98187f2459007fa49F';

    expect(kalshiDemoPayoutWallet(selected, '')).toBe(
      toChecksumHexAddress(DEMO_PAYOUT_WALLET),
    );
    expect(kalshiDemoPayoutWallet(undefined, undefined)).toBe(
      toChecksumHexAddress(DEMO_PAYOUT_WALLET),
    );
  });

  it('prefers the env override and can sign the selected account', () => {
    const selected = '0x44934055428d2eF7E3F97D98187f2459007fa49F';

    expect(
      kalshiDemoPayoutWallet(
        selected,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ),
    ).toBe(toChecksumHexAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'));
    expect(kalshiDemoPayoutWallet(selected, 'account')).toBe(
      toChecksumHexAddress(selected),
    );
    expect(kalshiDemoPayoutWallet(undefined, 'account')).toBeUndefined();
  });

  it('rejects an address Kalshi would not accept', () => {
    expect(kalshiDemoPayoutWallet('x', 'not-an-address')).toBeUndefined();
  });

  it('defaults the network to polygon', () => {
    expect(kalshiDemoPayoutNetwork('')).toBe('polygon');
    expect(kalshiDemoPayoutNetwork('base')).toBe('base');
    expect(kalshiDemoPayoutNetwork('ethereum')).toBe('polygon');
  });
});
