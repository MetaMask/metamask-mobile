import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../reducers';
import {
  CardControllerState,
  CardAccountState,
} from '../../core/Engine/controllers/card-controller/types';

/**
 * Get the CardController state from Redux
 */
export const selectCardControllerState = (
  state: RootState,
): CardControllerState | undefined =>
  state.engine.backgroundState.CardController;

/**
 * Get the complete account state for a specific address
 */
export const selectCardAccountState = createSelector(
  [selectCardControllerState, (_: RootState, address: string) => address],
  (cardControllerState, address): CardAccountState | null =>
    !cardControllerState || !address
      ? null
      : cardControllerState.accounts[address] || null,
);

/**
 * Check if a specific address is a cardholder (per-wallet on-chain data)
 */
export const selectIsCardholder = createSelector(
  [selectCardAccountState],
  (accountState): boolean => accountState?.isCardholder || false,
);

/**
 * Check if the user is authenticated (global authentication state)
 */
export const selectIsAuthenticated = createSelector(
  [selectCardControllerState],
  (cardControllerState): boolean =>
    cardControllerState?.global.isAuthenticated || false,
);

/**
 * Get the user's card location (global authentication data)
 */
export const selectUserCardLocation = createSelector(
  [selectCardControllerState],
  (cardControllerState): 'us' | 'international' | null =>
    cardControllerState?.global.userLocation || null,
);

/**
 * Get the loading phase from CardController global state
 */
export const selectCardLoadingPhase = createSelector(
  [selectCardControllerState],
  (cardControllerState) => cardControllerState?.loadingPhase,
);

/**
 * Get the last error from CardController global state
 */
export const selectCardLastError = createSelector(
  [selectCardControllerState],
  (cardControllerState): string | null =>
    cardControllerState?.lastError || null,
);

/**
 * Check if the card feature is enabled
 */
export const selectIsCardFeatureEnabled = createSelector(
  [selectCardControllerState],
  (cardControllerState): boolean =>
    cardControllerState?.global.isFeatureEnabled || false,
);

/**
 * Check if Baanx login is enabled
 */
export const selectIsBaanxLoginEnabled = createSelector(
  [selectCardControllerState],
  (cardControllerState): boolean =>
    cardControllerState?.global.isBaanxLoginEnabled || false,
);

/**
 * Get cardholder accounts list
 */
export const selectCardholderAccounts = createSelector(
  [selectCardControllerState],
  (cardControllerState): string[] =>
    cardControllerState?.global.cardholderAccounts || [],
);

/**
 * Get the active account address
 */
export const selectCardActiveAccount = createSelector(
  [selectCardControllerState],
  (cardControllerState): string | null =>
    cardControllerState?.activeAccount || null,
);
