import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPredictCanSetup,
  selectPredictCanTrade,
} from '../selectors/predictSession';
import type { PredictVenueId } from '../types';

/** Loads Account Readiness and exposes fail-closed Predict capabilities. */
export const usePredictGuard = (venueId: PredictVenueId) => {
  const canSetup = useSelector(selectPredictCanSetup);
  const canTrade = useSelector(selectPredictCanTrade);

  useEffect(() => {
    const controller = new AbortController();
    Engine.controllerMessenger
      .call('PredictSessionService:refreshAccountReadiness', venueId, {
        signal: controller.signal,
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [venueId]);

  return { canSetup, canTrade };
};
