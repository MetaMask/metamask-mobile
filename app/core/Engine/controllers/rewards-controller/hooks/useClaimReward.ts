import { useCallback, useState } from 'react';
import { useClaimRewardMutation } from '../services';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import { SeasonRewardCatalogDto } from '../types';
import { useRewardsCatalog } from './useRewardsCatalog';
import { handleRewardsErrorMessage } from '../../../../../util/rewards';
import { useDevOnlyLogin } from './useDevOnlyLogin';

export const useClaimReward = () => {
  const { rewards } = useRewardsCatalog();
  const address = useSelector(selectSelectedInternalAccountAddress);
  const { devOnlyLoginAddress } = useDevOnlyLogin();
  const [claimReward] = useClaimRewardMutation();
  const [error, setError] = useState<string | null>(null);

  const handleClaimReward = useCallback(
    async (catalogItem: SeasonRewardCatalogDto) => {
      try {
        setError(null);
        const reward = rewards?.find(
          (r) => r.seasonRewardId === catalogItem.id,
        );
        if (reward && devOnlyLoginAddress) {
          await claimReward({
            rewardId: reward.id,
            body: { address: devOnlyLoginAddress },
          }).unwrap();
        } else if (reward && address) {
          await claimReward({
            rewardId: reward.id,
            body: { address },
          }).unwrap();
        }
      } catch (err) {
        const errorMessage = handleRewardsErrorMessage(err);
        setError(errorMessage);
      }
    },
    [rewards, devOnlyLoginAddress, address, claimReward],
  );

  return {
    claimReward: handleClaimReward,
    error,
    clearError: () => setError(null),
  };
};
