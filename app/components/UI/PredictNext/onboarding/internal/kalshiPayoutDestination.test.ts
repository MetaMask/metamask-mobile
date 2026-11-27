import type { PredictVenueEnvironment } from '../../types';
import {
  DEMO_PAYOUT_NETWORK,
  DEMO_PAYOUT_WALLET,
} from './demoOnboardingConfig';
import { resolveKalshiPayoutDestinationMode } from './kalshiPayoutDestination';

describe('resolveKalshiPayoutDestinationMode', () => {
  it('uses the sandbox destination', () => {
    expect(resolveKalshiPayoutDestinationMode('sandbox')).toEqual({
      kind: 'demo',
      address: DEMO_PAYOUT_WALLET,
      network: DEMO_PAYOUT_NETWORK,
    });
  });
  it('requires a production destination', () => {
    expect(resolveKalshiPayoutDestinationMode('production')).toEqual({
      kind: 'production',
      network: 'base',
    });
  });
  it('rejects missing and unknown environments', () => {
    expect(resolveKalshiPayoutDestinationMode(undefined)).toBeUndefined();
    expect(
      resolveKalshiPayoutDestinationMode('other' as PredictVenueEnvironment),
    ).toBeUndefined();
  });
});
