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

  it('defaults to the given USDC on Base address, unchanged by checksumming', () => {
    expect(kalshiDemoPayoutWallet(undefined, undefined)).toBe(
      '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c',
    );
  });

  it('defaults the network to base', () => {
    expect(kalshiDemoPayoutNetwork('')).toBe('base');
    expect(kalshiDemoPayoutNetwork('polygon')).toBe('polygon');
    expect(kalshiDemoPayoutNetwork('ethereum')).toBe('base');
  });
});
