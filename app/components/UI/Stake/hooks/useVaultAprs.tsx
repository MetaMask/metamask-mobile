import { useCallback, useEffect, useState } from 'react';
import { useStakeContext } from './useStakeContext';
import { hexToNumber } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectVaultAprs,
  setVaultAprs,
} from '../../../../core/redux/slices/staking';

const useVaultAprs = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useDispatch();

  const { vaultAprs } = useSelector(selectVaultAprs);
  const chainId = useSelector(selectChainId);

  const { stakingApiService } = useStakeContext();

  const fetchVaultAprs = useCallback(async () => {
    if (!stakingApiService) return;

    setIsLoading(true);
    setError(null);

    try {
      const numericChainId = hexToNumber(chainId);
      const vaultAprsResponse = await stakingApiService.getVaultAprs(
        numericChainId,
      );
      // TODO: Determine how we should refresh this value.
      dispatch(setVaultAprs(vaultAprsResponse));
    } catch (err) {
      setError('Failed to fetch vault APRs');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, dispatch, stakingApiService]);

  useEffect(() => {
    if (Object.keys(vaultAprs).length) return;
    fetchVaultAprs();
  }, [fetchVaultAprs, vaultAprs]);

  return {
    vaultAprs,
    refreshVaultAprs: fetchVaultAprs,
    isLoadingVaultAprs: isLoading,
    error,
  };
};

export default useVaultAprs;
