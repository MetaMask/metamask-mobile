// PROTOTYPE-DO-NOT-MERGE: Card home prototype switch, dev builds only.
// Set CARD_HOME_PROTOTYPE_SETTING to 'FUNDED' | 'ZERO' | 'LOADING' |
// 'SPENDING_LIMIT' to fake a signed-in Baanx cardholder with an active card
// (and the cashback panel prototype states). null = real behaviour. Release
// builds always get null, so nothing fake can ship.
export type CardHomePrototypeView =
  | 'FUNDED'
  | 'ZERO'
  | 'LOADING'
  | 'SPENDING_LIMIT'
  | null;
const CARD_HOME_PROTOTYPE_SETTING = null as CardHomePrototypeView;
export const CARD_HOME_PROTOTYPE_VIEW: CardHomePrototypeView = __DEV__
  ? CARD_HOME_PROTOTYPE_SETTING
  : null;
import { createSelector, createSelectorCreator, lruMemoize } from 'reselect';
import { deepEqual } from 'fast-equals';
import { type CaipChainId } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  DEFAULT_CARD_PROVIDER_ID,
  type CardUnauthenticatedReason,
  type CardControllerState,
  type CardHomeDataError,
  type CardHomeDataStatus,
  type CardLink,
  type CardRedeemWithdrawal,
} from '../core/Engine/controllers/card-controller/types';
import {
  CardProviderIds,
  FundingAssetStatus,
  type CardHomeData,
  type CardProviderId,
  type CardSignInLink,
} from '../core/Engine/controllers/card-controller/provider-types';
import {
  CardType,
  FundingStatus,
  type CardLocation,
  type CardFundingToken,
  type CardWalletExternalPriorityResponse,
  type DelegationSettingsResponse,
} from '../components/UI/Card/types';
import { toCardFundingToken } from '../components/UI/Card/util/toCardTokenAllowance';
import { buildDelegationTokenList } from '../components/UI/Card/util/buildTokenList';
import { isMoneyAccountEntry } from '../components/UI/Card/util/isMoneyAccountEntry';
import {
  isMoneyAccountPriorityEntry,
  resolveReceivingPriorityEntry,
} from '../components/UI/Card/util/redeemDestination';
import {
  getVedaTokenConfig,
  getVedaTokenConfigFromFeatureFlag,
  MONEY_ACCOUNT_DISPLAY_SYMBOL,
  type VedaTokenConfig,
} from '../components/UI/Card/util/vedaToken';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import {
  isMoneyAccountDelegatedForCard,
  isAnyMoneyAccountDelegatedForCard,
} from '../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { selectPrimaryMoneyAccount } from './moneyAccountController';
import { selectRemoteFeatureFlags } from './featureFlagController';
import {
  isMoneyAccountFundingChannel,
  resolveImmersveFundingChannel,
  selectCardFeatureFlag,
  selectCardLinkApiEnabled,
  type CardRemoteFeatureFlags,
} from './featureFlagController/card';
import { pickRoutableCardLink } from '../core/Engine/controllers/card-controller/utils/cardLinks';
import { selectMoneyAccountGeoBlockedCountries } from '../components/UI/Money/selectors/featureFlags';
import {
  buildCardResidencyRegion,
  isCardResidencyInBlockedRegions,
} from '../components/UI/Card/util/residency';

/**
 * Selector creator that keeps the previous result reference when the new
 * result is deep-equal. Cheap for small card token lists; avoids cascading
 * re-renders when `cardHomeData` is reassigned with an identical payload.
 */
const createStableListSelector = createSelectorCreator(lruMemoize, {
  resultEqualityCheck: deepEqual,
});

const EMPTY_EXTERNAL_WALLET_PRIORITY: CardWalletExternalPriorityResponse[] = [];
const EMPTY_CARD_FUNDING_TOKENS: CardFundingToken[] = [];

const FUNDING_STATUS_ORDER: Record<FundingStatus, number> = {
  [FundingStatus.Enabled]: 0,
  [FundingStatus.Limited]: 1,
  [FundingStatus.NotEnabled]: 2,
};

/**
 * Deterministic ordering preserved from the previous server-sorted
 * `availableFundingAssets`: tokens with an explicit priority come first
 * (ascending), then everything else by status (Enabled → Limited → NotEnabled).
 */
