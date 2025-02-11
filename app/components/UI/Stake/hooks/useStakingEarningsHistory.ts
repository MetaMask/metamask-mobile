import { useCallback, useEffect, useState } from 'react';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import { hexToNumber } from '@metamask/utils';
import { ChainId } from '@metamask/controller-utils';
import { stakingApiService } from '../sdk/stakeSdkProvider';

export interface EarningHistory {
  sumRewards: string;
  dateStr: string;
  dailyRewards: string;
}
export interface EarningHistoryResponse {
  userRewards: EarningHistory[];
}

const useStakingEarningsHistory = ({
  chainId,
  limitDays = 365,
}: {
  chainId: ChainId;
  limitDays: number;
}) => {
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
  }, [numericChainId, selectedAddress, limitDays]);

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
