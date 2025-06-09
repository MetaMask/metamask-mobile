import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const useVaultMetadata = () => {
  const { selectVaultMetadata, selectVaultApy } = pooledStakingSelectors;

  const vaultMetadata = useSelector(selectVaultMetadata);
  const { apyDecimal, apyPercentString } = useSelector(selectVaultApy);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultMetadata = async () => {
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
    vaultMetadata,
    isLoadingVaultMetadata: isLoading,
    error,
    annualRewardRate: apyPercentString,
    annualRewardRateDecimal: apyDecimal,
    refreshVaultMetadata: fetchVaultMetadata,
  };
};

export default useVaultMetadata;