const sortCardFundingTokens = (
  tokens: CardFundingToken[],
): CardFundingToken[] =>
  [...tokens].sort((a, b) => {
    const aHasPriority = typeof a.priority === 'number' && a.priority > 0;
    const bHasPriority = typeof b.priority === 'number' && b.priority > 0;
    if (aHasPriority && bHasPriority) {
      return (a.priority as number) - (b.priority as number);
    }
    if (aHasPriority) return -1;
    if (bHasPriority) return 1;
    return (
      (FUNDING_STATUS_ORDER[a.fundingStatus] ?? 2) -
      (FUNDING_STATUS_ORDER[b.fundingStatus] ?? 2)
    );
  });

// PROTOTYPE-DO-NOT-MERGE: fake a signed-in cardholder with an active card so
// Card home opens straight away (only while CARD_HOME_PROTOTYPE_VIEW is set).
const buildMockCardHomeData = (walletAddress: string) => {
  // PROTOTYPE-DO-NOT-MERGE
  const isLimit = CARD_HOME_PROTOTYPE_VIEW === 'SPENDING_LIMIT';
  const balance = CARD_HOME_PROTOTYPE_VIEW === 'ZERO' ? '0' : '125.40';
  const primaryFundingAsset = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    walletAddress,
    decimals: 6,
    chainId: 'eip155:59144',
    spendableBalance: balance,
    spendingCap: isLimit ? '375' : '1000000000',
    ...(isLimit ? { originalSpendingCap: '500' } : {}),
    priority: 1,
    status: isLimit ? FundingAssetStatus.Limited : FundingAssetStatus.Active,
  };
  return {
    primaryFundingAsset,
    fundingAssets: [primaryFundingAsset],
    availableFundingAssets: [],
    card: {
      id: 'mock-card-id',
      status: 'ACTIVE',
      type: 'VIRTUAL',
      lastFour: '4821',
      holderName: 'Alex Prototype',
      isFreezable: true,
      hasPin: true,
    },
    account: {
      verificationStatus: 'VERIFIED',
      holderName: 'Alex Prototype',
      shippingAddress: null,
      countryOfResidence: null,
      usState: null,
      createdAt: '2026-01-15T10:00:00.000Z',
    },
    walletProvisioning: null,
    alerts: [],
    actions: [{ type: 'add_funds', enabled: true }],
    delegationSettings: null,
  } as unknown as CardHomeData;
};
let mockLastInput: CardControllerState | undefined; // PROTOTYPE-DO-NOT-MERGE
let mockLastAddress: string | undefined; // PROTOTYPE-DO-NOT-MERGE
let mockLastOutput: CardControllerState | undefined; // PROTOTYPE-DO-NOT-MERGE
const selectCardControllerState = (state: RootState) => {
  // PROTOTYPE-DO-NOT-MERGE
  const real = state.engine?.backgroundState?.CardController;
  if (!CARD_HOME_PROTOTYPE_VIEW) return real;
  const evm = selectSelectedInternalAccountByScope(state)('eip155:0');
  const address = evm?.address ?? '0x0000000000000000000000000000000000c0ffee';
  if (mockLastOutput && real === mockLastInput && address === mockLastAddress)
    return mockLastOutput;
  mockLastInput = real;
  mockLastAddress = address;
  const isLoadingView = CARD_HOME_PROTOTYPE_VIEW === 'LOADING';
  mockLastOutput = {
    ...(real ?? {}),
    activeProviderId: 'baanx',
    isAuthenticated: true,
    lastUnauthenticatedReason: null,
    cardholderAccounts: [`eip155:0:${address}`],
    providerData: {
      ...(real?.providerData ?? {}),
      baanx: {
        ...((real?.providerData as Record<string, object> | undefined)?.baanx ??
          {}),
        location: 'international',
      },
    },
    cardHomeData: isLoadingView ? null : buildMockCardHomeData(address),
    cardHomeDataStatus: isLoadingView ? 'loading' : 'success',
    cardHomeDataError: null,
    cardHomeDataFetchedThisSession: true,
  } as unknown as CardControllerState;
  return mockLastOutput;
};

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

/**
 * Funding channel for the selected country. Null when that country is not
 * claimed by Immersve, or its channel does not resolve.
 */
export const selectImmersveFundingChannelForSelectedCountry = createSelector(
  selectRemoteFeatureFlags,
  selectCardSelectedCountry,
  (flags, country) =>
    resolveImmersveFundingChannel(flags as CardRemoteFeatureFlags, country),
);

