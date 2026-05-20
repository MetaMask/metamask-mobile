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
import { buildDelegationTokenList } from '../components/UI/Card/util/buildTokenList';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { isEthAccount } from '../core/Multichain/utils';
import { isMoneyAccountDelegatedForCard } from '../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { selectPrimaryMoneyAccount } from './moneyAccountController';
import { selectCardFeatureFlag } from './featureFlagController/card';

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

/**
 * Card tokens visible to the user, scoped to the currently selected EVM
 * account. Inactive placeholders are synthesized at projection time from
 * `delegationSettings`, which is why account switches do not require a refetch.
 */
export const selectCardAvailableTokens = createSelector(
  selectCardHomeData,
  selectSelectedEvmAccount,
  selectCardFeatureFlag,
  (data, selectedAccount, cardFeatureFlag): CardFundingToken[] => {
    const currentAddress = selectedAccount?.address;
    const currentAddressLower = currentAddress?.toLowerCase();
    const fundingAssets = data?.fundingAssets ?? [];
    const delegationSettings = data?.delegationSettings ?? null;

    const realEntries = fundingAssets
      .filter((asset) => {
        if (!currentAddressLower) return true;
        // Active/Limited: shown for any linked wallet.
        if (
          asset.status === FundingAssetStatus.Active ||
          asset.status === FundingAssetStatus.Limited
        ) {
          return true;
        }
        // Inactive: only shown for the current wallet to avoid duplicate rows.
        const assetWallet = asset.walletAddress?.toLowerCase();
        return !assetWallet || assetWallet === currentAddressLower;
      })
      .map(toCardFundingToken);

    const currentWalletTokenKeys = new Set(
      realEntries
        .filter((t) => t.walletAddress?.toLowerCase() === currentAddressLower)
        .map((t) => `${t.address?.toLowerCase()}-${t.caipChainId}`),
    );

    const placeholders = buildDelegationTokenList({
      delegationSettings,
      getSupportedTokensByChainId: (chainId) =>
        (cardFeatureFlag?.chains?.[chainId]?.tokens ?? []).map((t) => ({
          address: t.address ?? undefined,
          symbol: t.symbol ?? undefined,
          name: t.name ?? undefined,
        })),
    })
      .filter(
        (placeholder) =>
          !currentWalletTokenKeys.has(
            `${placeholder.address?.toLowerCase()}-${placeholder.caipChainId}`,
          ),
      )
      .map((placeholder) => ({
        ...placeholder,
        walletAddress: currentAddress ?? '',
      }));

    return [...realEntries, ...placeholders];
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
  selectCardAvailableTokens,
  (tokens): CardFundingToken | null =>
    tokens.find(
      (token) =>
        token.caipChainId === LINEA_MAINNET_CAIP_CHAIN_ID &&
        token.symbol?.toUpperCase() === CASHBACK_FUNDING_SYMBOL,
    ) ?? null,
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
