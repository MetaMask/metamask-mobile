import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from './useABTest';
import { selectHasSocialEarlyAccess } from '../core/redux/slices/socialEarlyAccess';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_EXPOSURE_METADATA,
  SOCIAL_V1_VARIANTS,
} from '../constants/socialV1';

/**
 * Emits the TSA-1122 Experiment Viewed event from the surfaces that own the
 * experiment. Early-access users never emit it, so they stay out of the
 * experiment. Read access with `selectHasSocialV1Access`.
 */
export function useSocialV1Exposure(): void {
  const hasEarlyAccess = useSelector(selectHasSocialEarlyAccess);
  const exposureMetadata = useMemo(
    () => ({
      ...SOCIAL_V1_EXPOSURE_METADATA,
      trackExposure: !hasEarlyAccess,
    }),
    [hasEarlyAccess],
  );
  useABTest(SOCIAL_V1_AB_KEY, SOCIAL_V1_VARIANTS, exposureMetadata);
}
