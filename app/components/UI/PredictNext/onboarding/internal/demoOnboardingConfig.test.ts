import { toChecksumHexAddress } from '@metamask/controller-utils';

import {
  DEMO_PAYOUT_WALLET,
  DEMO_PAYOUT_NETWORK,
} from './demoOnboardingConfig';

describe('demoOnboardingConfig', () => {
  it('keeps the sandbox wallet checksummed', () => {
    expect(toChecksumHexAddress(DEMO_PAYOUT_WALLET)).toBe(DEMO_PAYOUT_WALLET);
  });

  it('defaults the network to base', () => {
    expect(DEMO_PAYOUT_NETWORK).toBe('base');
  });
});
