import { useSelector } from 'react-redux';
import { useState } from 'react';
import { pooledStakingSelectors } from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const useVaultMetadata = (chainId: number) => {
  const { selectVaultMetadataForChain, selectVaultApyForChain } =
    pooledStakingSelectors;
  const vaultMetadata = useSelector(selectVaultMetadataForChain(chainId));
  let { apyDecimal, apyPercentString } = {
    apyDecimal: 0,
    apyPercentString: '',
  };
  const vaultApy = useSelector(selectVaultApyForChain(chainId));
  if (vaultApy) {
    apyDecimal = vaultApy.apyDecimal;
    apyPercentString = vaultApy.apyPercentString;
  }

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultMetadata = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Engine.context.EarnController.refreshPooledStakingVaultMetadata(
        chainId,
      );
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
