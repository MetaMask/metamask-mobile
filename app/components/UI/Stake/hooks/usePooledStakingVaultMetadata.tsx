import { useSelector } from 'react-redux';
import { useState } from 'react';
import {
  selectPooledStakingVaultApy,
  selectPooledStakingVaultMetadata,
} from '../../../../selectors/earnController';
import Engine from '../../../../core/Engine';

const usePooledStakingVaultMetadata = () => {
  const vaultData = useSelector(selectPooledStakingVaultMetadata);
  const { apyDecimal, apyPercentString } = useSelector(
    selectPooledStakingVaultApy,
  );

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

export default usePooledStakingVaultMetadata;
