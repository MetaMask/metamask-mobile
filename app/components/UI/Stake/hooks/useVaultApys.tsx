import { useCallback, useEffect, useState } from 'react';
import { useStakeContext } from './useStakeContext';
import { hexToNumber } from '@metamask/utils';
import { useDispatch, useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectVaultApys,
  setVaultApys,
  VaultApys,
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
      const vaultApysResponse = await stakingApiService.getVaultDailyRewards(
        numericChainId,
        365,
        'desc',
      );

      // TODO: Fix type error before pushing
      // @ts-expect-error temp before updating stake-sdk to latest VaultApys endpoint
      const reversedVaultApys = vaultApysResponse?.reverse();

      // TODO: Determine how we should refresh this value.
      // TEMP: TODO: Update type after updating stake-sdk
      dispatch(setVaultApys(reversedVaultApys as unknown as VaultApys));
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
    fetchVaultApys,
    isLoadingVaultApys: isLoading,
    error,
  };
};

export default useVaultApys;