/**
 * True when the active card provider is Immersve and the selected country's
 * funding channel spends from the Money account.
 */
export const selectImmersveMoneyAccountMode = createSelector(
  selectCardActiveProviderId,
  selectImmersveFundingChannelForSelectedCountry,
  (providerId, channel): boolean =>
    providerId === CardProviderIds.Immersve &&
    isMoneyAccountFundingChannel(channel),
);

export const selectIsCardAuthenticated = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.isAuthenticated ?? false,
);

export const selectCardSignInLink = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): CardSignInLink | null =>
    (cardState?.signInLink as unknown as CardSignInLink | null) ?? null,
);

export const selectHasCardSignInLink = createSelector(
  selectCardSignInLink,
  (link) => link !== null,
);

export const selectHasCompletedCardMigration = createSelector(
  selectCardSignInLink,
  (link) => link?.status === 'completed',
);

export const selectCardProviderUserId = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.providerUserId ?? null,
);

export const selectCardLastUnauthenticatedReason = createSelector(
  selectCardControllerState,
  (
    cardState: CardControllerState | undefined,
  ): CardUnauthenticatedReason | null =>
    cardState?.lastUnauthenticatedReason ?? null,
);

export const selectIsMoneyAccountCardLinkInProgress = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    cardState?.moneyAccountCardLinkInProgress ?? false,
);

export const selectCardRedeemWithdrawal = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined) =>
    (cardState?.redeemWithdrawal as CardRedeemWithdrawal | null) ?? null,
);

const selectSelectedEvmAccount = (state: RootState) =>
  selectSelectedInternalAccountByScope(state)('eip155:0');

/** `null` while card links are off (flag, or a 403 from Card API). */
export const selectCardLinks = createSelector(
  selectCardControllerState,
  selectCardLinkApiEnabled,
  (
    cardState: CardControllerState | undefined,
    cardLinkApiEnabled,
  ): CardLink[] | null =>
    cardLinkApiEnabled && !cardState?.cardLinkApiBlocked
      ? (cardState?.cardLinks ?? null)
      : null,
);

/** `active` wins over `onboarding`; `closed` rows are ignored; ties go to the newest row. */
const selectRoutableCardLink = createSelector(
  selectCardLinks,
  (links): CardLink | null => pickRoutableCardLink(links),
);

export const selectLinkedCardProvider = createSelector(
  selectRoutableCardLink,
  (link): CardProviderId | null => link?.provider ?? null,
);

/** A routable stored link. Off, blocked, or not yet fetched means no card. */
export const selectHasCard = createSelector(
  selectRoutableCardLink,
  (link) => link !== null,
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

export const selectCardVerificationStatus = createSelector(
  selectCardHomeData,
  (data): string | null => data?.account?.verificationStatus ?? null,
);

export const selectIsCardVerified = createSelector(
  selectCardVerificationStatus,
  (status) => status === 'VERIFIED',
);

export const selectCardHomeDataStatus = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): CardHomeDataStatus =>
    cardState?.cardHomeDataStatus ?? 'idle',
);

export const selectCardHomeDataError = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): CardHomeDataError | null =>
    (cardState?.cardHomeDataError as CardHomeDataError | null) ?? null,
);

export const selectCardHomeDataFetchedThisSession = createSelector(
  selectCardControllerState,
  (cardState: CardControllerState | undefined): boolean =>
    cardState?.cardHomeDataFetchedThisSession ?? false,
);

/**
 * Card home data has settled, or this user never fetches it. Logged-out users
 * do not fetch: the dashboard requires a provider session. Verification
 * status is a separate wait: some providers do not report one.
 */
export const selectIsCardHomeDataResolved = createSelector(
  selectCardHomeDataStatus,
  selectCardHomeData,
  selectIsCardAuthenticated,
  (status, cardHomeData, isAuthenticated) =>
    status === 'success' || cardHomeData !== null || !isAuthenticated,
);

export const selectIsCardStateResolved = createSelector(
  selectIsCardHomeDataResolved,
  selectCardVerificationStatus,
  selectIsCardAuthenticated,
  selectHasCard,
  (homeDataResolved, verificationStatus, isAuthenticated, hasCard) =>
    (homeDataResolved && (!isAuthenticated || verificationStatus !== null)) ||
    (!isAuthenticated && !hasCard),
);

