import {
  WALLET_HOME_ONBOARDING_ALL_STEPS,
  walletHomeOnboardingCappedVisualStepIndex,
  walletHomeOnboardingMaxPersistedStepIndex,
  walletHomeOnboardingProgressDenominator,
  walletHomeOnboardingProgressRatioForStep,
  walletHomeOnboardingShouldHoldRenderForDroppedStep,
  walletHomeOnboardingVisibleSteps,
} from './walletHomeOnboardingStepsModel';

describe('walletHomeOnboardingStepsModel', () => {
  describe('walletHomeOnboardingVisibleSteps', () => {
    it('keeps every step when the notifications step is included', () => {
      const steps = walletHomeOnboardingVisibleSteps({
        includeNotificationsStep: true,
      });

      expect(steps.map((step) => step.kind)).toEqual([
        'fund',
        'trade',
        'notifications',
      ]);
    });

    it('drops only the notifications step when it is excluded', () => {
      const steps = walletHomeOnboardingVisibleSteps({
        includeNotificationsStep: false,
      });

      expect(steps.map((step) => step.kind)).toEqual(['fund', 'trade']);
    });

    it('preserves the button layout of the remaining steps', () => {
      const steps = walletHomeOnboardingVisibleSteps({
        includeNotificationsStep: false,
      });

      expect(steps).toEqual([
        { kind: 'fund', buttonLayout: 'full_width_primary' },
        { kind: 'trade', buttonLayout: 'skip_and_primary_row' },
      ]);
    });

    it('does not mutate the step catalogue', () => {
      walletHomeOnboardingVisibleSteps({ includeNotificationsStep: false });

      expect(WALLET_HOME_ONBOARDING_ALL_STEPS.map((step) => step.kind)).toEqual(
        ['fund', 'trade', 'notifications'],
      );
    });
  });

  describe('walletHomeOnboardingProgressDenominator', () => {
    it('reserves a final segment for the completion fill', () => {
      expect(walletHomeOnboardingProgressDenominator(3)).toBe(4);
      expect(walletHomeOnboardingProgressDenominator(2)).toBe(3);
    });

    it('never divides by zero for an empty step list', () => {
      expect(walletHomeOnboardingProgressDenominator(0)).toBe(2);
    });
  });

  describe('walletHomeOnboardingProgressRatioForStep', () => {
    it('spreads three steps across quarters', () => {
      expect(walletHomeOnboardingProgressRatioForStep(0, 3)).toBe(0.25);
      expect(walletHomeOnboardingProgressRatioForStep(1, 3)).toBe(0.5);
      expect(walletHomeOnboardingProgressRatioForStep(2, 3)).toBe(0.75);
    });

    it('spreads two steps across thirds', () => {
      expect(walletHomeOnboardingProgressRatioForStep(0, 2)).toBeCloseTo(1 / 3);
      expect(walletHomeOnboardingProgressRatioForStep(1, 2)).toBeCloseTo(2 / 3);
    });
  });

  describe('walletHomeOnboardingMaxPersistedStepIndex', () => {
    it('returns the last index of the visible steps', () => {
      expect(walletHomeOnboardingMaxPersistedStepIndex(3)).toBe(2);
      expect(walletHomeOnboardingMaxPersistedStepIndex(2)).toBe(1);
    });

    it('clamps at zero for an empty step list', () => {
      expect(walletHomeOnboardingMaxPersistedStepIndex(0)).toBe(0);
    });
  });

  describe('walletHomeOnboardingShouldHoldRenderForDroppedStep', () => {
    it('holds the render when the notifications step was dropped under the user', () => {
      expect(
        walletHomeOnboardingShouldHoldRenderForDroppedStep({
          displayStepIndex: 2,
          stepCount: 2,
          includeNotificationsStep: false,
        }),
      ).toBe(true);
    });

    it('still renders a legacy out-of-range step while the notifications step is shown', () => {
      expect(
        walletHomeOnboardingShouldHoldRenderForDroppedStep({
          displayStepIndex: 7,
          stepCount: 3,
          includeNotificationsStep: true,
        }),
      ).toBe(false);
    });

    it('never holds the render for an in-range step', () => {
      expect(
        walletHomeOnboardingShouldHoldRenderForDroppedStep({
          displayStepIndex: 1,
          stepCount: 2,
          includeNotificationsStep: false,
        }),
      ).toBe(false);
      expect(
        walletHomeOnboardingShouldHoldRenderForDroppedStep({
          displayStepIndex: 2,
          stepCount: 3,
          includeNotificationsStep: true,
        }),
      ).toBe(false);
    });
  });

  describe('walletHomeOnboardingCappedVisualStepIndex', () => {
    it('passes through in-range indices', () => {
      expect(walletHomeOnboardingCappedVisualStepIndex(1, 3)).toBe(1);
    });

    it('caps an index that outruns the visible steps', () => {
      expect(walletHomeOnboardingCappedVisualStepIndex(2, 2)).toBe(1);
      expect(walletHomeOnboardingCappedVisualStepIndex(9, 3)).toBe(2);
    });
  });
});
