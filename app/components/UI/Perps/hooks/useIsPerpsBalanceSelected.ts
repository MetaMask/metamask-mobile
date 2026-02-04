import { toHex } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { usePerpsPaymentToken } from '../contexts/PerpsPaymentTokenContext';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { USDC_ARBITRUM_MAINNET_ADDRESS } from '../constants/hyperLiquidConfig';
import { ARBITRUM_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

/** Address used to represent "Perps balance" as the payment token (synthetic option). */
export const PERPS_BALANCE_PLACEHOLDER_ADDRESS =
  USDC_ARBITRUM_MAINNET_ADDRESS || '0x0000000000000000000000000000000000000001' as Hex;

/** Chain id used for the "Perps balance" payment option. */
export const PERPS_BALANCE_CHAIN_ID = ARBITRUM_CHAIN_ID;

/**
 * Returns whether the user selected the synthetic "Perps balance" option.
 * When inside PerpsPaymentTokenProvider: selectedToken === null means Perps balance selected.
 * When outside provider (e.g. confirmation screen): falls back to payToken (placeholder address).
 */
export function useIsPerpsBalanceSelected(): boolean {
  const { selectedToken } = usePerpsPaymentToken();
  return selectedToken === null;
}
