import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { ChainId, type LendingMarket } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import Engine from '../../../../core/Engine';
import { pooledStakingSelectors } from '../../../../selectors/earnController/pooledStaking';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { buildEvmCaip19AssetId } from '../../../../util/multichain/buildEvmCaip19AssetId';
import { useMoneyDepositTokens } from '../../Money/hooks/useMoneyDepositTokens';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import { selectIsMoneyAccountGeoEligible } from '../../Money/selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import type { TokenI } from '../../Tokens/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS } from '../constants/musd';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../selectors/featureFlags';
import {
  buildEarnSectionAssetKey,
  EARN_SECTION_ASSET_LIMIT,
  rankEarnSectionAssets,
  type EarnSectionAssetCandidate,
  type EarnSectionExperience,
  type EarnSectionRateStatus,
} from '../utils/earnSection';
import useEarnSectionLendingMarkets from './useEarnSectionLendingMarkets';
import useEarnSectionTokenMetadata from './useEarnSectionTokenMetadata';
import useEarnTokens from './useEarnTokens';
import useTronStakeApy, { FetchStatus } from './useTronStakeApy';

const TRON_MAINNET_CHAIN_ID = ChainId.TRON_MAINNET;
const TRX_NATIVE_TOKEN_ADDRESS = `${TRON_MAINNET_CHAIN_ID}/slip44:195`;

const selectMainnetPooledStakingVaultApy =
  pooledStakingSelectors.selectVaultApyForChain(ChainId.ETHEREUM);

const parseRatePercent = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getRateStatus = ({
  ratePercent,
  isLoading,
  isError,
}: {
  ratePercent?: number;
  isLoading?: boolean;
  isError?: boolean;
}): EarnSectionRateStatus => {
  if (ratePercent !== undefined) return 'ready';
  if (isLoading) return 'loading';
  if (isError) return 'error';
  return 'unavailable';
};

const createMoneyAccountToken = (): TokenI => ({
  address: MUSD_TOKEN_ADDRESS,
  decimals: MUSD_TOKEN.decimals,
  image: MUSD_TOKEN.image,
  name: MUSD_TOKEN.name,
  symbol: MUSD_TOKEN.symbol,
  balance: '0',
  logo: MUSD_TOKEN.image,
  isETH: false,
  isNative: false,
  chainId: CHAIN_IDS.MONAD,
});

const createEthToken = (): TokenI => ({
  address: getNativeTokenAddress(CHAIN_IDS.MAINNET),
  decimals: 18,
  image: '',
  name: 'Ethereum',
  symbol: 'Ethereum',
  ticker: 'ETH',
  balance: '0',
  logo: undefined,
  isETH: true,
  isNative: true,
  isStaked: false,
  chainId: CHAIN_IDS.MAINNET,
});

const createTrxToken = (): TokenI => ({
  address: TRX_NATIVE_TOKEN_ADDRESS,
  decimals: 6,
  image: '',
  name: 'TRON',
  symbol: 'TRX',
  ticker: 'TRX',
  balance: '0',
  logo: undefined,
  isETH: false,
  isNative: true,
  isStaked: false,
  chainId: String(TRON_MAINNET_CHAIN_ID),
});

const getLendingExperienceId = (market: LendingMarket) =>
  `lending:${market.chainId}:${market.protocol}:${market.id}`;

const isTrxToken = (token: TokenI) =>
  token.address.toLowerCase() === TRX_NATIVE_TOKEN_ADDRESS.toLowerCase();

const getHeldEarnExperiences = ({
  token,
  trxRatePercent,
  trxRateStatus,
  isPooledStakingEnabled,
  isStablecoinLendingEnabled,
}: {
  token: ReturnType<typeof useEarnTokens>['earnTokens'][number];
  trxRatePercent?: number;
  trxRateStatus: EarnSectionRateStatus;
  isPooledStakingEnabled: boolean;
  isStablecoinLendingEnabled: boolean;
}): EarnSectionExperience[] =>
  token.experiences.flatMap((experience) => {
    if (
      experience.type === EARN_EXPERIENCES.POOLED_STAKING &&
      !isPooledStakingEnabled &&
      !isTrxToken(token)
    ) {
      return [];
    }
    if (
      experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING &&
      !isStablecoinLendingEnabled
    ) {
      return [];
    }

    const market = experience.market;
    const ratePercent = isTrxToken(token)
      ? trxRatePercent
      : parseRatePercent(experience.apr);
    const rateStatus = isTrxToken(token)
      ? trxRateStatus
      : getRateStatus({ ratePercent });

    return [
      {
        id: market
          ? getLendingExperienceId(market)
          : `pooled:${token.chainId}:${token.address.toLowerCase()}`,
        type: experience.type,
        source: 'held-earn',
        ratePercent,
        rateStatus,
        market,
      },
    ];
  });

