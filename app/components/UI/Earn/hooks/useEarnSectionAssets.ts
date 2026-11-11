import { useMemo } from 'react';
import {
  EARN_SECTION_ASSET_LIMIT,
  rankEarnSectionAssets,
} from '../utils/earnSection';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';

interface UseEarnSectionAssetsOptions {
  enabled?: boolean;
}

/**
 * Projects the shared Earn asset catalogue into fixed card slots.
 */
const useEarnSectionAssets = ({
  enabled = true,
}: UseEarnSectionAssetsOptions = {}) => {
  const {
    assets,
    moneyApyPercent,
    moneyRateStatus,
    isLoading,
    hasError,
    errors,
    refresh,
  } = useEarnAssetCatalogue({ enabled });

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
