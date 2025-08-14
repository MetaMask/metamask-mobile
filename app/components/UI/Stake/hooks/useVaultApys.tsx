import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { pooledStakingSelectors } from '../../../../selectors/earnController';

const useVaultApys = (chainId: number) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vaultApys = useSelector(
    pooledStakingSelectors.selectVaultDailyApysForChain(chainId),
  );

  const fetchVaultApys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultDailyApys({
        chainId,
      });
    } catch (err) {
      setError('Failed to fetch pooled staking vault APYs');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vaultApys: vaultApys || [],
    refreshVaultApys: fetchVaultApys,
    isLoadingVaultApys: isLoading,
    error,
  };
};

export default useVaultApys;
