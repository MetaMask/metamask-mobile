import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { toHex } from '@metamask/controller-utils';
import { ChainId, type LendingMarket } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { isCaipAssetType, type CaipAssetType, type Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { selectEarnAssetCatalogueInputs } from '../../../../selectors/earnController/earn';
import { pooledStakingSelectors } from '../../../../selectors/earnController/pooledStaking';
import { selectRelayFixedSpread } from '../../../../selectors/featureFlagController/confirmations';
import { buildEvmCaip19AssetId } from '../../../../util/multichain/buildEvmCaip19AssetId';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import {
  isEvmCaip19AssetId,
  isMoneyDepositSupportedToken,
  selectMoneyDepositBlockedTokens,
} from '../../Money/selectors/depositTokens';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { isMoneyDepositFeeSubsidized } from '../../Money/utils/isMoneyDepositFeeSubsidized';
import type { TokenI } from '../../Tokens/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { createEarnRate, parseRatePercent } from '../utils/earnRate';
import type {
  EarnAsset,
  EarnAssetId,
  EarnAssetMetadata,
  EarnAssetRole,
  EarnExperience,
  EarnExperienceDepositReadiness,
  EarnRate,
} from '../types/earnAssets';
import {
  buildEarnAssets,
  createTrackedEarnAsset,
  createUntrackedEarnAsset,
  getAssetEarnId,
  getEarnInputExperiences,
} from '../utils/earnAssets';
import { MIN_EARN_DEPOSIT_BALANCE } from '../utils/earnAssets/earnAssetBalance';
import useEarnSectionLendingMarkets from './useEarnSectionLendingMarkets';
import useEarnSectionTokenMetadata from './useEarnSectionTokenMetadata';
import useTronStakeApy, { FetchStatus } from './useTronStakeApy';

const TRON_MAINNET_CHAIN_ID = ChainId.TRON_MAINNET;
const TRON_MAINNET_CAIP_CHAIN_ID = `tron:${TRON_MAINNET_CHAIN_ID}`;
const TRX_NATIVE_TOKEN_ADDRESS =
  `${TRON_MAINNET_CAIP_CHAIN_ID}/slip44:195` as CaipAssetType;
const ETH_MAINNET_ASSET_ID = 'eip155:1/slip44:60' as CaipAssetType;

const selectMainnetPooledStakingVaultApy =
  pooledStakingSelectors.selectVaultApyForChain(ChainId.ETHEREUM);

interface UseEarnAssetCatalogueOptions {
  enabled?: boolean;
}

/**
 * Provides pooled-staking metadata when the EVM token selector has no selected
 * account or mainnet configuration. A tracked ETH candidate owns metadata
 * during deduplication regardless of insertion order.
 */
const createEthUntrackedMetadata = (): EarnAssetMetadata => ({
  address: getNativeTokenAddress(CHAIN_IDS.MAINNET),
  decimals: 18,
  image: '',
  name: 'Ethereum',
  symbol: 'ETH',
  ticker: 'ETH',
  logo: undefined,
  isETH: true,
  isNative: true,
  isStaked: false,
  chainId: CHAIN_IDS.MAINNET,
});

/**
 * Provides TRX-staking metadata while asynchronous Snap account provisioning
 * has not yet populated wallet tracking state.
 */
const createTrxUntrackedMetadata = (): EarnAssetMetadata => ({
  address: TRX_NATIVE_TOKEN_ADDRESS,
  decimals: 6,
  image: '',
  name: 'TRON',
  symbol: 'TRX',
  ticker: 'TRX',
  logo: undefined,
  isETH: false,
  isNative: true,
  isStaked: false,
  chainId: TRON_MAINNET_CAIP_CHAIN_ID,
});

const getLendingExperienceId = (market: LendingMarket) =>
  `lending:${market.chainId}:${market.protocol}:${market.id}`;

type TokenWithAssetId = TokenI & { assetId?: string };

const getTokenAssetId = (token: TokenWithAssetId): EarnAssetId | undefined => {
  if (token.assetId && isCaipAssetType(token.assetId)) {
    return token.assetId.toLowerCase() as EarnAssetId;
  }
  if (isCaipAssetType(token.address)) {
    return token.address.toLowerCase() as EarnAssetId;
  }
  if (token.isETH && token.chainId === CHAIN_IDS.MAINNET) {
    return ETH_MAINNET_ASSET_ID;
  }
  if (token.isNative && token.chainId) {
    try {
      const chainId = token.chainId as Hex;
      return formatAddressToAssetId(token.address, chainId)?.toLowerCase() as
        | EarnAssetId
        | undefined;
    } catch {
      return undefined;
    }
  }
  if (!token.chainId || token.isNative) {
    return undefined;
  }
  return buildEvmCaip19AssetId(
    token.address,
    token.chainId as Hex,
  ).toLowerCase() as EarnAssetId;
};

const getLendingAssetId = (chainId: number, address: string): EarnAssetId =>
  buildEvmCaip19AssetId(
    address,
    toHex(chainId) as Hex,
  ).toLowerCase() as EarnAssetId;

const getMoneyDepositReadiness = (
  asset: EarnAsset,
  eligibleAssetIds: ReadonlySet<string>,
): EarnExperienceDepositReadiness => {
  if (asset.wallet.status === 'untracked') {
    return { status: 'not_ready', reason: 'asset_not_tracked' };
  }

  if (eligibleAssetIds.has(asset.assetId.toLowerCase())) {
    return { status: 'ready' };
  }

  const fiatBalance = asset.wallet.asset.fiat?.balance;
  return fiatBalance === undefined ||
    fiatBalance === null ||
    !Number.isFinite(Number(fiatBalance))
    ? { status: 'not_ready', reason: 'balance_unavailable' }
    : { status: 'not_ready', reason: 'insufficient_balance' };
};

const getTrackedEarnDepositReadiness = ({
  role,
  isBalanceFiatAvailable,
  balanceFiatNumber,
}: {
  role: EarnAssetRole;
  isBalanceFiatAvailable: boolean | undefined;
  balanceFiatNumber: number;
}): EarnExperienceDepositReadiness => {
  if (role === 'output') {
    return { status: 'not_ready', reason: 'output_asset' };
  }

  if (!isBalanceFiatAvailable || !Number.isFinite(balanceFiatNumber)) {
    return { status: 'not_ready', reason: 'balance_unavailable' };
  }

  if (balanceFiatNumber < MIN_EARN_DEPOSIT_BALANCE) {
    return { status: 'not_ready', reason: 'insufficient_balance' };
  }

  return { status: 'ready' };
};

const getTrackedEarnExperiences = ({
  token,
  assetId,
  role,
  trxRate,
  isPooledStakingEnabled,
  isStablecoinLendingEnabled,
  isTrxStakingEnabled,
}: {
  token: ReturnType<
    typeof selectEarnAssetCatalogueInputs
  >['earnTokens'][number];
  assetId: EarnAssetId;
  role: Exclude<EarnAssetRole, 'funding'>;
  trxRate: EarnRate;
  isPooledStakingEnabled: boolean;
  isStablecoinLendingEnabled: boolean;
  isTrxStakingEnabled: boolean;
}): EarnExperience[] =>
  token.experiences.flatMap((experience) => {
    const isPooledStaking = experience.type === EARN_EXPERIENCES.POOLED_STAKING;
    const isTrxStaking = experience.type === EARN_EXPERIENCES.TRX_STAKING;

    /**
     * Staking output assets are not part of this catalogue. Lending output
     * associations are retained and filtered from user-facing strategies.
     */
    if (
      isPooledStaking &&
      (!isPooledStakingEnabled ||
        role === 'output' ||
        assetId !== ETH_MAINNET_ASSET_ID)
    ) {
      return [];
    }
    if (isTrxStaking && (!isTrxStakingEnabled || role === 'output')) {
      return [];
    }
    if (
      experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING &&
      !isStablecoinLendingEnabled
    ) {
      return [];
    }

    // Markets only available for stablecoin lending.
    const market = experience.market;
    const rate = isTrxStaking
      ? trxRate
      : createEarnRate({
          type: isPooledStaking ? 'APR' : 'APY',
          percentage: parseRatePercent(experience.apr),
        });

    return [
      {
        id: market
          ? getLendingExperienceId(market)
          : isTrxStaking
            ? `trx-staking:${TRX_NATIVE_TOKEN_ADDRESS}`
            : `pooled:${assetId}`,
        type: experience.type,
        role,
        depositReadiness: getTrackedEarnDepositReadiness({
          role,
          isBalanceFiatAvailable: token.isBalanceFiatAvailable,
          balanceFiatNumber: token.balanceFiatNumber,
        }),
        rate,
        isFeeSubsidized: false,
        market,
      },
    ];
  });

/**
 * Builds the shared Earn asset catalogue from existing asset, Earn, Money,
 * lending, and staking authorities.
 */
const useEarnAssetCatalogue = ({
  enabled = true,
}: UseEarnAssetCatalogueOptions = {}) => {
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const moneyDepositBlockedTokens = useSelector(
    selectMoneyDepositBlockedTokens,
  );
  const {
    earnTokens,
    earnOutputTokens,
    moneyDepositAssets,
    assets: walletAssets,
    isEarnEligible,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    isTrxStakingEnabled,
  } = useSelector(selectEarnAssetCatalogueInputs);
  const {
    apyPercent: moneyApyPercent,
    apyDecimal: moneyApyDecimal,
    vaultApyQuery: {
      isLoading: isMoneyApyLoading,
      isError: isMoneyApyError,
      error: moneyApyError,
      refetch: refetchMoneyApy,
    },
  } = useMoneyVaultApy({ enabled: enabled && isMoneyAccountVisible });
  const mainnetVaultApy = useSelector(selectMainnetPooledStakingVaultApy);
  const {
    apyDecimal: trxApyPercent,
    fetchStatus: trxFetchStatus,
    errorMessage: trxErrorMessage,
    refetch: refetchTrxApy,
  } = useTronStakeApy({
    fetchOnMount: enabled && isTrxStakingEnabled,
    chainId: TRON_MAINNET_CHAIN_ID,
  });
  const {
    markets: lendingMarkets,
    isLoading: isLendingMarketsLoading,
    error: lendingMarketsError,
    refresh: refreshLendingMarkets,
  } = useEarnSectionLendingMarkets({
    enabled: enabled && isStablecoinLendingEnabled && isEarnEligible,
  });

  const walletAssetsById = useMemo(
    () =>
      new Map(
        walletAssets.flatMap((asset) => {
          const assetId = getAssetEarnId(asset);
          return assetId ? [[assetId.toLowerCase(), asset] as const] : [];
        }),
      ),
    [walletAssets],
  );

  const untrackedLendingAssetIds = useMemo(
    () =>
      isStablecoinLendingEnabled && isEarnEligible
        ? [
            ...new Set(
              lendingMarkets
                .map((market) =>
                  getLendingAssetId(market.chainId, market.underlying.address),
                )
                .filter((assetId) => !walletAssetsById.has(assetId)),
            ),
          ]
        : [],
    [
      isEarnEligible,
      isStablecoinLendingEnabled,
      lendingMarkets,
      walletAssetsById,
    ],
  );
  const {
    tokensByAssetId: lendingMetadata,
    isLoading: isLendingMetadataLoading,
    isSettled: isLendingMetadataSettled,
    error: lendingMetadataError,
    refresh: refreshLendingMetadata,
  } = useEarnSectionTokenMetadata(untrackedLendingAssetIds, enabled);

  const trxRatePercent = parseRatePercent(trxApyPercent);
  const ethRatePercent = parseRatePercent(mainnetVaultApy?.apyPercentString);

  const {
    candidates,
    hasInvalidEarnAssetIdentity,
    hasUnresolvedTrackedEarnAsset,
  } = useMemo(() => {
    const nextCandidates: EarnAsset[] = [];
    let nextHasInvalidEarnAssetIdentity = false;
    let nextHasUnresolvedTrackedEarnAsset = false;
    const trxRate = createEarnRate({
      type: 'APR',
      percentage: trxRatePercent,
      isLoading:
        trxFetchStatus === FetchStatus.Initial ||
        trxFetchStatus === FetchStatus.Fetching,
      isError: trxFetchStatus === FetchStatus.Error,
    });

    if (isEarnEligible) {
      const addTrackedEarnAssets = (
        tokens: typeof earnTokens,
        role: Exclude<EarnAssetRole, 'funding'>,
      ) => {
        tokens.forEach((token) => {
          const assetId = getTokenAssetId(token);
          if (!assetId) {
            nextHasInvalidEarnAssetIdentity = true;
            return;
          }
          const experiences = getTrackedEarnExperiences({
            token,
            assetId,
            role,
            trxRate,
            isPooledStakingEnabled,
            isStablecoinLendingEnabled,
            isTrxStakingEnabled,
          });
          if (experiences.length === 0) return;
          const walletAsset = walletAssetsById.get(assetId.toLowerCase());
          if (!walletAsset) {
            nextHasUnresolvedTrackedEarnAsset = true;
            return;
          }

          nextCandidates.push(
            createTrackedEarnAsset(walletAsset, assetId, experiences),
          );
        });
      };

      addTrackedEarnAssets(earnTokens, 'underlying');
      addTrackedEarnAssets(earnOutputTokens, 'output');
    }

    // Add untracked lending assets for strategy discovery.
    if (isStablecoinLendingEnabled && isEarnEligible) {
      lendingMarkets.forEach((market) => {
        const chainId = toHex(market.chainId) as Hex;
        const ratePercentage = parseRatePercent(market.netSupplyRate);
        const experienceId = getLendingExperienceId(market);

        const address = market.underlying.address;
        const assetId = getLendingAssetId(market.chainId, address);
        const lendingExperience = {
          id: experienceId,
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          role: 'underlying' as const,
          depositReadiness: {
            status: 'not_ready' as const,
            reason: 'asset_not_tracked' as const,
          },
          rate: createEarnRate({
            type: 'APY',
            percentage: ratePercentage,
          }),
          isFeeSubsidized: false,
          market,
        };

        const metadata = lendingMetadata[assetId];
        if (!metadata || metadata.decimals === undefined) return;

        nextCandidates.push(
          createUntrackedEarnAsset(
            assetId,
            {
              address,
              decimals: metadata.decimals,
              image: metadata.iconUrl ?? '',
              name: metadata.name,
              symbol: metadata.symbol,
              ticker: metadata.symbol,
              logo: metadata.iconUrl,
              isETH: false,
              isNative: false,
              isStaked: false,
              chainId,
            },
            [lendingExperience],
          ),
        );
      });
    }

    if (isPooledStakingEnabled && isEarnEligible) {
      nextCandidates.push(
        createUntrackedEarnAsset(
          ETH_MAINNET_ASSET_ID,
          createEthUntrackedMetadata(),
          [
            {
              id: `pooled:${ETH_MAINNET_ASSET_ID}`,
              type: EARN_EXPERIENCES.POOLED_STAKING,
              role: 'underlying',
              depositReadiness: {
                status: 'not_ready',
                reason: 'asset_not_tracked',
              },
              rate: createEarnRate({
                type: 'APR',
                percentage: ethRatePercent,
              }),
              isFeeSubsidized: false,
            },
          ],
        ),
      );
    }

    if (isTrxStakingEnabled && isEarnEligible) {
      nextCandidates.push(
        createUntrackedEarnAsset(
          TRX_NATIVE_TOKEN_ADDRESS,
          createTrxUntrackedMetadata(),
          [
            {
              id: `trx-staking:${TRX_NATIVE_TOKEN_ADDRESS}`,
              type: EARN_EXPERIENCES.TRX_STAKING,
              role: 'underlying',
              depositReadiness: {
                status: 'not_ready',
                reason: 'asset_not_tracked',
              },
              rate: trxRate,
              isFeeSubsidized: false,
            },
          ],
        ),
      );
    }

    return {
      candidates: nextCandidates,
      hasInvalidEarnAssetIdentity: nextHasInvalidEarnAssetIdentity,
      hasUnresolvedTrackedEarnAsset: nextHasUnresolvedTrackedEarnAsset,
    };
  }, [
    earnOutputTokens,
    earnTokens,
    ethRatePercent,
    isEarnEligible,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    isTrxStakingEnabled,
    lendingMetadata,
    lendingMarkets,
    trxRatePercent,
    trxFetchStatus,
    walletAssetsById,
  ]);

  const moneyDepositEligibleAssetIds = useMemo(
    () =>
      new Set(
        moneyDepositAssets.flatMap((asset) => {
          const assetId = getAssetEarnId(asset);
          return assetId ? [assetId.toLowerCase()] : [];
        }),
      ),
    [moneyDepositAssets],
  );
  const moneyRate = useMemo(
    () =>
      createEarnRate({
        type: 'APY',
        percentage: moneyApyPercent,
        isLoading: isMoneyApyLoading,
        isError: isMoneyApyError,
      }),
    [isMoneyApyError, isMoneyApyLoading, moneyApyPercent],
  );
  const catalogueAssets = useMemo(() => {
    const baseAssets = buildEarnAssets(candidates);
    const enrichedAssets = baseAssets.map((asset) => {
      if (!isMoneyAccountVisible) {
        return asset;
      }

      const { metadata, assetId } = asset;
      if (
        !isEvmCaip19AssetId(assetId) ||
        !isMoneyDepositSupportedToken(metadata, moneyDepositBlockedTokens)
      ) {
        return asset;
      }

      return {
        ...asset,
        experiences: [
          {
            id: `money:${asset.assetId}`,
            type: 'MONEY_ACCOUNT_DEPOSIT' as const,
            role: 'funding' as const,
            depositReadiness: getMoneyDepositReadiness(
              asset,
              moneyDepositEligibleAssetIds,
            ),
            rate: moneyRate,
            isFeeSubsidized: isMoneyDepositFeeSubsidized(
              relayFixedSpread,
              metadata,
            ),
          },
          ...asset.experiences,
        ],
      };
    });

    return enrichedAssets;
  }, [
    candidates,
    isMoneyAccountVisible,
    moneyDepositBlockedTokens,
    moneyDepositEligibleAssetIds,
    moneyRate,
    relayFixedSpread,
  ]);
  const assets = useMemo(
    () =>
      catalogueAssets.filter(
        ({ experiences }) => getEarnInputExperiences(experiences).length > 0,
      ),
    [catalogueAssets],
  );

  const hasMissingLendingMetadata =
    isLendingMetadataSettled &&
    untrackedLendingAssetIds.some(
      (assetId) => lendingMetadata[assetId]?.decimals === undefined,
    );
  const hasUnresolvedMoneyAsset =
    isMoneyAccountVisible &&
    moneyDepositAssets.some((token) => !getAssetEarnId(token));
  const isLendingLoading =
    enabled &&
    isStablecoinLendingEnabled &&
    isEarnEligible &&
    ((isLendingMarketsLoading && lendingMarkets.length === 0) ||
      (isLendingMetadataLoading && untrackedLendingAssetIds.length > 0));
  const isLoading =
    (enabled && isMoneyAccountVisible && isMoneyApyLoading) ||
    isLendingLoading ||
    (enabled &&
      isTrxStakingEnabled &&
      (trxFetchStatus === FetchStatus.Initial ||
        (trxFetchStatus === FetchStatus.Fetching &&
          trxRatePercent === undefined)));
  const errors = useMemo(
    () =>
      [
        lendingMarketsError,
        lendingMetadataError,
        hasMissingLendingMetadata
          ? new Error('Earn lending token metadata is incomplete')
          : null,
        hasUnresolvedMoneyAsset
          ? new Error('Money deposit asset has no valid CAIP-19 identity')
          : null,
        hasInvalidEarnAssetIdentity
          ? new Error('Earn token has no valid CAIP-19 identity')
          : null,
        hasUnresolvedTrackedEarnAsset
          ? new Error(
              'Tracked Earn token has no matching AssetsController asset',
            )
          : null,
        isMoneyAccountVisible &&
        isMoneyApyError &&
        moneyApyPercent === undefined
          ? moneyApyError instanceof Error
            ? moneyApyError
            : new Error('Failed to load Money account APY')
          : null,
        isTrxStakingEnabled && trxFetchStatus === FetchStatus.Error
          ? new Error(trxErrorMessage ?? 'Failed to load TRX staking APR')
          : null,
      ].filter((error): error is Error => error instanceof Error),
    [
      hasMissingLendingMetadata,
      hasInvalidEarnAssetIdentity,
      hasUnresolvedTrackedEarnAsset,
      hasUnresolvedMoneyAsset,
      isMoneyAccountVisible,
      isMoneyApyError,
      isTrxStakingEnabled,
      lendingMarketsError,
      lendingMetadataError,
      moneyApyError,
      moneyApyPercent,
      trxErrorMessage,
      trxFetchStatus,
    ],
  );
  const hasError = errors.length > 0;

  const refresh = useCallback(async () => {
    if (!enabled) return;

    await Promise.all([
      isPooledStakingEnabled
        ? Engine.context.EarnController.refreshPooledStakingVaultApyAverages(
            ChainId.ETHEREUM,
          )
        : Promise.resolve(),
      refreshLendingMarkets(),
      refreshLendingMetadata(),
      isTrxStakingEnabled ? refetchTrxApy() : Promise.resolve(),
      isMoneyAccountVisible ? refetchMoneyApy() : Promise.resolve(),
    ]);
  }, [
    enabled,
    isMoneyAccountVisible,
    isPooledStakingEnabled,
    isTrxStakingEnabled,
    refetchMoneyApy,
    refetchTrxApy,
    refreshLendingMetadata,
    refreshLendingMarkets,
  ]);

  return useMemo(
    () => ({
      assets,
      isLoading,
      hasError,
      errors,
      refresh,
      moneyApyDecimal,
      moneyApyPercent,
      moneyRateStatus: moneyRate.status,
    }),
    [
      assets,
      errors,
      hasError,
      isLoading,
      moneyApyDecimal,
      moneyApyPercent,
      moneyRate,
      refresh,
    ],
  );
};

export default useEarnAssetCatalogue;
