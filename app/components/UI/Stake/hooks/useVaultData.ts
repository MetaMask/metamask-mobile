import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const useVaultData = () => {
  const { selectVaultMetadata, selectVaultApy } = pooledStakingSelectors;

  const vaultData = useSelector(selectVaultMetadata);
  const { apyDecimal, apyPercentString } = useSelector(selectVaultApy);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultMetadata();
    } catch (err) {
      setError('Failed to fetch vault metadata');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vaultData,
    isLoadingVaultData: isLoading,
    error,
    annualRewardRate: apyPercentString,
    annualRewardRateDecimal: apyDecimal,
    refreshPoolStakingVaultMetadata: fetchVaultData,
  };
};

export default useVaultData;
