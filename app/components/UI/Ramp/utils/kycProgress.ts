import { isEeaCountry } from './eeaCountries';

export const KYC_STEP = {
  EMAIL: 'EMAIL',
  OTP: 'OTP',
  BASIC_INFO: 'BASIC_INFO',
  ADDRESS: 'ADDRESS',
  SOURCE_OF_INCOME: 'SOURCE_OF_INCOME',
  NATIONALITY: 'NATIONALITY',
  PROCESSING: 'PROCESSING',
} as const;

export type KycStep = (typeof KYC_STEP)[keyof typeof KYC_STEP];

export interface KycProgress {
  steps: number;
  currentStep: number;
}

/**
 * Standard flow: email, OTP, basic info, address. KYC processing shares the
 * last segment.
 */
const STANDARD_STEPS = 4;
const STANDARD_STEP_INDEX: Record<KycStep, number> = {
  EMAIL: 0,
  OTP: 1,
  BASIC_INFO: 2,
  ADDRESS: 3,
  SOURCE_OF_INCOME: 3,
  NATIONALITY: 3,
  PROCESSING: 3,
};

/**
 * EEA (MiCA) flow: email, OTP, basic info, address, source of income,
 * employment and nationality, then verification/processing.
 *
 * Existing EEA users who finished KYC before MiCA skip basic info and
 * address, so their bar jumps ahead to source of income. The last segment is
 * only reached on the final step.
 */
const EEA_STEPS = 7;
const EEA_STEP_INDEX: Record<KycStep, number> = {
  EMAIL: 0,
  OTP: 1,
  BASIC_INFO: 2,
  ADDRESS: 3,
  SOURCE_OF_INCOME: 4,
  NATIONALITY: 5,
  PROCESSING: 6,
};

export function getKycProgress(step: KycStep, isEea: boolean): KycProgress {
  return isEea
    ? { steps: EEA_STEPS, currentStep: EEA_STEP_INDEX[step] }
    : { steps: STANDARD_STEPS, currentStep: STANDARD_STEP_INDEX[step] };
}

export function getKycProgressForRegion(
  step: KycStep,
  countryCode?: string | null,
): KycProgress {
  return getKycProgress(step, isEeaCountry(countryCode?.toUpperCase()));
}
