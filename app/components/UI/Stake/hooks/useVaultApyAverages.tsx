import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { pooledStakingSelectors } from '../../../../selectors/earnController';

const useVaultApyAverages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vaultApyAverages = useSelector(
    pooledStakingSelectors.selectVaultApyAverages,
  );

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
    vaultApyAverages:
      Object.keys(vaultApyAverages).length === 0
        ? DEFAULT_VAULT_APY_AVERAGES
        : vaultApyAverages,
    refreshVaultApyAverages: fetchVaultAprs,
    isLoadingVaultApyAverages: isLoading,
    error,
  };
};

export default useVaultApyAverages;
