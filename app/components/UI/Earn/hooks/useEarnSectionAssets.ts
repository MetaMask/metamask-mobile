import { useMemo } from 'react';
import {
  EARN_SECTION_ASSET_LIMIT,
  rankEarnSectionAssets,
} from '../utils/earnSection';
import useEarnAssetCatalogue from './useEarnAssetCatalogue';

/**
 * Projects the shared Earn asset catalogue into fixed card slots.
 */
const useEarnSectionAssets = () => {
  const {
    assets,
    moneyApyPercent,
    moneyRateStatus,
    isLoading,
    hasError,
    errors,
    refresh,
  } = useEarnAssetCatalogue();

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
