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
  const numericChainId = hexToNumber(asset?.chainId as Hex);
  const [earningsHistory, setEarningsHistory] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const fetchEarningsHistory = useCallback(async () => {
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
          console.log(
            'earningHistoryResponse.userRewards',
            earningHistoryResponse.userRewards,
          );
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
        console.log(
          'earningHistoryResponse.historicalAssets',
          earningHistoryResponse.historicalAssets,
        );
        setEarningsHistory(
          earningHistoryResponse.historicalAssets.map((asset) => ({
            timestamp: asset.timestamp,
            dateStr: new Date(asset.timestamp).toISOString().split('T')[0],
            // TODO: be more specific about which lifetime rewards to use
            sumRewards: earningHistoryResponse.lifetimeRewards[0].assets,
            dailyRewards: asset.assets,
          })),
        );
      } catch (err) {
        setError('Failed to fetch lending earnings history');
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    numericChainId,
    selectedAddress,
    limitDays,
    asset.experience.type,
    asset.experience.market,
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
