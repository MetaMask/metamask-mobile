import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback, useState } from 'react';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';
import { useStakeContext } from './useStakeContext';
import {
  selectVaultData,
  setVaultData,
} from '../../../../core/redux/slices/staking';

const useVaultData = () => {
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const { vaultData } = useSelector(selectVaultData);
  const { stakingApiService } = useStakeContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultData = useCallback(async () => {
    if (!stakingApiService) return;

    setIsLoading(true);
    setError(null);

    try {
      const numericChainId = hexToNumber(chainId);
      const vaultDataResponse = await stakingApiService.getVaultData(
        numericChainId,
      );
      dispatch(setVaultData(vaultDataResponse));
    } catch (err) {
      setError('Failed to fetch vault data');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, stakingApiService, dispatch]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  const apy = vaultData?.apy || '0';
  const annualRewardRatePercentage = apy ? parseFloat(apy) : 0;
  const annualRewardRateDecimal = annualRewardRatePercentage / 100;

  const annualRewardRate =
    annualRewardRatePercentage === 0
      ? '0%'
      : `${annualRewardRatePercentage.toFixed(1)}%`;

  return {
    vaultData,
    isLoadingVaultData: isLoading,
    error,
    annualRewardRate,
    annualRewardRateDecimal,
  };
};

export default useVaultData;
