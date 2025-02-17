import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useCallback, useState } from 'react';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';
import {
  selectVaultData,
  setVaultData,
} from '../../../../core/redux/slices/staking';
import { stakingApiService } from '../sdk/stakeSdkProvider';

const useVaultData = () => {
  const dispatch = useDispatch();
  const chainId = useSelector(selectEvmChainId);
  const { vaultData } = useSelector(selectVaultData);

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
  }, [chainId, dispatch]);

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
