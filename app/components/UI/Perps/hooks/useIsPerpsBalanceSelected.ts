import type { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { USDC_ARBITRUM_MAINNET_ADDRESS } from '../constants/hyperLiquidConfig';
import { ARBITRUM_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { selectIsPerpsBalanceSelected } from '../selectors/perpsController';

/** Address used to represent "Perps balance" as the payment token (synthetic option). */
export const PERPS_BALANCE_PLACEHOLDER_ADDRESS =
  USDC_ARBITRUM_MAINNET_ADDRESS ||
  ('0x0000000000000000000000000000000000000001' as Hex);

/** Chain id used for the "Perps balance" payment option. */
export const PERPS_BALANCE_CHAIN_ID = ARBITRUM_CHAIN_ID;

/**
 * Returns whether the user selected the synthetic "Perps balance" option.
 * Reads from PerpsController Redux state: selectedPaymentToken === null means Perps balance selected.
 */
export function useIsPerpsBalanceSelected(): boolean {
  return useSelector(selectIsPerpsBalanceSelected);
}
