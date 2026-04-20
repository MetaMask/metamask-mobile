import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import WalletHomeOnboardingSteps from './WalletHomeOnboardingSteps';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { WalletHomeOnboardingStepsSelectors } from './WalletHomeOnboardingSteps.testIds';
import {
  __clearLastMockedMethods,
  __getLastMockedMethods,
} from '../../../__mocks__/rive-react-native';
import {
  WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_OUTRO_TRIGGER,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE,
  WALLET_HOME_ONBOARDING_CHECKLIST_STEP_FULL_TRANSITION_MS,
} from './walletHomeOnboardingChecklistRive';

async function flushWalletHomeStepTransition() {
  await act(async () => {
    jest.advanceTimersByTime(
      WALLET_HOME_ONBOARDING_CHECKLIST_STEP_FULL_TRANSITION_MS + 100,
    );
  });
}

describe('WalletHomeOnboardingSteps', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    __clearLastMockedMethods();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('advances from fund step when primary is pressed', async () => {
    const { getByTestId, store } = renderSteps();

    fireEvent.press(getByTestId(primaryTestId));
    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 0 }),
    );

    await flushWalletHomeStepTransition();

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 1 }),
      );
    });
  });

  it('advances from trade step when Skip is pressed', async () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 1 },
    });

    fireEvent.press(
      getByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
    );

    await flushWalletHomeStepTransition();

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 2 }),
      );
    });
  });

  it('advances from trade step when primary is pressed', async () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 1 },
    });

    fireEvent.press(getByTestId(primaryTestId));

    await flushWalletHomeStepTransition();

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 2 }),
      );
    });
  });

  it('completes flow when primary is pressed on last step', async () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 2 },
    });

    fireEvent.press(getByTestId(primaryTestId));

    await act(async () => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS + 100,
      );
    });

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ suppressedReason: 'flow_completed' }),
      );
    });
  });

  it('completes flow when Skip is pressed on last step', async () => {
    const { getByTestId, store } = renderSteps({
      walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 2 },
    });

    fireEvent.press(
      getByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
    );

    await act(async () => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS + 100,
      );
    });

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ suppressedReason: 'flow_completed' }),
      );
    });
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

  it('fires checklist Rive outro before advancing from fund step', async () => {
    const { getByTestId, store } = renderSteps();
    const fundStepRiveMethods = __getLastMockedMethods();

    fireEvent.press(getByTestId(primaryTestId));

    expect(fundStepRiveMethods?.fireState).toHaveBeenCalledWith(
      WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE,
      WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_OUTRO_TRIGGER,
    );
    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 0 }),
    );

    await flushWalletHomeStepTransition();

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 1 }),
      );
    });
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

  it('treats missing stepIndex in persisted state as 0', async () => {
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
    await flushWalletHomeStepTransition();
    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 1 }),
      );
    });
  });
});
