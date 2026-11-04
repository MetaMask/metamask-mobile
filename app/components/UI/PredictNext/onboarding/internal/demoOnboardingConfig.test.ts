import { toChecksumHexAddress } from '@metamask/controller-utils';

import {
  DEMO_PAYOUT_WALLET,
  DEMO_PAYOUT_NETWORK,
  isKalshiDemoOnboardingEnabled,
  kalshiDemoPayoutNetwork,
  kalshiDemoPayoutWallet,
} from './demoOnboardingConfig';

describe('demoOnboardingConfig', () => {
  it('is enabled by default', () => {
    expect(isKalshiDemoOnboardingEnabled()).toBe(true);
  });

  it('defaults to the Stripe sandbox wallet, unchanged by checksumming', () => {
    const selected = '0x44934055428d2eF7E3F97D98187f2459007fa49F';

    expect(kalshiDemoPayoutWallet(selected)).toBe(
      toChecksumHexAddress(DEMO_PAYOUT_WALLET),
    );
    expect(kalshiDemoPayoutWallet(undefined)).toBe(
      toChecksumHexAddress(DEMO_PAYOUT_WALLET),
    );
    expect(kalshiDemoPayoutWallet()).toBe(
      '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c',
    );
  });

  it('defaults the network to base', () => {
    expect(kalshiDemoPayoutNetwork()).toBe(DEMO_PAYOUT_NETWORK);
    expect(kalshiDemoPayoutNetwork()).toBe('base');
  });
});
