import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';
import { VaultData } from '@metamask/stake-sdk';
import { useStakeContext } from './useStakeContext';

const useVaultData = () => {
  const chainId = useSelector(selectChainId);
  const { stakingApiService } = useStakeContext(); // Get the stakingApiService directly from context

  const [vaultData, setVaultData] = useState({} as VaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVaultData = async () => {
      try {
        setLoading(true);

        if (!stakingApiService) {
          throw new Error('Staking API service is unavailable');
        }

        const numericChainId = hexToNumber(chainId);
        const vaultDataResponse = await stakingApiService.getVaultData(
          numericChainId,
        );

        setVaultData(vaultDataResponse);
      } catch (err) {
        setError('Failed to fetch vault data');
      } finally {
        setLoading(false);
      }
    };

    fetchVaultData();
  }, [chainId, stakingApiService]);

  const apy = vaultData?.apy || '0';
  const annualRewardRatePercentage = apy ? parseFloat(apy) : 0;
  const annualRewardRateDecimal = annualRewardRatePercentage / 100;

  const annualRewardRate =
    annualRewardRatePercentage === 0
      ? '0%'
      : `${annualRewardRatePercentage.toFixed(1)}%`;

  return {
    vaultData,
    isLoadingVaultData: loading,
    error,
    annualRewardRate,
    annualRewardRateDecimal,
  };
};

export default useVaultData;
