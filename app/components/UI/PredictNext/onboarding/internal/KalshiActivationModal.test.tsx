import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { KalshiDemoOnboardingTestIds as TestIds } from './KalshiDemoOnboarding.testIds';
import { KalshiActivationModal } from './KalshiActivationModal';
import type { KalshiActivation } from './useKalshiActivation';

const WALLET = '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c';

const buildActivation = (
  overrides: Partial<KalshiActivation> = {},
): KalshiActivation => ({
  status: 'approved',
  requiresActivation: true,
  completed: false,
  registerAccepted: false,
  busy: false,
  refresh: jest.fn(),
  activate: jest.fn(),
  checkAgain: jest.fn(),
  dismiss: jest.fn(),
  ...overrides,
});

const renderModal = (activation: KalshiActivation) =>
  render(
    <KalshiActivationModal
      activation={activation}
      walletAddress={WALLET}
      network="base"
      onDismiss={jest.fn()}
    />,
  );

describe('KalshiActivationModal', () => {
  let announceForAccessibility: jest.SpyInstance;

  beforeEach(() => {
    announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    announceForAccessibility.mockRestore();
  });

  it('announces a failure and exposes it as an alert', () => {
    const { rerender } = renderModal(buildActivation());
    expect(announceForAccessibility).not.toHaveBeenCalled();

    rerender(
      <KalshiActivationModal
        activation={buildActivation({
          failure: { message: 'generic', action: 'activate' },
        })}
        walletAddress={WALLET}
        network="base"
        onDismiss={jest.fn()}
      />,
    );

    const message = screen.getByTestId(TestIds.MESSAGE);
    expect(message).toHaveTextContent('Something went wrong.');
    expect(message.props.accessibilityRole).toBe('alert');
    expect(announceForAccessibility).toHaveBeenLastCalledWith(
      'Something went wrong.',
    );
  });

  it('announces when activation completes', () => {
    const { rerender } = renderModal(buildActivation());

    rerender(
      <KalshiActivationModal
        activation={buildActivation({ completed: true })}
        walletAddress={WALLET}
        network="base"
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId(TestIds.DONE)).toBeOnTheScreen();
    expect(announceForAccessibility).toHaveBeenLastCalledWith('Account ready');
  });

  it('activates before any register is accepted', () => {
    const activation = buildActivation();
    renderModal(activation);

    fireEvent.press(screen.getByTestId(TestIds.ACTIVATE));

    expect(activation.activate).toHaveBeenCalledTimes(1);
    expect(activation.checkAgain).not.toHaveBeenCalled();
  });

  it('re-reads status instead of registering again after acceptance', () => {
    const activation = buildActivation({ registerAccepted: true });
    renderModal(activation);

    const button = screen.getByTestId(TestIds.ACTIVATE);
    expect(button).toHaveTextContent('Check again');
    fireEvent.press(button);

    expect(activation.checkAgain).toHaveBeenCalledTimes(1);
    expect(activation.activate).not.toHaveBeenCalled();
  });

  it('hides the primary action for final failures', () => {
    renderModal(
      buildActivation({
        failure: { message: 'account_blocked', action: 'none' },
      }),
    );

    expect(screen.queryByTestId(TestIds.ACTIVATE)).toBeNull();
    expect(screen.getByTestId(TestIds.NOT_NOW)).toBeOnTheScreen();
  });
});