export const selectMoneyAccountVedaTokenConfig = createSelector(
  selectCardFeatureFlag,
  selectImmersveMoneyAccountMode,
  selectImmersveFundingChannelForSelectedCountry,
  (
    cardFeatureFlag,
    isImmersveMoneyAccountMode,
    channel,
  ): VedaTokenConfig | null => {
    if (isImmersveMoneyAccountMode && isMoneyAccountFundingChannel(channel)) {
      return {
        caipChainId: channel.caipChainId,
        address: channel.tokenAddress,
        decimals: channel.decimals,
        delegationContract: channel.spenderAddress,
      };
    }
    return getVedaTokenConfigFromFeatureFlag(cardFeatureFlag?.chains);
  },
);

export const selectCardCountryOfResidence = createSelector(
  selectCardHomeData,
  (data): string | null => data?.account?.countryOfResidence ?? null,
);

export const selectCardUsState = createSelector(
  selectCardHomeData,
  (data): string | null => data?.account?.usState ?? null,
);

export const selectCardResidencyRegion = createSelector(
  selectCardCountryOfResidence,
  selectCardUsState,
  (countryOfResidence, usState): string | null =>
    buildCardResidencyRegion(countryOfResidence, usState),
);

const selectCardResidencyBlockedRegions = (state: RootState): string[] =>
  selectMoneyAccountGeoBlockedCountries(state);

export const selectIsCardResidencyBlocked = createSelector(
  selectCardResidencyRegion,
  selectCardResidencyBlockedRegions,
  (residencyRegion, blockedRegions): boolean =>
    isCardResidencyInBlockedRegions(residencyRegion, blockedRegions),
);

const toFundingTokenWithVedaContext = (
  asset: Parameters<typeof toCardFundingToken>[0],
  vedaConfig: VedaTokenConfig | null,
): CardFundingToken => {
  const isVedaEntry =
    asset.fundingSourceType === 'moneyAccount' ||
    isMoneyAccountEntry(
      {
        address: asset.address,
        stagingTokenAddress: asset.stagingTokenAddress,
        caipChainId: asset.chainId,
        symbol: asset.symbol,
      },
      vedaConfig,
    );
  return toCardFundingToken(
    asset,
    isVedaEntry,
    isVedaEntry ? MONEY_ACCOUNT_DISPLAY_SYMBOL : undefined,
  );
};

export const selectHasMetalCard = createSelector(
  selectCardHomeData,
  (data): boolean => data?.card?.type === CardType.METAL,
);

export const selectCardPrimaryToken = createStableListSelector(
  selectCardHomeData,
  selectMoneyAccountVedaTokenConfig,
  (data, vedaConfig): CardFundingToken | null =>
    data?.primaryFundingAsset
      ? toFundingTokenWithVedaContext(data.primaryFundingAsset, vedaConfig)
      : null,
);

/**
 * Card tokens visible to the user, scoped to the currently selected EVM
 * account. Inactive placeholders are synthesized at projection time from
 * `delegationSettings`, which is why account switches do not require a refetch.
 */
