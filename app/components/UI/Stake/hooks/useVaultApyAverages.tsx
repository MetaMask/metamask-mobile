import { useCallback, useEffect, useState } from 'react';
import { hexToNumber } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { selectEvmChainId } from '../../../../selectors/networkController';
import {
  selectVaultApyAverages,
  setVaultApyAverages,
} from '../../../../core/redux/slices/staking';
import { stakingApiService } from '../sdk/stakeSdkProvider';
import { DEFAULT_VAULT_APY_AVERAGES } from '../constants';

const useVaultApyAverages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useDispatch();

  const { vaultApyAverages } = useSelector(selectVaultApyAverages);
  const chainId = useSelector(selectEvmChainId);

  const fetchVaultAprs = useCallback(async () => {
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
    fetchVaultAprs();
  }, [fetchVaultAprs]);

  return {
    vaultApyAverages:
      Object.keys(vaultApyAverages).length === 0
        ? DEFAULT_VAULT_APY_AVERAGES
        : vaultApyAverages,
    refreshVaultApyAverages: fetchVaultAprs,
    isLoadingVaultApyAverages: isLoading,
    error,
  };
};

export default useVaultApyAverages;
