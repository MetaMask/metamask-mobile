import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import WalletHomeOnboardingSteps from './WalletHomeOnboardingSteps';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { WalletHomeOnboardingStepsSelectors } from './WalletHomeOnboardingSteps.testIds';
import {
  __clearLastMockedMethods,
  __getLastMockedMethods,
  __mockRiveFireState,
} from '../../../__mocks__/rive-react-native';
import {
  WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_MAIN_TRIGGER,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_OUTRO_TRIGGER,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE,
  WALLET_HOME_ONBOARDING_CHECKLIST_STEP_FULL_TRANSITION_MS,
  WALLET_HOME_ONBOARDING_POST_NAV_RESUME_HOLD_MS,
} from './walletHomeOnboardingChecklistRive';

const mockUseIsFocused = jest.fn(() => true);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useIsFocused: () => mockUseIsFocused(),
  };
});

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
    __mockRiveFireState.mockClear();
    mockUseIsFocused.mockReturnValue(true);
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

  it('invokes onFundPrimaryPress and advances after return only when balance gate is true', async () => {
    const onFundPrimaryPress = jest.fn();
    const state = {
      onboarding: {
        ...baseOnboarding,
      },
      engine: { backgroundState },
    };
    const { getByTestId, store, rerender } = renderWithProvider(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onFundPrimaryPress={onFundPrimaryPress}
        canAdvanceFundStepAfterBalance={false}
      />,
      { state },
    );

    fireEvent.press(getByTestId(primaryTestId));
    expect(onFundPrimaryPress).toHaveBeenCalledTimes(1);
    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 0 }),
    );

    mockUseIsFocused.mockReturnValue(false);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onFundPrimaryPress={onFundPrimaryPress}
        canAdvanceFundStepAfterBalance={false}
      />,
    );
    mockUseIsFocused.mockReturnValue(true);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onFundPrimaryPress={onFundPrimaryPress}
        canAdvanceFundStepAfterBalance
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    await act(async () => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_POST_NAV_RESUME_HOLD_MS + 100,
      );
    });

    await flushWalletHomeStepTransition();

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 1 }),
      );
    });
  });

  it('allows another fund primary press after returning without funded balance', async () => {
    const onFundPrimaryPress = jest.fn();
    const state = {
      onboarding: { ...baseOnboarding },
      engine: { backgroundState },
    };
    const { getByTestId, rerender } = renderWithProvider(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onFundPrimaryPress={onFundPrimaryPress}
        canAdvanceFundStepAfterBalance={false}
      />,
      { state },
    );

    fireEvent.press(getByTestId(primaryTestId));
    mockUseIsFocused.mockReturnValue(false);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onFundPrimaryPress={onFundPrimaryPress}
        canAdvanceFundStepAfterBalance={false}
      />,
    );
    mockUseIsFocused.mockReturnValue(true);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onFundPrimaryPress={onFundPrimaryPress}
        canAdvanceFundStepAfterBalance={false}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    fireEvent.press(getByTestId(primaryTestId));
    expect(onFundPrimaryPress).toHaveBeenCalledTimes(2);
  });

  it('advances from fund when balance gate becomes true without deferred on-ramp navigation', async () => {
    const state = {
      onboarding: { ...baseOnboarding },
      engine: { backgroundState },
    };
    const { store, rerender } = renderWithProvider(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        canAdvanceFundStepAfterBalance={false}
      />,
      { state },
    );

    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        canAdvanceFundStepAfterBalance
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_POST_NAV_RESUME_HOLD_MS + 100,
      );
    });

    await flushWalletHomeStepTransition();

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 1 }),
      );
    });
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

  it('invokes trade primary commit when Primary is pressed on trade step', async () => {
    const onTradePrimaryPress = jest.fn();
    const { getByTestId, store, rerender } = renderWithProvider(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onTradePrimaryPress={onTradePrimaryPress}
      />,
      {
        state: {
          onboarding: {
            ...baseOnboarding,
            walletHomeOnboardingSteps: {
              suppressedReason: null,
              stepIndex: 1,
            },
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

    expect(onTradePrimaryPress).toHaveBeenCalledTimes(1);
    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ stepIndex: 1 }),
    );

    mockUseIsFocused.mockReturnValue(false);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onTradePrimaryPress={onTradePrimaryPress}
      />,
    );
    mockUseIsFocused.mockReturnValue(true);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onTradePrimaryPress={onTradePrimaryPress}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    expect(__mockRiveFireState).toHaveBeenCalledWith(
      WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE,
      WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_MAIN_TRIGGER,
    );

    await act(async () => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_POST_NAV_RESUME_HOLD_MS +
          WALLET_HOME_ONBOARDING_CHECKLIST_STEP_FULL_TRANSITION_MS +
          100,
      );
    });

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ stepIndex: 2 }),
      );
    });
  });

  it('completes notifications step after return when primary navigates away', async () => {
    const onNotificationsPrimaryPress = jest.fn();
    const { getByTestId, store, rerender } = renderWithProvider(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onNotificationsPrimaryPress={onNotificationsPrimaryPress}
      />,
      {
        state: {
          onboarding: {
            ...baseOnboarding,
            walletHomeOnboardingSteps: {
              suppressedReason: null,
              stepIndex: 2,
            },
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

    expect(onNotificationsPrimaryPress).toHaveBeenCalledTimes(1);
    expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
      expect.objectContaining({ suppressedReason: null, stepIndex: 2 }),
    );

    mockUseIsFocused.mockReturnValue(false);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onNotificationsPrimaryPress={onNotificationsPrimaryPress}
      />,
    );
    mockUseIsFocused.mockReturnValue(true);
    rerender(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onNotificationsPrimaryPress={onNotificationsPrimaryPress}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_POST_NAV_RESUME_HOLD_MS +
          WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS +
          100,
      );
    });

    await waitFor(() => {
      expect(store.getState().onboarding.walletHomeOnboardingSteps).toEqual(
        expect.objectContaining({ suppressedReason: 'flow_completed' }),
      );
    });
  });

  it('does not invoke trade primary commit when Skip is pressed on trade step', async () => {
    const onTradePrimaryPress = jest.fn();
    const { getByTestId, store } = renderWithProvider(
      <WalletHomeOnboardingSteps
        testID="steps-root"
        onTradePrimaryPress={onTradePrimaryPress}
      />,
      {
        state: {
          onboarding: {
            ...baseOnboarding,
            walletHomeOnboardingSteps: {
              suppressedReason: null,
              stepIndex: 1,
            },
          },
          engine: { backgroundState },
        },
      },
    );

    fireEvent.press(
      getByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
    );

    expect(onTradePrimaryPress).not.toHaveBeenCalled();

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

  it('shows first-step shell with awaiting hero and disabled primary when isAwaitingBalance', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHomeOnboardingSteps testID="steps-root" isAwaitingBalance />,
      {
        state: {
          onboarding: {
            ...baseOnboarding,
            walletHomeOnboardingSteps: {
              suppressedReason: null,
              stepIndex: 2,
            },
          },
          engine: { backgroundState },
        },
      },
    );

    expect(getByTestId('steps-root-hero-awaiting-balance')).toBeOnTheScreen();
    expect(getByTestId('steps-root-hero-fund')).toBeOnTheScreen();
    expect(getByTestId(primaryTestId)).toBeDisabled();
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
