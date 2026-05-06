import { computeStepperVisibility } from './computeStepperVisibility';

describe('computeStepperVisibility', () => {
  it('returns true when layout is null (still measuring)', () => {
    expect(
      computeStepperVisibility({
        stepperLayout: null,
        scrollViewHeight: 600,
        scrollOffsetY: 0,
      }),
    ).toBe(true);
  });

  it('returns true when stepper height is 0 (unmeasured)', () => {
    expect(
      computeStepperVisibility({
        stepperLayout: { y: 0, height: 0 },
        scrollViewHeight: 600,
        scrollOffsetY: 0,
      }),
    ).toBe(true);
  });

  it('returns true when scrollViewHeight is 0 (scrollview not laid out)', () => {
    expect(
      computeStepperVisibility({
        stepperLayout: { y: 100, height: 300 },
        scrollViewHeight: 0,
        scrollOffsetY: 0,
      }),
    ).toBe(true);
  });

  it('returns false when user has scrolled past the stepper bottom', () => {
    // Stepper occupies y=[100, 400]. Scrolling to 500 puts the user past it.
    expect(
      computeStepperVisibility({
        stepperLayout: { y: 100, height: 300 },
        scrollViewHeight: 600,
        scrollOffsetY: 500,
      }),
    ).toBe(false);
  });

  it('returns true when user is exactly at the stepper bottom (boundary, inclusive)', () => {
    // stepperBottom = 100 + 300 = 400; offset === 400 stays "visible".
    expect(
      computeStepperVisibility({
        stepperLayout: { y: 100, height: 300 },
        scrollViewHeight: 600,
        scrollOffsetY: 400,
      }),
    ).toBe(true);
  });

  it('returns true when stepper is fully on screen and user has not scrolled', () => {
    expect(
      computeStepperVisibility({
        stepperLayout: { y: 100, height: 300 },
        scrollViewHeight: 600,
        scrollOffsetY: 0,
      }),
    ).toBe(true);
  });
});
