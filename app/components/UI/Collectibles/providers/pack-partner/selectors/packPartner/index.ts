import { createSelector, weakMapMemoize } from 'reselect';

import type { RootState } from '../../../../../../../reducers';
import { getDefaultPackPartnerState, type PackPartnerState } from '../../state';
import type {
  PackPartnerBuybackOperation,
  PackPartnerPackOperation,
} from '../../types';
import { getAttentionOperations } from '../../utils/operations';

const DEFAULT_STATE = getDefaultPackPartnerState();

/** Memoizes per input reference, so each address keeps its own cache. */
const perAddressMemoize = {
  memoize: weakMapMemoize,
  argsMemoize: weakMapMemoize,
} as const;

/**
 * PackPartner provider state, or the default state before init.
 *
 * @param state - Redux state.
 * @returns The provider state.
 */
export const selectPackPartnerState = (state: RootState): PackPartnerState =>
  state.engine.backgroundState.CollectiblesController?.packPartner ??
  DEFAULT_STATE;

/**
 * Buyback operations of an account, by mint.
 *
 * @param state - Redux state.
 * @param address - Solana address.
 * @returns The buyback operations, or undefined.
 */
export const selectPackPartnerSales = (
  state: RootState,
  address: string | undefined,
): Record<string, PackPartnerBuybackOperation> | undefined =>
  address ? selectPackPartnerState(state).sales[address] : undefined;

/**
 * Operations of an account, by memo.
 *
 * @param state - Redux state.
 * @param address - Solana address.
 * @returns The operations, or undefined.
 */
const selectAccountOperations = (
  state: RootState,
  address: string | undefined,
): Record<string, PackPartnerPackOperation> | undefined =>
  address ? selectPackPartnerState(state).operations[address] : undefined;

/**
 * One pack operation of an account.
 *
 * @param state - Redux state.
 * @param address - Solana address.
 * @param memo - Pack memo.
 * @returns The operation, or undefined.
 */
export const selectPackPartnerOperation = (
  state: RootState,
  address: string | undefined,
  memo: string,
): PackPartnerPackOperation | undefined =>
  selectAccountOperations(state, address)?.[memo];

/** Operations the UI must surface for an account, newest first. */
export const selectPackPartnerAttentionOperations: (
  state: RootState,
  address: string | undefined,
) => PackPartnerPackOperation[] = createSelector(
  [selectAccountOperations],
  getAttentionOperations,
  perAddressMemoize,
);
