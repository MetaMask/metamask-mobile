import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { AccountReadinessValue } from '../../../onboarding/accountReadiness.types';
import { AccountReadinessCardHost } from './AccountReadinessCardHost';
import { PredictHomeTestIds } from '../PredictHome.testIds';

const baseValue: AccountReadinessValue = {
  readiness: 'unknown',
  card: { kind: 'hidden' },
  connection: 'online',
  setup: 'closed',
  accountActions: 'readiness_gated',
  readError: 'none',
  latency: 'unknown',
  isRefreshing: false,
  startSetup: jest.fn(),
  retrySetup: jest.fn(),
  dismissVerified: jest.fn(),
  refreshStatus: jest.fn(),
};

const renderHost = (overrides: Partial<AccountReadinessValue> = {}) => {
  const value = { ...baseValue, ...overrides };
  return {
    value,
    ...render(<AccountReadinessCardHost value={value} />),
  };
};

describe('AccountReadinessCardHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  it('renders nothing when the card is hidden and the read is healthy', () => {
    renderHost();

    expect(
      screen.queryByTestId(PredictHomeTestIds.ACCOUNT_READINESS),
    ).toBeNull();
  });

  it('renders the get started invitation and resumes on press', () => {
    const startSetup = jest.fn();
    renderHost({
      readiness: 'setup_required',
      card: { kind: 'not_started' },
      startSetup,
    });

    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));

    expect(startSetup).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });

  it('renders finish verifying as a whole-card resume without a CTA', () => {
    const startSetup = jest.fn();
    renderHost({
      readiness: 'setup_required',
      card: { kind: 'finish_verifying', intent: 'resume' },
      startSetup,
    });

    const card = screen.getByTestId(PredictHomeTestIds.FINISH_VERIFYING_BANNER);
    expect(card.props.accessibilityLabel).toContain(
      strings('predict_next.account_readiness.finish_verifying.action'),
    );
    expect(
      screen.queryByRole('button', {
        name: strings('predict_next.account_readiness.finish_verifying.action'),
      }),
    ).toBeNull();

    fireEvent.press(card);

    expect(startSetup).toHaveBeenCalledTimes(1);
  });

  it('renders verifying as non-tappable status', () => {
    const startSetup = jest.fn();
    const retrySetup = jest.fn();
    renderHost({
      readiness: 'setup_required',
      card: { kind: 'verifying' },
      startSetup,
      retrySetup,
    });

    const banner = screen.getByTestId(
      PredictHomeTestIds.VERIFICATION_PENDING_BANNER,
    );
    expect(banner).not.toBeDisabled();
    fireEvent.press(banner);

    expect(startSetup).not.toHaveBeenCalled();
    expect(retrySetup).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(PredictHomeTestIds.VERIFICATION_PENDING_BANNER),
    ).toBeOnTheScreen();
  });

  it('renders verified with only a close action', () => {
    const dismissVerified = jest.fn();
    renderHost({
      readiness: 'ready',
      card: { kind: 'verified' },
      dismissVerified,
    });

    const card = screen.getByTestId(
      PredictHomeTestIds.IDENTITY_VERIFIED_BANNER,
    );
    expect(
      screen.queryByRole('button', {
        name: strings('predict_next.account_readiness.verified.title'),
      }),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.IDENTITY_VERIFIED_DISMISS),
    );

    expect(dismissVerified).toHaveBeenCalledTimes(1);
    expect(card).toBeOnTheScreen();
  });

  it.each([
    ['activation_required', 'Continue'],
    ['verification_failed', 'Start again'],
    ['cancelled', 'Start again'],
    ['status_unsupported', 'Try again'],
    ['status_inconsistent', 'Try again'],
    ['setup_unavailable', 'Try again'],
  ] as const)('maps %s to the %s accessible action', (reason, action) => {
    const retrySetup = jest.fn();
    renderHost({
      readiness: 'setup_required',
      card: { kind: 'action_required', reason, intent: 'retry' },
      retrySetup,
    });

    const card = screen.getByTestId(
      PredictHomeTestIds.ACCOUNT_SETUP_ACTION_REQUIRED_BANNER,
    );
    expect(card.props.accessibilityLabel).toContain(action);
    expect(screen.queryByText(action)).toBeNull();

    fireEvent.press(card);

    expect(retrySetup).toHaveBeenCalledTimes(1);
  });

  it('shows offline read status with a disabled setup card and no refresh', () => {
    renderHost({
      readiness: 'setup_required',
      card: { kind: 'not_started' },
      connection: 'offline',
    });

    expect(
      screen.getByText(strings('predict_next.account_readiness.offline')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictHomeTestIds.ACCOUNT_READINESS_REFRESH),
    ).toBeNull();
    expect(
      screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER),
    ).toBeDisabled();
  });

  it('shows read failures with an enabled refresh action', () => {
    const refreshStatus = jest.fn();
    renderHost({
      card: { kind: 'hidden' },
      readError: 'unavailable',
      refreshStatus,
    });

    expect(
      screen.getByText(strings('predict_next.account_readiness.read_failed')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.ACCOUNT_READINESS_REFRESH),
    );
    expect(refreshStatus).toHaveBeenCalledTimes(1);
  });

  it('shows the slow-connection message without swallowing a known card', () => {
    renderHost({
      readiness: 'setup_required',
      card: { kind: 'finish_verifying', intent: 'resume' },
      latency: 'slow',
    });

    expect(
      screen.getByText(
        strings('predict_next.account_readiness.slow_connection'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictHomeTestIds.FINISH_VERIFYING_BANNER),
    ).toBeOnTheScreen();
  });

  it('announces each normalized card kind once', () => {
    const { rerender } = renderHost({
      readiness: 'setup_required',
      card: { kind: 'not_started' },
    });

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenLastCalledWith(
      strings('predict_next.get_started_banner.title'),
    );

    rerender(
      <AccountReadinessCardHost
        value={{
          ...baseValue,
          readiness: 'setup_required',
          card: { kind: 'not_started' },
        }}
      />,
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);

    rerender(
      <AccountReadinessCardHost
        value={{
          ...baseValue,
          readiness: 'setup_required',
          card: { kind: 'verifying' },
        }}
      />,
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenLastCalledWith(
      strings('predict_next.account_readiness.verifying.title'),
    );
  });
});
