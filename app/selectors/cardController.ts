import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import type { CardControllerState } from '../core/Engine/controllers/card-controller/types';

const selectCardControllerState = (state: RootState) =>
  state.engine?.backgroundState?.CardController;

export const selectCardSelectedCountry = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.selectedCountry ?? null,
);

export const selectCardActiveProviderId = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.activeProviderId ?? null,
);

export const selectIsCardAuthenticated = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.isAuthenticated ?? false,
);

export const selectCardholderAccounts = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.cardholderAccounts ?? [],
);
