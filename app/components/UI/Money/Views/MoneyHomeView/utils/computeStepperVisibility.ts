export interface StepperLayout {
  y: number;
  height: number;
}

export interface ComputeStepperVisibilityArgs {
  stepperLayout: StepperLayout | null;
  scrollViewHeight: number;
  scrollOffsetY: number;
}

/**
 * Returns true when the onboarding stepper should be considered "visible"
 * for footer peek-and-hide purposes.
 *
 * Layout / measurement still pending (any of: layout null, height === 0,
 * scrollViewHeight === 0): return true so the footer stays hidden until the
 * stepper's onLayout reports a real height. Avoids a flash of "Add money"
 * before measurements settle.
 *
 * User has scrolled past the stepper's bottom edge: return false (the footer
 * should peek in).
 *
 * Otherwise (stepper still on screen or below the fold): return true.
 */
export const computeStepperVisibility = ({
  stepperLayout,
  scrollViewHeight,
  scrollOffsetY,
}: ComputeStepperVisibilityArgs): boolean => {
  if (!stepperLayout || stepperLayout.height === 0 || scrollViewHeight === 0) {
    return true;
  }
  const stepperBottom = stepperLayout.y + stepperLayout.height;
  return scrollOffsetY <= stepperBottom;
};
