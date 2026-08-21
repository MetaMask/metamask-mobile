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
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { isMoneyDepositFeeSubsidized } from '../../Money/utils/isMoneyDepositFeeSubsidized';
import type { TokenI } from '../../Tokens/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnAssetMetadata,
  EarnAssetRole,
  EarnExperience,
  EarnRateStatus,
} from '../types/earnAssets';
import {
  buildEarnAssets,
  createDiscoveryEarnAsset,
  createHeldEarnAsset,
  getAssetEarnId,
} from '../utils/earnAssets';
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

const parseRatePercent = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return undefined;
  }
  const parsed = Number(
    typeof value === 'string' ? value.trim().replace(/%$/, '') : value,
  );
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getRateStatus = ({
  percentage,
  isLoading,
  isError,
}: {
  percentage?: number;
  isLoading?: boolean;
  isError?: boolean;
}): EarnRateStatus => {
  if (percentage !== undefined) return 'ready';
  if (isLoading) return 'loading';
  if (isError) return 'error';
  return 'unavailable';
};

/**
 * Provides pooled-staking discovery when the EVM token selector has no
 * selected account or mainnet configuration. In normal wallet state the held
 * ETH candidate is emitted first and keeps its metadata during deduplication.
 */
const createEthDiscoveryMetadata = (): EarnAssetMetadata => ({
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
 * Provides TRX-staking discovery while asynchronous Snap account provisioning
 * has not yet populated the multichain token selector.
 */
const createTrxDiscoveryMetadata = (): EarnAssetMetadata => ({
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

const getHeldEarnExperiences = ({
  token,
  assetId,
  role,
  trxRatePercent,
  trxRateStatus,
  isPooledStakingEnabled,
  isStablecoinLendingEnabled,
  isTrxStakingEnabled,
}: {
  token: ReturnType<
    typeof selectEarnAssetCatalogueInputs
  >['earnTokens'][number];
  assetId: EarnAssetId;
  role: Exclude<EarnAssetRole, 'funding'>;
  trxRatePercent?: number;
  trxRateStatus: EarnRateStatus;
  isPooledStakingEnabled: boolean;
  isStablecoinLendingEnabled: boolean;
  isTrxStakingEnabled: boolean;
}): EarnExperience[] =>
  token.experiences.flatMap((experience) => {
    const isPooledStaking = experience.type === EARN_EXPERIENCES.POOLED_STAKING;
    const isTrxStaking = experience.type === EARN_EXPERIENCES.TRX_STAKING;

    /**
     * Output assets are receipt or position tokens used by withdrawal flows.
     * They must not be exposed as deposit strategies in the Earn catalogue.
     */
    if (isPooledStaking && (!isPooledStakingEnabled || role === 'output')) {
      return [];
    }
    if (isTrxStaking && (!isTrxStakingEnabled || role === 'output')) {
      return [];
    }
    if (
      experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING &&
      (!isStablecoinLendingEnabled || role === 'output')
    ) {
      return [];
    }

    // Markets only available for stablecoin lending.
    const market = experience.market;
    const percentage = isTrxStaking
      ? trxRatePercent
      : parseRatePercent(experience.apr);
    const status = isTrxStaking ? trxRateStatus : getRateStatus({ percentage });

    return [
      {
        id: market
          ? getLendingExperienceId(market)
          : isTrxStaking
            ? `trx-staking:${TRX_NATIVE_TOKEN_ADDRESS}`
            : `pooled:${assetId}`,
        type: experience.type,
        role,
        rate: {
          type: isTrxStaking || isPooledStaking ? 'APR' : 'APY',
          percentage,
          status,
        },
        isFeeSubsidized: false,
        market,
      },
    ];
  });

/**
 * Builds the shared Earn asset catalogue from existing asset, Earn, Money,
 * lending, and staking authorities.
 */
const useEarnAssetCatalogue = () => {
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
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
    vaultApyQuery: {
      isLoading: isMoneyApyLoading,
      isError: isMoneyApyError,
      error: moneyApyError,
      refetch: refetchMoneyApy,
    },
  } = useMoneyVaultApy({ enabled: isMoneyAccountVisible });
  const mainnetVaultApy = useSelector(selectMainnetPooledStakingVaultApy);
  const {
    apyDecimal: trxApyPercent,
    fetchStatus: trxFetchStatus,
    errorMessage: trxErrorMessage,
    refetch: refetchTrxApy,
  } = useTronStakeApy({
    fetchOnMount: isTrxStakingEnabled,
    chainId: TRON_MAINNET_CHAIN_ID,
  });
  const {
    markets: lendingMarkets,
    isLoading: isLendingMarketsLoading,
    error: lendingMarketsError,
    refresh: refreshLendingMarkets,
  } = useEarnSectionLendingMarkets({
    enabled: isStablecoinLendingEnabled && isEarnEligible,
  });

  const lendingAssetIds = useMemo(
    () =>
      isStablecoinLendingEnabled && isEarnEligible
        ? [
            ...new Set(
              lendingMarkets.map((market) =>
                getLendingAssetId(market.chainId, market.underlying.address),
              ),
            ),
          ]
        : [],
    [isEarnEligible, isStablecoinLendingEnabled, lendingMarkets],
  );
  const {
    tokensByAssetId: lendingMetadata,
    isLoading: isLendingMetadataLoading,
    isSettled: isLendingMetadataSettled,
    error: lendingMetadataError,
    refresh: refreshLendingMetadata,
  } = useEarnSectionTokenMetadata(lendingAssetIds);

  const moneyRateStatus = getRateStatus({
    percentage: moneyApyPercent,
    isLoading: isMoneyApyLoading,
    isError: isMoneyApyError,
  });
  const trxRatePercent = parseRatePercent(trxApyPercent);
  const trxRateStatus = getRateStatus({
    percentage: trxRatePercent,
    isLoading:
      trxFetchStatus === FetchStatus.Initial ||
      trxFetchStatus === FetchStatus.Fetching,
    isError: trxFetchStatus === FetchStatus.Error,
  });
  const ethRatePercent = parseRatePercent(mainnetVaultApy?.apyPercentString);
  const ethRateStatus = getRateStatus({ percentage: ethRatePercent });
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

  const candidates = useMemo(() => {
    const nextCandidates: EarnAsset[] = [];

    /**
     * Held candidates are added before discovery candidates so buildEarnAssets
     * preserves held metadata, balances, and rates for matching CAIP-19 IDs.
     */
    if (isEarnEligible) {
      const addHeldEarnAssets = (
        tokens: typeof earnTokens,
        role: Exclude<EarnAssetRole, 'funding'>,
      ) => {
        tokens.forEach((token) => {
          const assetId = getTokenAssetId(token);
          if (!assetId) return;
          const experiences = getHeldEarnExperiences({
            token,
            assetId,
            role,
            trxRatePercent,
            trxRateStatus,
            isPooledStakingEnabled,
            isStablecoinLendingEnabled,
            isTrxStakingEnabled,
          });
          if (experiences.length === 0) return;
          const walletAsset = walletAssetsById.get(assetId.toLowerCase());
          if (!walletAsset) return;

          nextCandidates.push(
            createHeldEarnAsset(walletAsset, assetId, experiences),
          );
        });
      };

      addHeldEarnAssets(earnTokens, 'underlying');
      addHeldEarnAssets(earnOutputTokens, 'output');
    }

    if (isMoneyAccountVisible) {
      moneyDepositAssets.forEach((token) => {
        const assetId = getAssetEarnId(token);
        if (!assetId) return;

        nextCandidates.push(
          createHeldEarnAsset(token, assetId, [
            {
              id: `money:${assetId}`,
              type: 'MONEY_ACCOUNT_DEPOSIT',
              role: 'funding',
              rate: {
                type: 'APY',
                percentage: moneyApyPercent,
                status: moneyRateStatus,
              },
              isFeeSubsidized: isMoneyDepositFeeSubsidized(
                relayFixedSpread,
                token,
              ),
            },
          ]),
        );
      });
    }

    // Add unheld lending assets for strategy discovery.
    if (isStablecoinLendingEnabled && isEarnEligible) {
      lendingMarkets.forEach((market) => {
        const chainId = toHex(market.chainId) as Hex;
        const ratePercentage = parseRatePercent(market.netSupplyRate);
        const experienceId = getLendingExperienceId(market);

        const address = market.underlying.address;
        const assetId = getLendingAssetId(market.chainId, address);
        const metadata = lendingMetadata[assetId];
        if (!metadata || metadata.decimals === undefined) return;

        nextCandidates.push(
          createDiscoveryEarnAsset(
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
            [
              {
                id: experienceId,
                type: EARN_EXPERIENCES.STABLECOIN_LENDING,
                role: 'underlying',
                rate: {
                  type: 'APY',
                  percentage: ratePercentage,
                  status: getRateStatus({
                    percentage: ratePercentage,
                  }),
                },
                isFeeSubsidized: false,
                market,
              },
            ],
          ),
        );
      });
    }

    if (isPooledStakingEnabled && isEarnEligible) {
      nextCandidates.push(
        createDiscoveryEarnAsset(
          ETH_MAINNET_ASSET_ID,
          createEthDiscoveryMetadata(),
          [
            {
              id: `pooled:${ETH_MAINNET_ASSET_ID}`,
              type: EARN_EXPERIENCES.POOLED_STAKING,
              role: 'underlying',
              rate: {
                type: 'APR',
                percentage: ethRatePercent,
                status: ethRateStatus,
              },
              isFeeSubsidized: false,
            },
          ],
        ),
      );
    }

    if (isTrxStakingEnabled && isEarnEligible) {
      nextCandidates.push(
        createDiscoveryEarnAsset(
          TRX_NATIVE_TOKEN_ADDRESS,
          createTrxDiscoveryMetadata(),
          [
            {
              id: `trx-staking:${TRX_NATIVE_TOKEN_ADDRESS}`,
              type: EARN_EXPERIENCES.TRX_STAKING,
              role: 'underlying',
              rate: {
                type: 'APR',
                percentage: trxRatePercent,
                status: trxRateStatus,
              },
              isFeeSubsidized: false,
            },
          ],
        ),
      );
    }

    return nextCandidates;
  }, [
    earnOutputTokens,
    earnTokens,
    ethRatePercent,
    ethRateStatus,
    isEarnEligible,
    isMoneyAccountVisible,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    isTrxStakingEnabled,
    lendingMetadata,
    lendingMarkets,
    moneyApyPercent,
    moneyDepositAssets,
    moneyRateStatus,
    relayFixedSpread,
    trxRatePercent,
    trxRateStatus,
    walletAssetsById,
  ]);

  const assets = useMemo(() => buildEarnAssets(candidates), [candidates]);
  const assetsById = useMemo<Readonly<Partial<Record<string, EarnAsset>>>>(
    () =>
      Object.fromEntries(
        assets.map((asset) => [asset.assetId.toLowerCase(), asset]),
      ),
    [assets],
  );
  const hasMissingLendingMetadata =
    isLendingMetadataSettled &&
    lendingAssetIds.some(
      (assetId) => lendingMetadata[assetId]?.decimals === undefined,
    );
  const hasUnresolvedMoneyAsset =
    isMoneyAccountVisible &&
    moneyDepositAssets.some((token) => !getAssetEarnId(token));
  const hasUnresolvedHeldEarnAsset =
    isEarnEligible &&
    earnTokens.some((token) => {
      const assetId = getTokenAssetId(token);
      return assetId !== undefined && !walletAssetsById.has(assetId);
    });
  const isLendingLoading =
    isStablecoinLendingEnabled &&
    isEarnEligible &&
    (isLendingMarketsLoading || isLendingMetadataLoading);
  const isLoading =
    (isMoneyAccountVisible && isMoneyApyLoading) ||
    isLendingLoading ||
    (isTrxStakingEnabled &&
      (trxFetchStatus === FetchStatus.Initial ||
        trxFetchStatus === FetchStatus.Fetching));
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
        hasUnresolvedHeldEarnAsset
          ? new Error('Held Earn token has no matching AssetsController asset')
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
      hasUnresolvedHeldEarnAsset,
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
      assetsById,
      isLoading,
      hasError,
      errors,
      refresh,
      moneyApyPercent,
      moneyRateStatus,
    }),
    [
      assets,
      assetsById,
      errors,
      hasError,
      isLoading,
      moneyApyPercent,
      moneyRateStatus,
      refresh,
    ],
  );
};

export default useEarnAssetCatalogue;
