import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { pooledStakingSelectors } from '../../../../selectors/earnController';

const useVaultApys = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vaultApys = useSelector(pooledStakingSelectors.selectVaultDailyApys);
  const fetchVaultApys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultDailyApys();
    } catch (err) {
      setError('Failed to fetch pooled staking vault APYs');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vaultApys,
    refreshVaultApys: fetchVaultApys,
    isLoadingVaultApys: isLoading,
    error,
  };
};

export default useVaultApys;
