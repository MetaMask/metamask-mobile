import { useCallback, useEffect, useState } from 'react';
import { hexToNumber } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectVaultApys,
  setVaultApys,
} from '../../../../core/redux/slices/staking';
import { stakingApiService } from '../sdk/stakeSdkProvider';

const useVaultApys = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useDispatch();

  const { vaultApys } = useSelector(selectVaultApys);

  const chainId = useSelector(selectChainId);

  const fetchVaultApys = useCallback(async () => {
    setIsLoading(true);
    dispatch(setVaultApys([]));
    setError(null);

    try {
      const numericChainId = hexToNumber(chainId);

      const vaultApysResponse = await stakingApiService.getVaultDailyApys(
        numericChainId,
        365,
        'desc',
      );

      const reversedVaultApys = [...vaultApysResponse]?.reverse();

      dispatch(setVaultApys(reversedVaultApys));
    } catch (err) {
      setError('Failed to fetch vault APYs');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, dispatch]);

  useEffect(() => {
    fetchVaultApys();
  }, [fetchVaultApys]);

  return {
    vaultApys,
    refreshVaultApys: fetchVaultApys,
    isLoadingVaultApys: isLoading,
    error,
  };
};

export default useVaultApys;
