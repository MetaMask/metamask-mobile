import { useCallback, useEffect, useState } from 'react';
import { useStakeContext } from './useStakeContext';
import { hexToNumber } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectVaultApys,
  setVaultApys,
} from '../../../../core/redux/slices/staking';

const useVaultApys = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useDispatch();

  const { vaultApys } = useSelector(selectVaultApys);
  const chainId = useSelector(selectChainId);

  const { stakingApiService } = useStakeContext();

  const fetchVaultApys = useCallback(async () => {
    if (!stakingApiService) return;

    setIsLoading(true);
    setError(null);

    try {
      const numericChainId = hexToNumber(chainId);
      const vaultApysResponse = await stakingApiService.getVaultDailyApys(
        numericChainId,
        365,
        'desc',
      );

      const reversedVaultApys = [...vaultApysResponse]?.reverse();

      // TODO: Determine how we should refresh this value.
      dispatch(setVaultApys(reversedVaultApys));
    } catch (err) {
      setError('Failed to fetch vault APYs');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, dispatch, stakingApiService]);

  useEffect(() => {
    if (Object.keys(vaultApys).length) return;
    fetchVaultApys();
  }, [fetchVaultApys, vaultApys]);

  return {
    vaultApys,
    refreshVaultApys: fetchVaultApys,
    isLoadingVaultApys: isLoading,
    error,
  };
};

export default useVaultApys;
