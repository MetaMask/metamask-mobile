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
 * experiment. Suppresses exposure once early access is confirmed so
 * early-access users stay out of the experiment; accepted trade-off: if the
 * user opens Social V0 before the initial `checkEarlyAccess` response lands,
 * exposure can fire once for that session. Read access with
 * `selectHasSocialV1Access`.
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
