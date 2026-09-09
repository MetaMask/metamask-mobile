import { useMemo } from 'react';
import { usePredictActivity } from '../../../UI/Predict/hooks/usePredictActivity';
import { findPredictActivity } from '../templates/PredictDetails/PredictDetails.types';
import type { PredictActivity } from '../../../UI/Predict/types';

export function usePredictDetailsActivity(
  identifier: string | undefined,
): PredictActivity | undefined {
  const { activity } = usePredictActivity();

  return useMemo(
    () => findPredictActivity(activity, identifier),
    [activity, identifier],
  );
}
