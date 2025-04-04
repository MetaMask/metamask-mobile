/**
 * Sets onboarding wizard step
 */
export default function setOnboardingWizardStep(step) {
  return {
    type: 'SET_ONBOARDING_WIZARD_STEP',
    step,
  };
}
