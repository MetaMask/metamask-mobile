import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import WalletHomeOnboardingSteps from './WalletHomeOnboardingSteps';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { WalletHomeOnboardingStepsSelectors } from './WalletHomeOnboardingSteps.testIds';

describe('WalletHomeOnboardingSteps', () => {
  const baseOnboarding = {
    walletHomeOnboardingStepsEligible: true,
    walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 0 },
  };

  const primaryTestId = `steps-root-${WalletHomeOnboardingStepsSelectors.PRIMARY_BUTTON}`;

  const renderSteps = (onboardingOverrides?: {
    walletHomeOnboardingSteps?: {
      suppressedReason: null;
      stepIndex: number;
    };
  }) =>
    renderWithProvider(<WalletHomeOnboardingSteps testID="steps-root" />, {
      state: {
        onboarding: {
          ...baseOnboarding,
          ...onboardingOverrides,
        },
        engine: {
          backgroundState,
        },
      },
    });

  it('does not render Skip on the fund step', () => {
    const { queryByTestId } = renderSteps();

    expect(
      queryByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
    ).toBeNull();
  });

  it('advances from fund step when primary is pressed', () => {
    const { getByTestId, store } = renderSteps();

    fireEvent.press(getByTestId(primaryTestId));

    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 1 }),
    );
  });

  it('advances from trade step when Skip is pressed', () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 1 },
    });

    fireEvent.press(
      getByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
    );

    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 2 }),
    );
  });

  it('advances from trade step when primary is pressed', () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 1 },
    });

    fireEvent.press(getByTestId(primaryTestId));

    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 2 }),
    );
  });

  it('completes flow when primary is pressed on last step', () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 2 },
    });

    fireEvent.press(getByTestId(primaryTestId));

    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ suppressedReason: 'flow_completed' }),
    );
  });

  it('completes flow when Skip is pressed on last step', () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 2 },
    });

    fireEvent.press(
      getByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
    );

    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ suppressedReason: 'flow_completed' }),
    );
  });

  it('clamps persisted stepIndex when it is out of range', () => {
    const { store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 99 },
    });

    expect(
      store.getState().onboarding.walletHomeOnboardingSteps?.stepIndex,
    ).toBe(2);
  });

  it('renders fund hero and progress for step 0', () => {
    const { getByTestId } = renderSteps();

    expect(getByTestId('steps-root-hero-fund')).toBeOnTheScreen();
    expect(
      getByTestId(WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL),
    ).toBeOnTheScreen();
  });

  it('renders trade hero for step 1', () => {
    const { getByTestId } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 1 },
    });
    expect(getByTestId('steps-root-hero-trade')).toBeOnTheScreen();
  });

  it('renders notifications hero for step 2', () => {
    const { getByTestId } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 2 },
    });
    expect(getByTestId('steps-root-hero-notifications')).toBeOnTheScreen();
  });

  it('treats missing stepIndex in persisted state as 0', () => {
    const { getByTestId, store } = renderWithProvider(
      <WalletHomeOnboardingSteps testID="steps-root" />,
      {
        state: {
          onboarding: {
            ...baseOnboarding,
            walletHomeOnboardingSteps: {
              suppressedReason: null,
            } as { suppressedReason: null; stepIndex?: number },
          },
          engine: { backgroundState },
        },
      },
    );

    fireEvent.press(
      getByTestId(
        `steps-root-${WalletHomeOnboardingStepsSelectors.PRIMARY_BUTTON}`,
      ),
    );
    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 1 }),
    );
  });
});
