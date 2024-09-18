/**
 * Sets onboarding wizard step
 */
export default function setOnboardingWizardStep(step: number) {
  return {
    type: 'SET_ONBOARDING_WIZARD_STEP',
    step,
  };
}
