import { createSelector } from 'reselect';
import { parseCaipAccountId, isCaipAccountId } from '@metamask/utils';
import { RootState } from '../reducers';
import type { CardControllerState } from '../core/Engine/controllers/card-controller/types';
import type { CardLocation } from '../components/UI/Card/types';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { isEthAccount } from '../core/Multichain/utils';

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

export const selectHasCardholderAccounts = createSelector(
  selectCardholderAccounts,
  (accounts) => accounts.length > 0,
);

const selectSelectedEvmAccount = (state: RootState) =>
  selectSelectedInternalAccountByScope(state)('eip155:0');

export const selectIsCardholder = createSelector(
  selectCardholderAccounts,
  selectSelectedEvmAccount,
  (cardholderAccounts, selectedAccount) => {
    if (!selectedAccount || !isEthAccount(selectedAccount)) return false;
    const address = selectedAccount.address?.toLowerCase();
    return cardholderAccounts.some((caipId) => {
      if (!isCaipAccountId(caipId)) return false;
      try {
        return parseCaipAccountId(caipId).address?.toLowerCase() === address;
      } catch {
        return false;
      }
    });
  },
);

export const selectCardUserLocation = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): CardLocation => {
    const pid = cardState?.activeProviderId ?? 'baanx';
    const provData = cardState?.providerData?.[pid] as
      | { location?: string }
      | undefined;
    return (provData?.location as CardLocation) ?? 'international';
  },
);
