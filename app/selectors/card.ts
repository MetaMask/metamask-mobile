import { createSelector } from 'reselect';
import { RootState } from '../reducers';

/**
 * Base selector for card state
 */
export const selectCardState = (state: RootState) => state.card;

/**
 * Selector for cardholder accounts
 */
export const selectCardholderAccounts = createSelector(
  [selectCardState],
  (card) => card.cardholderAccounts,
);

/**
 * Selector for card loading state
 */
export const selectIsCardLoading = createSelector(
  [selectCardState],
  (card) => card.isLoading,
);

/**
 * Selector for card loaded state
 */
export const selectIsCardDataLoaded = createSelector(
  [selectCardState],
  (card) => card.isLoaded,
);

/**
 * Selector for checking if any accounts are cardholders
 */
export const selectHasCardholderAccounts = createSelector(
  [selectCardholderAccounts],
  (cardholderAccounts) => cardholderAccounts.length > 0,
);
