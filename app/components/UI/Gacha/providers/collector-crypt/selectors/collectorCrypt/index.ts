import { createSelector, weakMapMemoize } from 'reselect';

import type { RootState } from '../../../../../../../reducers';
import {
  getDefaultCollectorCryptState,
  type CollectorCryptState,
} from '../../state';
import type { CollectorCryptCard, PackOperation } from '../../types';
import { getVisibleCards } from '../../utils/cards';
import { getAttentionOperations } from '../../utils/operations';

const DEFAULT_STATE = getDefaultCollectorCryptState();

/** Memoizes per input reference, so each address keeps its own cache. */
const perAddressMemoize = {
  memoize: weakMapMemoize,
  argsMemoize: weakMapMemoize,
} as const;

/**
 * CollectorCrypt provider state, or the default state before init.
 *
 * @param state - Redux state.
 * @returns The provider state.
 */
export const selectCollectorCryptState = (
  state: RootState,
): CollectorCryptState =>
  state.engine.backgroundState.GachaController?.collectorCrypt ?? DEFAULT_STATE;

/**
 * Cards of an account, by mint.
 *
 * @param state - Redux state.
 * @param address - Solana address.
 * @returns The cards, or undefined.
 */
const selectAccountCards = (
  state: RootState,
  address: string | undefined,
): Record<string, CollectorCryptCard> | undefined =>
  address ? selectCollectorCryptState(state).cards[address] : undefined;

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
): Record<string, PackOperation> | undefined =>
  address ? selectCollectorCryptState(state).operations[address] : undefined;

/** Visible cards of an account (sold ones hidden), newest first. */
export const selectCollectorCryptCards: (
  state: RootState,
  address: string | undefined,
) => CollectorCryptCard[] = createSelector(
  [selectAccountCards],
  getVisibleCards,
  perAddressMemoize,
);

/**
 * One card of an account.
 *
 * @param state - Redux state.
 * @param address - Solana address.
 * @param mint - Card mint.
 * @returns The card, or undefined.
 */
export const selectCollectorCryptCard = (
  state: RootState,
  address: string | undefined,
  mint: string,
): CollectorCryptCard | undefined => selectAccountCards(state, address)?.[mint];

/**
 * One pack operation of an account.
 *
 * @param state - Redux state.
 * @param address - Solana address.
 * @param memo - Pack memo.
 * @returns The operation, or undefined.
 */
export const selectCollectorCryptOperation = (
  state: RootState,
  address: string | undefined,
  memo: string,
): PackOperation | undefined => selectAccountOperations(state, address)?.[memo];

/** Operations the UI must surface for an account, newest first. */
export const selectCollectorCryptAttentionOperations: (
  state: RootState,
  address: string | undefined,
) => PackOperation[] = createSelector(
  [selectAccountOperations],
  getAttentionOperations,
  perAddressMemoize,
);