export const selectCardAvailableTokens = createStableListSelector(
  selectCardHomeData,
  selectSelectedEvmAccount,
  selectCardFeatureFlag,
  selectMoneyAccountVedaTokenConfig,
  selectIsCardResidencyBlocked,
  (
    data,
    selectedAccount,
    cardFeatureFlag,
    vedaConfig,
    isResidencyBlocked,
  ): CardFundingToken[] => {
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
      .map((asset) => toFundingTokenWithVedaContext(asset, vedaConfig));

    if (!currentAddress) {
      return realEntries.length === 0 ? EMPTY_CARD_FUNDING_TOKENS : realEntries;
    }

    const currentWalletTokenKeys = new Set(
      realEntries
        .filter((t) => t.walletAddress?.toLowerCase() === currentAddressLower)
        .map((t) => `${t.address?.toLowerCase()}-${t.caipChainId}`),
    );

    const placeholders = buildDelegationTokenList({
      delegationSettings,
      enforceSupportList: true,
      getSupportedTokensByChainId: (chainId) =>
        (cardFeatureFlag?.chains?.[chainId]?.tokens ?? [])
          .filter((t) => t?.enabled !== false)
          .map((t) => ({
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
        walletAddress: currentAddress,
        isMoneyAccountEntry: isMoneyAccountEntry(placeholder, vedaConfig),
      }))
      .filter(
        (placeholder) =>
          !isResidencyBlocked || !placeholder.isMoneyAccountEntry,
      );

    const combined = [...realEntries, ...placeholders];
    if (combined.length === 0) {
      return EMPTY_CARD_FUNDING_TOKENS;
    }
    return sortCardFundingTokens(combined);
  },
);

export const selectCardFundingTokens = createStableListSelector(
  selectCardHomeData,
  selectMoneyAccountVedaTokenConfig,
  (data, vedaConfig): CardFundingToken[] => {
    const assets = data?.fundingAssets ?? [];
    if (assets.length === 0) {
      return EMPTY_CARD_FUNDING_TOKENS;
    }
    return assets.map((asset) =>
      toFundingTokenWithVedaContext(asset, vedaConfig),
    );
  },
);

export const selectCardExternalWalletPriority = createSelector(
  selectCardHomeData,
  (data): CardWalletExternalPriorityResponse[] =>
    data?.externalWalletPriority ?? EMPTY_EXTERNAL_WALLET_PRIORITY,
);

export const selectCardDelegationSettings = createSelector(
  selectCardHomeData,
  (data): DelegationSettingsResponse | null => data?.delegationSettings ?? null,
);

export const selectCardRedemptionDestinationIsMoneyAccount = createSelector(
  selectCardExternalWalletPriority,
  selectMoneyAccountVedaTokenConfig,
  selectCardDelegationSettings,
  selectIsCardResidencyBlocked,
  selectPrimaryMoneyAccount,
  (
    priorities,
    vedaConfig,
    delegationSettings,
    isResidencyBlocked,
    primaryMoneyAccount,
  ): boolean => {
    const top = resolveReceivingPriorityEntry(priorities);
    const resolvedVedaConfig =
      vedaConfig ?? getVedaTokenConfig(delegationSettings);
    return top
      ? isMoneyAccountPriorityEntry(top, resolvedVedaConfig)
      : !isResidencyBlocked && Boolean(primaryMoneyAccount);
  },
);

export const selectCardDelegationToken = createSelector(
  [
    selectCardHomeData,
    selectSelectedEvmAccount,
    selectCardFeatureFlag,
    selectMoneyAccountVedaTokenConfig,
    (
      _state: RootState,
      params: { caipChainId?: CaipChainId; symbol?: string },
    ) => params.caipChainId,
    (
      _state: RootState,
      params: { caipChainId?: CaipChainId; symbol?: string },
    ) => params.symbol,
  ],
  (
    data,
    selectedAccount,
    cardFeatureFlag,
    vedaConfig,
    caipChainId,
    symbol,
  ): CardFundingToken | null => {
    if (!caipChainId || !symbol) {
      return null;
    }
    const target = symbol.toUpperCase();

    const realAsset = (data?.fundingAssets ?? []).find(
      (asset) =>
        asset.chainId === caipChainId && asset.symbol?.toUpperCase() === target,
    );
    if (realAsset) return toFundingTokenWithVedaContext(realAsset, vedaConfig);

    const placeholder = buildDelegationTokenList({
      delegationSettings: data?.delegationSettings ?? null,
      getSupportedTokensByChainId: (chainId) =>
        (cardFeatureFlag?.chains?.[chainId]?.tokens ?? []).map((t) => ({
          address: t.address ?? undefined,
          symbol: t.symbol ?? undefined,
          name: t.name ?? undefined,
        })),
    }).find(
      (token) =>
        token.caipChainId === caipChainId &&
        token.symbol?.toUpperCase() === target,
    );

    if (!placeholder) return null;
    if (!selectedAccount?.address) return placeholder;

    return {
      ...placeholder,
      walletAddress: selectedAccount.address,
      isMoneyAccountEntry: isMoneyAccountEntry(placeholder, vedaConfig),
    };
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
  selectMoneyAccountVedaTokenConfig,
  (fundingTokens, primaryMoneyAccount, vedaConfig): boolean =>
    isMoneyAccountDelegatedForCard({
      fundingTokens,
      moneyAccountAddress: primaryMoneyAccount?.address,
      vedaConfig,
    }),
);

export const selectIsAnyMoneyAccountDelegatedForCard = createSelector(
  selectCardFundingTokens,
  selectMoneyAccountVedaTokenConfig,
  (fundingTokens, vedaConfig): boolean =>
    isAnyMoneyAccountDelegatedForCard({ fundingTokens, vedaConfig }),
);
