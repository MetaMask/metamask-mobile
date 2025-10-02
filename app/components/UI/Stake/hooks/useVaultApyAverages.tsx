import { useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import { DEFAULT_VAULT_APY_AVERAGES } from '../constants';

const useVaultApyAverages = (chainId: number) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vaultApyAverages = useSelector(
    pooledStakingSelectors.selectVaultApyAveragesForChain(chainId),
  );

  const fetchVaultAprs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultApyAverages(
        chainId,
      );
    } catch (err) {
      setError('Failed to fetch pooled staking vault APY averages');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vaultApyAverages: vaultApyAverages || DEFAULT_VAULT_APY_AVERAGES,
    refreshVaultApyAverages: fetchVaultAprs,
    isLoadingVaultApyAverages: isLoading,
    error,
  };
};

export default useVaultApyAverages;
