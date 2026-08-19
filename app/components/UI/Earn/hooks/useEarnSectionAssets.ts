import { useEffect, useMemo } from 'react';
import {
  EARN_SECTION_ASSET_LIMIT,
  rankEarnSectionAssets,
} from '../utils/earnSection';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';
import Logger from '../../../../util/Logger';

/**
 * Projects the shared Earn asset catalogue into fixed card slots.
 */
interface UseEarnSectionAssetsOptions {
  refreshTrigger?: number;
}

const useEarnSectionAssets = ({
  refreshTrigger,
}: UseEarnSectionAssetsOptions = {}) => {
  const {
    assets,
    moneyApyPercent,
    moneyRateStatus,
    isLoading,
    hasError,
    errors,
    refresh,
  } = useEarnAssetCatalogue();

  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger <= 0) return;

    const refreshEarnAssets = async () => {
      try {
        await refresh();
      } catch (error: unknown) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'EarnSection: Failed to refresh Earn data',
        );
      }
    };

    refreshEarnAssets();
  }, [refresh, refreshTrigger]);

  const assetSlots = useMemo(() => rankEarnSectionAssets(assets), [assets]);
  const hasMoreAssets = assets.length > EARN_SECTION_ASSET_LIMIT;

  return useMemo(
    () => ({
      assetSlots,
      hasMoreAssets,
      moneyApyPercent,
      moneyRateStatus,
      isLoading,
      hasError,
      errors,
      refresh,
    }),
    [
      assetSlots,
      errors,
      hasError,
      hasMoreAssets,
      isLoading,
      moneyApyPercent,
      moneyRateStatus,
      refresh,
    ],
  );
};

export default useEarnSectionAssets;
