import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ChainId } from '@metamask/stake-sdk';
import { pooledStakingSelectors } from '../../../../selectors/earnController/pooledStaking';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../selectors/featureFlags';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import {
  createEarnRate,
  getHighestReadyRateEntry,
  parseRatePercent,
} from '../utils/earnRate';
import type { EarnRate } from '../types/earnAssets';
import useEarnSectionLendingMarkets from './useEarnSectionLendingMarkets';
import useTronStakeApy, { FetchStatus } from './useTronStakeApy';

const selectMainnetPooledStakingVaultApy =
  pooledStakingSelectors.selectVaultApyForChain(ChainId.ETHEREUM);

export interface UseEarnHighestRateOptions {
  /**
   * Whether to fetch and calculate Earn rates.
   */
  enabled?: boolean;
}

/**
 * Calculates the highest ready rate across enabled and eligible Earn experiences.
 *
 * @param options - Rate calculation options.
 */
const useEarnHighestRate = ({
  enabled = true,
}: UseEarnHighestRateOptions = {}) => {
  const isEarnEligible = useSelector(pooledStakingSelectors.selectEligibility);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const mainnetPooledStakingVaultApy = useSelector(
    selectMainnetPooledStakingVaultApy,
  );

  const { apyPercent: moneyApyPercent, vaultApyQuery } = useMoneyVaultApy({
    enabled: enabled && isMoneyAccountVisible,
  });
  const { markets: lendingMarkets } = useEarnSectionLendingMarkets({
    enabled: enabled && isEarnEligible && isStablecoinLendingEnabled,
  });
  const { apyPercent: trxApyPercent, fetchStatus: trxFetchStatus } =
    useTronStakeApy({
      fetchOnMount: enabled && isEarnEligible && isTrxStakingEnabled,
      chainId: ChainId.TRON_MAINNET,
    });

  const highestRate = useMemo(() => {
    if (!enabled) {
      return undefined;
    }

    const rates: EarnRate[] = [];

    if (isMoneyAccountVisible) {
      rates.push(
        createEarnRate({
          type: 'APY',
          percentage: moneyApyPercent,
          isLoading: vaultApyQuery.isLoading,
          isError: vaultApyQuery.isError,
        }),
      );
    }

    if (isEarnEligible && isStablecoinLendingEnabled) {
      rates.push(
        ...lendingMarkets.map((market) =>
          createEarnRate({
            type: 'APR',
            percentage: parseRatePercent(market.netSupplyRate),
          }),
        ),
      );
    }

    if (isEarnEligible && isPooledStakingEnabled) {
      rates.push(
        createEarnRate({
          type: 'APR',
          percentage: parseRatePercent(
            mainnetPooledStakingVaultApy?.apyPercentString,
          ),
        }),
      );
    }

    if (isEarnEligible && isTrxStakingEnabled) {
      rates.push(
        createEarnRate({
          type: 'APR',
          percentage: parseRatePercent(trxApyPercent),
          isLoading:
            trxFetchStatus === FetchStatus.Initial ||
            trxFetchStatus === FetchStatus.Fetching,
          isError: trxFetchStatus === FetchStatus.Error,
        }),
      );
    }

    return getHighestReadyRateEntry(rates, (rate) => rate);
  }, [
    enabled,
    isEarnEligible,
    isMoneyAccountVisible,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    isTrxStakingEnabled,
    lendingMarkets,
    mainnetPooledStakingVaultApy?.apyPercentString,
    moneyApyPercent,
    trxApyPercent,
    trxFetchStatus,
    vaultApyQuery.isError,
    vaultApyQuery.isLoading,
  ]);

  return useMemo(() => ({ highestRate }), [highestRate]);
};

export default useEarnHighestRate;
