import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { PredictVenueEnvironment } from '../../types';
import {
  DEMO_PAYOUT_NETWORK,
  DEMO_PAYOUT_WALLET,
  type KalshiWalletNetwork,
} from './demoOnboardingConfig';

export type KalshiPayoutDestinationMode =
  | { kind: 'demo'; address: string; network: KalshiWalletNetwork }
  | { kind: 'production'; network: KalshiWalletNetwork };

/**
 * Which lane onboarding runs in, from the venue catalog's `environment`.
 * Sandbox keeps the fixed Stripe sandbox wallet. Production asks the user to
 * confirm one of their EVM accounts, and the API decides whether that is
 * allowed: it records the address at activation and only pays out to the
 * record when `KALSHI_PRODUCTION_WITHDRAWALS` is on. Unknown environments
 * resolve to `undefined`, which keeps the sheet closed.
 */
export function resolveKalshiPayoutDestinationMode(
  environment: PredictVenueEnvironment | undefined,
): KalshiPayoutDestinationMode | undefined {
  if (environment === 'sandbox') {
    return {
      kind: 'demo',
      address: toChecksumHexAddress(DEMO_PAYOUT_WALLET),
      network: DEMO_PAYOUT_NETWORK,
    };
  }
  if (environment === 'production') {
    return { kind: 'production', network: 'base' };
  }
  return undefined;
}
