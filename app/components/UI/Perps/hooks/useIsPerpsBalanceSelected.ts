import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';

/** Address used to represent "Perps balance" as the payment token (synthetic option). */
export const PERPS_BALANCE_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Hex;

/** Chain id used for the "Perps balance" payment option. */
export const PERPS_BALANCE_CHAIN_ID = CHAIN_IDS.MAINNET as Hex;

/**
 * Returns whether the current transaction pay token is the synthetic "Perps balance" option
 * (placeholder address + MAINNET chain).
 */
export function useIsPerpsBalanceSelected(): boolean {
  const { payToken } = useTransactionPayToken();

  return useMemo(
    () =>
      payToken?.address?.toLowerCase() ===
      PERPS_BALANCE_PLACEHOLDER_ADDRESS.toLowerCase() &&
      payToken?.chainId !== undefined &&
      toHex(payToken.chainId) === CHAIN_IDS.MAINNET,
    [payToken?.address, payToken?.chainId],
  );
}