// TODO: Review entire file.
/**
 * Aggregates every real data source needed by the fixed Earn homepage
 * carousel and exposes already-ranked, stable card slots to the view.
 */
const useEarnSectionAssets = () => {
  const { earnTokens } = useEarnTokens();
  const { tokens: moneyDepositTokens } = useMoneyDepositTokens();
  const {
    apyPercent: moneyApyPercent,
    vaultApyQuery: {
      isLoading: isMoneyApyLoading,
      isError: isMoneyApyError,
      refetch: refetchMoneyApy,
    },
  } = useMoneyVaultApy();
  const mainnetVaultApy = useSelector(selectMainnetPooledStakingVaultApy);
  const isEarnEligible = useSelector(pooledStakingSelectors.selectEligibility);
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );
  const {
    apyDecimal: trxApyPercent,
    fetchStatus: trxFetchStatus,
    refetch: refetchTrxApy,
  } = useTronStakeApy({
    fetchOnMount: isTrxStakingEnabled,
    chainId: TRON_MAINNET_CHAIN_ID,
  });
  const {
    markets: allLendingMarkets,
    isLoading: isLendingMarketsLoading,
    error: lendingMarketsError,
    refresh: refreshLendingMarkets,
  } = useEarnSectionLendingMarkets({
    enabled: isStablecoinLendingEnabled && isEarnEligible,
  });

  const discoveryLendingMarkets = useMemo(() => {
    const uniqueMarkets = new Map<string, LendingMarket>();
    [...allLendingMarkets]
      .sort((first, second) => second.netSupplyRate - first.netSupplyRate)
      .forEach((market) => {
        const key = buildEarnSectionAssetKey(
          toHex(market.chainId),
          market.underlying.address,
        );
        if (!uniqueMarkets.has(key)) {
          uniqueMarkets.set(key, market);
        }
      });

    return [...uniqueMarkets.values()].slice(
      0,
      EARN_SECTION_ASSET_LIMIT * 2 - 1,
    );
  }, [allLendingMarkets]);

  const lendingAssetIds = useMemo(
    () =>
      isStablecoinLendingEnabled && isEarnEligible
        ? discoveryLendingMarkets.map((market) =>
            buildEvmCaip19AssetId(
              market.underlying.address,
              toHex(market.chainId) as Hex,
            ),
          )
        : [],
    [discoveryLendingMarkets, isEarnEligible, isStablecoinLendingEnabled],
  );
  const {
    tokensByAssetId: lendingMetadata,
    isLoading: isLendingMetadataLoading,
    error: lendingMetadataError,
  } = useEarnSectionTokenMetadata(lendingAssetIds);

  const moneyRateStatus = getRateStatus({
    ratePercent: moneyApyPercent,
    isLoading: isMoneyApyLoading,
    isError: isMoneyApyError,
  });
  const trxRatePercent = parseRatePercent(trxApyPercent);
  const trxRateStatus = getRateStatus({
    ratePercent: trxRatePercent,
    isLoading:
      trxFetchStatus === FetchStatus.Initial ||
      trxFetchStatus === FetchStatus.Fetching,
    isError: trxFetchStatus === FetchStatus.Error,
  });
  const ethRatePercent = parseRatePercent(mainnetVaultApy?.apyPercentString);
  const ethRateStatus = getRateStatus({
    ratePercent: ethRatePercent,
  });

  const candidates = useMemo(() => {
    const nextCandidates: EarnSectionAssetCandidate[] = [];

    if (isMoneyAccountEnabled && isMoneyAccountGeoEligible) {
      moneyDepositTokens.forEach((token) => {
        nextCandidates.push({
          key: buildEarnSectionAssetKey(token.chainId, token.address),
          token,
          hasBalance: true,
          balanceFiatNumber: token.fiat?.balance,
          balanceFiat: token.balanceInSelectedCurrency,
          experiences: [
            {
              id: `money:${token.chainId}:${token.address.toLowerCase()}`,
              type: 'MONEY_ACCOUNT_DEPOSIT',
              source: 'money-deposit',
              ratePercent: moneyApyPercent,
              rateStatus: moneyRateStatus,
            },
          ],
        });
      });
    }

    if (isEarnEligible) {
      earnTokens.forEach((token) => {
        const experiences = getHeldEarnExperiences({
          token,
          trxRatePercent,
          trxRateStatus,
          isPooledStakingEnabled,
          isStablecoinLendingEnabled,
        });
        if (experiences.length === 0) return;

        const hasBalance = new BigNumber(
          token.balanceMinimalUnit,
        ).isGreaterThan(0);
        const isFiatAvailable = token.isBalanceFiatAvailable !== false;
        nextCandidates.push({
          key: buildEarnSectionAssetKey(token.chainId, token.address),
          token,
          hasBalance,
          balanceFiatNumber:
            hasBalance && isFiatAvailable ? token.balanceFiatNumber : undefined,
          balanceFiat:
            hasBalance && isFiatAvailable ? token.balanceFiat : undefined,
          experiences,
        });
      });
    }

    if (isStablecoinLendingEnabled && isEarnEligible) {
      discoveryLendingMarkets.forEach((market, index) => {
        const chainId = toHex(market.chainId) as Hex;
        const assetId = lendingAssetIds[index]?.toLowerCase();
        const metadata = assetId ? lendingMetadata[assetId] : undefined;
        if (!metadata) return;

        const ratePercent = parseRatePercent(market.netSupplyRate);
        const token: TokenI = {
          address: market.underlying.address,
          decimals: metadata.decimals ?? 18,
          image: metadata.iconUrl ?? '',
          name: metadata.name,
          symbol: metadata.symbol,
          balance: '0',
          logo: metadata.iconUrl,
          isETH: false,
          isNative: false,
          isStaked: false,
          chainId,
        };
        nextCandidates.push({
          key: buildEarnSectionAssetKey(chainId, token.address),
          token,
          hasBalance: false,
          experiences: [
            {
              id: getLendingExperienceId(market),
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              source: 'lending-market',
              ratePercent,
              rateStatus: getRateStatus({ ratePercent }),
              market,
            },
          ],
        });
      });
    }

    if (isPooledStakingEnabled && isEarnEligible) {
      const token = createEthToken();
      nextCandidates.push({
        key: buildEarnSectionAssetKey(token.chainId, token.address),
        token,
        hasBalance: false,
        experiences: [
          {
            id: `pooled:${token.chainId}:${token.address.toLowerCase()}`,
            type: EARN_EXPERIENCES.POOLED_STAKING,
            source: 'eth-staking',
            ratePercent: ethRatePercent,
            rateStatus: ethRateStatus,
          },
        ],
      });
    }

    if (isTrxStakingEnabled && isEarnEligible) {
      const token = createTrxToken();
      nextCandidates.push({
        key: buildEarnSectionAssetKey(token.chainId, token.address),
        token,
        hasBalance: false,
        experiences: [
          {
            id: `pooled:${token.chainId}:${token.address.toLowerCase()}`,
            type: EARN_EXPERIENCES.POOLED_STAKING,
            source: 'trx-staking',
            ratePercent: trxRatePercent,
            rateStatus: trxRateStatus,
          },
        ],
      });
    }

    return nextCandidates;
  }, [
    discoveryLendingMarkets,
    earnTokens,
    ethRatePercent,
    ethRateStatus,
    isEarnEligible,
    isMoneyAccountEnabled,
    isMoneyAccountGeoEligible,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    isTrxStakingEnabled,
    lendingAssetIds,
    lendingMetadata,
    moneyApyPercent,
    moneyDepositTokens,
    moneyRateStatus,
    trxRatePercent,
    trxRateStatus,
  ]);

  const assetSlots = useMemo(
    () => rankEarnSectionAssets(candidates),
    [candidates],
  );

  const isLendingLoading =
    isStablecoinLendingEnabled &&
    isEarnEligible &&
    (isLendingMarketsLoading || isLendingMetadataLoading);

  const isLoading =
    isMoneyApyLoading ||
    isLendingLoading ||
    (isTrxStakingEnabled &&
      (trxFetchStatus === FetchStatus.Initial ||
        trxFetchStatus === FetchStatus.Fetching));

  const hasError =
    Boolean(lendingMarketsError) ||
    Boolean(lendingMetadataError) ||
    (isMoneyApyError && moneyApyPercent === undefined) ||
    (isTrxStakingEnabled && trxFetchStatus === FetchStatus.Error);

  const refresh = useCallback(async () => {
    await Promise.all([
      Engine.context.EarnController.refreshPooledStakingVaultApyAverages(
        ChainId.ETHEREUM,
      ),
      refreshLendingMarkets(),
      isTrxStakingEnabled ? refetchTrxApy() : Promise.resolve(),
      refetchMoneyApy(),
    ]);
  }, [
    isTrxStakingEnabled,
    refetchMoneyApy,
    refetchTrxApy,
    refreshLendingMarkets,
  ]);

  return useMemo(
    () => ({
      assetSlots,
      moneyAccountToken: moneyDepositTokens[0] ?? createMoneyAccountToken(),
      moneyApyPercent,
      moneyRateStatus,
      isLoading,
      hasError,
      refresh,
    }),
    [
      assetSlots,
      hasError,
      isLoading,
      moneyApyPercent,
      moneyDepositTokens,
      moneyRateStatus,
      refresh,
    ],
  );
};

export default useEarnSectionAssets;
