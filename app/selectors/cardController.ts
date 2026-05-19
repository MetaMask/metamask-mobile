import { createSelector } from 'reselect';
import { parseCaipAccountId, isCaipAccountId } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  DEFAULT_CARD_PROVIDER_ID,
  type CardControllerState,
  type CardHomeDataStatus,
} from '../core/Engine/controllers/card-controller/types';
import {
  FundingAssetStatus,
  type CardHomeData,
} from '../core/Engine/controllers/card-controller/provider-types';
import type {
  CardLocation,
  CardFundingToken,
  DelegationSettingsResponse,
} from '../components/UI/Card/types';
import { toCardFundingToken } from '../components/UI/Card/util/toCardTokenAllowance';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { isEthAccount } from '../core/Multichain/utils';
import { isMoneyAccountDelegatedForCard } from '../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { selectPrimaryMoneyAccount } from './moneyAccountController';

const LINEA_MAINNET_CAIP_CHAIN_ID = 'eip155:59144';
const CASHBACK_FUNDING_SYMBOL = 'USDC';

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
  (cardState: CardControllerState | undefined): CardLocation | null => {
    const pid = cardState?.activeProviderId ?? DEFAULT_CARD_PROVIDER_ID;
    const provData = cardState?.providerData?.[pid] as
      | { location?: string }
      | undefined;
    return (provData?.location as CardLocation) ?? null;
  },
);

export const selectCardHomeData = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): CardHomeData | null =>
    (cardState?.cardHomeData as unknown as CardHomeData | null) ?? null,
);

export const selectCardHomeDataStatus = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): CardHomeDataStatus =>
    cardState?.cardHomeDataStatus ?? 'idle',
);

export const selectCardPrimaryToken = createSelector(
  selectCardHomeData,
  (data): CardFundingToken | null =>
    data?.primaryFundingAsset
      ? toCardFundingToken(data.primaryFundingAsset)
      : null,
);

export const selectCardAvailableTokens = createSelector(
  selectCardHomeData,
  selectSelectedEvmAccount,
  (data, selectedAccount): CardFundingToken[] => {
    const currentAddress = selectedAccount?.address?.toLowerCase();
    return (data?.availableFundingAssets ?? [])
      .filter((asset) => {
        if (!currentAddress) return true;
        // Active/Limited: always show — the user can fund from any linked account.
        if (
          asset.status === FundingAssetStatus.Active ||
          asset.status === FundingAssetStatus.Limited
        ) {
          return true;
        }
        // Inactive: only show for the current account to avoid duplicate "not enabled" rows.
        const assetWallet = asset.walletAddress?.toLowerCase();
        return !assetWallet || assetWallet === currentAddress;
      })
      .map(toCardFundingToken);
  },
);

export const selectCardFundingTokens = createSelector(
  selectCardHomeData,
  (data): CardFundingToken[] =>
    (data?.fundingAssets ?? []).map(toCardFundingToken),
);

export const selectCardDelegationSettings = createSelector(
  selectCardHomeData,
  (data): DelegationSettingsResponse | null => data?.delegationSettings ?? null,
);

export const selectCardHasApprovedLineaFunding = createSelector(
  selectCardHomeData,
  (data): boolean =>
    (data?.fundingAssets ?? []).some(
      (asset) =>
        asset.chainId === LINEA_MAINNET_CAIP_CHAIN_ID &&
        asset.status !== FundingAssetStatus.Inactive,
    ),
);

export const selectCardLineaUsdcToken = createSelector(
  selectCardHomeData,
  (data): CardFundingToken | null => {
    const asset =
      (data?.availableFundingAssets ?? []).find(
        (fundingAsset) =>
          fundingAsset.chainId === LINEA_MAINNET_CAIP_CHAIN_ID &&
          fundingAsset.symbol?.toUpperCase() === CASHBACK_FUNDING_SYMBOL,
      ) ?? null;

    return asset ? toCardFundingToken(asset) : null;
  },
);

/**
 * Returns `true` when the primary Money Account is already delegated for
 * card spending (Monad USDC funding row with allowance not `NotEnabled`).
 *
 * Source of truth for the "this Money Account is already linked to the
 * card" signal — used by the Money feature to suppress the "Link card"
 * CTA and by `useMoneyAccountCardLinkage` to make `canLink` fail closed
 * for already-delegated users.
 */
export const selectIsMoneyAccountDelegatedForCard = createSelector(
  selectCardFundingTokens,
  selectPrimaryMoneyAccount,
  (fundingTokens, primaryMoneyAccount): boolean =>
    isMoneyAccountDelegatedForCard({
      fundingTokens,
      moneyAccountAddress: primaryMoneyAccount?.address,
    }),
);
