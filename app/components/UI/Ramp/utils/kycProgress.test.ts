import {
  getKycProgress,
  getKycProgressForRegion,
  KYC_STEP,
} from './kycProgress';

describe('kycProgress', () => {
  it('uses a four step bar outside the EEA', () => {
    expect(getKycProgress(KYC_STEP.EMAIL, false)).toEqual({
      steps: 4,
      currentStep: 0,
    });
    expect(getKycProgress(KYC_STEP.ADDRESS, false)).toEqual({
      steps: 4,
      currentStep: 3,
    });
  });

  it('keeps the EEA bar the same length on every screen', () => {
    const steps = [
      KYC_STEP.EMAIL,
      KYC_STEP.OTP,
      KYC_STEP.BASIC_INFO,
      KYC_STEP.ADDRESS,
      KYC_STEP.SOURCE_OF_INCOME,
      KYC_STEP.NATIONALITY,
      KYC_STEP.PROCESSING,
    ];

    const results = steps.map((step) => getKycProgress(step, true));

    expect(new Set(results.map((r) => r.steps))).toEqual(new Set([7]));
    expect(results.map((r) => r.currentStep)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('only reaches the last EEA segment on the final step', () => {
    const nationality = getKycProgress(KYC_STEP.NATIONALITY, true);
    const processing = getKycProgress(KYC_STEP.PROCESSING, true);

    expect(nationality.currentStep).toBeLessThan(nationality.steps - 1);
    expect(processing.currentStep).toBe(processing.steps - 1);
  });

  it('picks the EEA bar from the region country code', () => {
    expect(getKycProgressForRegion(KYC_STEP.EMAIL, 'at').steps).toBe(7);
    expect(getKycProgressForRegion(KYC_STEP.EMAIL, 'US').steps).toBe(4);
    expect(getKycProgressForRegion(KYC_STEP.EMAIL, undefined).steps).toBe(4);
  });
});
