import { useMemo } from 'react';
import { useRampsUserRegion } from './useRampsUserRegion';
import {
  getKycProgressForRegion,
  type KycProgress,
  type KycStep,
} from '../utils/kycProgress';

/**
 * Progress bar values for a KYC step, sized for the EEA flow when the user's
 * region is in the EEA.
 */
export function useKycProgress(step: KycStep): KycProgress {
  const { userRegion } = useRampsUserRegion();
  const countryCode = userRegion?.country?.isoCode;

  return useMemo(
    () => getKycProgressForRegion(step, countryCode),
    [step, countryCode],
  );
}

export default useKycProgress;
