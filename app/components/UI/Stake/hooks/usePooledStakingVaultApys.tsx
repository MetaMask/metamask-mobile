import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPooledStakingVaultDailyApys } from '../../../../selectors/earnController';

const usePooledStakingVaultDailyApys = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pooledStakingVaultDailyApys = useSelector(
    selectPooledStakingVaultDailyApys,
  );
  const fetchVaultApys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultDailyApys();
    } catch (err) {
      setError('Failed to fetch pooled staking vault daily APYs');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vaultApys: pooledStakingVaultDailyApys,
    refreshPooledStakingVaultApys: fetchVaultApys,
    isLoadingVaultApys: isLoading,
    error,
  };
};

export default usePooledStakingVaultDailyApys;
