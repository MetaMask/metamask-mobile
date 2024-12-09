import { useCallback, useEffect, useState } from 'react';
import { useStakeContext } from './useStakeContext';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';

interface EarningHistory {
  sumRewards: string;
  dateStr: string;
  dailyRewards: string;
  dailyRewardsUsd: string;
}
interface EarningHistoryResponse {
  userRewards: EarningHistory[];
}

const useStakingEarningsHistory = ({
  limitDays = 365,
}: {
  limitDays: number;
}) => {
  const { stakingApiService } = useStakeContext();

  const [earningsHistory, setEarningsHistory] = useState<
    EarningHistory[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const fetchEarningsHistory = useCallback(async () => {
    if (stakingApiService) {
      setIsLoading(true);
      setError(null);

      try {
        const earningHistoryResponse: EarningHistoryResponse =
          await stakingApiService.fetchFromApi(
            `pooled-staking/rewards/1?account=${selectedAddress}&days=${limitDays}`,
          );
        setEarningsHistory(earningHistoryResponse.userRewards);
      } catch (err) {
        setError('Failed to fetch earnings history');
      } finally {
        setIsLoading(false);
      }
    }
  }, [stakingApiService, selectedAddress, limitDays]);

  useEffect(() => {
    fetchEarningsHistory();
  }, [fetchEarningsHistory]);

  return {
    earningsHistory,
    isLoading,
    error,
  };
};

export default useStakingEarningsHistory;
