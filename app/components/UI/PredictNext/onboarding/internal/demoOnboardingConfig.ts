import { toChecksumHexAddress } from '@metamask/controller-utils';

import {
  KALSHI_WALLET_NETWORKS,
  type KalshiWalletNetwork,
} from '../../auth/signing/kalshiOnboardingTemplates';

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;

/**
 * Build env, never a remote flag: this flow must not reach production.
 * Babel inlines `process.env`, so callers pass the value and tests pass it
 * directly.
 */
export const isKalshiDemoOnboardingEnabled = (
  flag: string | undefined = process.env.MM_PREDICT_KALSHI_DEMO_ONBOARDING,
): boolean => flag === 'true';

export const kalshiDemoPayoutNetwork = (
  configured: string | undefined = process.env
    .MM_PREDICT_KALSHI_DEMO_PAYOUT_NETWORK,
): KalshiWalletNetwork =>
  (KALSHI_WALLET_NETWORKS as readonly string[]).includes(configured ?? '')
    ? (configured as KalshiWalletNetwork)
    : 'base';

/**
 * The address the wallet step shows and `wallet_register` signs: the
 * override when Kalshi demo rejects real addresses, otherwise the selected
 * EVM account. EIP-55, because Kalshi requires a checksummed address.
 */
export const kalshiDemoPayoutWallet = (
  selectedEvmAddress: string | undefined,
  override: string | undefined = process.env
    .MM_PREDICT_KALSHI_DEMO_PAYOUT_WALLET,
): string | undefined => {
  const address = override?.trim() || selectedEvmAddress;
  if (!address || !EVM_ADDRESS.test(address)) {
    return undefined;
  }
  return toChecksumHexAddress(address);
};
