import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectPooledStakingVaultApyAverages } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const usePooledStakingVaultApyAverages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vaultApyAverages = useSelector(selectPooledStakingVaultApyAverages);

  const fetchVaultAprs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultApyAverages();
    } catch (err) {
      setError('Failed to fetch pooled staking vault APY averages');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vaultApyAverages,
    refreshPooledStakingVaultApyAverages: fetchVaultAprs,
    isLoadingVaultApyAverages: isLoading,
    error,
  };
};

export default usePooledStakingVaultApyAverages;
