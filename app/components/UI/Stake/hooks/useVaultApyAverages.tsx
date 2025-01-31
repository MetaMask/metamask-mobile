import { useCallback, useEffect, useState } from 'react';
import { hexToNumber } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectVaultApyAverages,
  setVaultApyAverages,
} from '../../../../core/redux/slices/staking';
import { stakingApiService } from '../sdk/stakeSdkProvider';

const useVaultApyAverages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useDispatch();

  const { vaultApyAverages } = useSelector(selectVaultApyAverages);
  const chainId = useSelector(selectChainId);

  const fetchVaultAprs = useCallback(async () => {
    if (!stakingApiService) return;

    setIsLoading(true);
    setError(null);

    try {
      const numericChainId = hexToNumber(chainId);
      const vaultAprsResponse = await stakingApiService.getVaultApyAverages(
        numericChainId,
      );
      dispatch(setVaultApyAverages(vaultAprsResponse));
    } catch (err) {
      setError('Failed to fetch vault APY averages');
    } finally {
      setIsLoading(false);
    }
  }, [chainId, dispatch]);

  useEffect(() => {
    if (Object.keys(vaultApyAverages).length) return;
    fetchVaultAprs();
  }, [fetchVaultAprs, vaultApyAverages]);

  return {
    vaultApyAverages,
    refreshVaultApyAverages: fetchVaultAprs,
    isLoadingVaultApyAverages: isLoading,
    error,
  };
};

export default useVaultApyAverages;
