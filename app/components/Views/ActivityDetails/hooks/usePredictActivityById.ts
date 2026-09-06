import { useMemo } from 'react';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { usePredictActivity } from '../../../UI/Predict/hooks/usePredictActivity';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../../UI/Predict/types';

export function usePredictActivityById(
  activityId: string | undefined,
): PredictActivity | undefined {
  const { activity } = usePredictActivity();

  return useMemo(() => {
    if (!activityId) {
      return undefined;
    }
    const normalizedId = activityId.toLowerCase();
    return activity.find((entry) => entry.id.toLowerCase() === normalizedId);
  }, [activity, activityId]);
}
