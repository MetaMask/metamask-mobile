import { useMemo } from 'react';
import { useFeatureFlagOverride } from '../contexts/FeatureFlagOverrideContext';
import { FeatureFlagInfo } from '../util/feature-flags';

/**
 * Hook to get feature flag statistics
 */
export const useFeatureFlagStats = (): Record<string, number> => {
  const { featureFlagsList } = useFeatureFlagOverride();

  return useMemo(() => {
    const stats = {
      total: featureFlagsList.length,
      boolean: 0,
      object: 0,
      string: 0,
      number: 0,
      array: 0,
    };

    featureFlagsList.forEach((flag: FeatureFlagInfo) => {
      if (
        flag.type === 'boolean with minimumVersion' ||
        flag.type === 'boolean nested' ||
        flag.type === 'abTest'
      ) {
        stats.boolean++;
      } else {
        stats[flag.type]++;
      }
    });

    return stats;
  }, [featureFlagsList]);
};
