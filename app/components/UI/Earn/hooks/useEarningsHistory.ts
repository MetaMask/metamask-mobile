import { LendingPositionHistory } from '@metamask/stake-sdk';
import { Hex, hexToNumber } from '@metamask/utils';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { stakingApiService } from '../../Stake/sdk/stakeSdkProvider';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';

export interface EarningHistory {
  sumRewards: string;
  dateStr: string;
  dailyRewards: string;
}
export interface EarningHistoryResponse {
  userRewards: EarningHistory[];
}

const useEarningsHistory = ({
  asset,
  limitDays = 365,
}: {
  asset: EarnTokenDetails;
  limitDays: number;
}) => {
  const [earningsHistory, setEarningsHistory] = useState<
    EarningHistory[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const fetchEarningsHistory = useCallback(async () => {
    const numericChainId = hexToNumber(asset?.chainId as Hex);

    if (asset.experience.type === EARN_EXPERIENCES.POOLED_STAKING) {
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
          setError('Failed to fetch pooled staking earnings history');
        } finally {
          setIsLoading(false);
        }
      }
    }
    if (asset.experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      setIsLoading(true);
      setError(null);
      try {
        const earningHistoryResponse =
          (await Engine.context.EarnController.getLendingPositionHistory({
            address: selectedAddress,
            chainId: numericChainId,
            positionId: asset.experience.market?.position?.id || '',
            marketId: asset.experience.market?.id || '',
            marketAddress: asset.experience.market?.address || '',
            protocol: asset.experience.market?.protocol || '',
          })) as unknown as LendingPositionHistory;

        setEarningsHistory(
          earningHistoryResponse.historicalAssets.map((history) => ({
            timestamp: history.timestamp,
            dateStr: new Date(history.timestamp).toISOString().split('T')[0],
            sumRewards: earningHistoryResponse.lifetimeRewards[0].assets,
            dailyRewards: history.assets,
          })),
        );
      } catch (err) {
        setError('Failed to fetch lending earnings history');
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    selectedAddress,
    limitDays,
    asset?.chainId,
    asset?.experience?.type,
    asset?.experience?.market,
  ]);

  useEffect(() => {
    fetchEarningsHistory();
  }, [fetchEarningsHistory]);

  return {
    earningsHistory,
    isLoading,
    error,
  };
};

export default useEarningsHistory;
