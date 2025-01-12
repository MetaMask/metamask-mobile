import { useCallback, useEffect, useState } from 'react';
import { useStakeContext } from './useStakeContext';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';

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
  const chainId = useSelector(selectChainId);
  const numericChainId = hexToNumber(chainId);
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
          await stakingApiService.getUserDailyRewards(
            numericChainId,
            selectedAddress,
            limitDays,
          );
        setEarningsHistory(earningHistoryResponse.userRewards);
      } catch (err) {
        setError('Failed to fetch earnings history');
      } finally {
        setIsLoading(false);
      }
    }
  }, [numericChainId, stakingApiService, selectedAddress, limitDays]);

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
