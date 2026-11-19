import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfirmationAlertMetrics } from './confirmation-alert-metrics';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';
import { AlertKeys } from '../../../constants/alerts';
import { Alert, Severity } from '../../../types/alerts';

jest.mock('../../../context/alert-system-context');
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics');

const DEPOSIT_LIMIT_ALERT: Alert = {
  key: AlertKeys.DepositLimit,
  title: 'Max deposit: $100,000',
  message: 'Max deposit: $100,000',
  severity: Severity.Danger,
  isBlocking: true,
};

describe('ConfirmationAlertMetrics', () => {
  const mockTrackAlertMetrics = jest.fn();

  function mockAlerts(alerts: Alert[]) {
    jest
      .mocked(useAlerts)
      .mockReturnValue({ alerts } as unknown as ReturnType<typeof useAlerts>);
  }

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(useConfirmationAlertMetrics).mockReturnValue({
      trackAlertMetrics: mockTrackAlertMetrics,
      trackAlertRendered: jest.fn(),
      trackInlineAlertClicked: jest.fn(),
    });
  });

  it('tracks alert metrics on mount', () => {
    mockAlerts([DEPOSIT_LIMIT_ALERT]);

    render(<ConfirmationAlertMetrics />);

    expect(mockTrackAlertMetrics).toHaveBeenCalledTimes(1);
  });

  it('re-tracks when the alert list changes', () => {
    mockAlerts([]);

    const { rerender } = render(<ConfirmationAlertMetrics />);
    expect(mockTrackAlertMetrics).toHaveBeenCalledTimes(1);

    mockAlerts([DEPOSIT_LIMIT_ALERT]);
    rerender(<ConfirmationAlertMetrics />);

    expect(mockTrackAlertMetrics).toHaveBeenCalledTimes(2);
  });

  it('renders nothing', () => {
    mockAlerts([DEPOSIT_LIMIT_ALERT]);

    const { toJSON } = render(<ConfirmationAlertMetrics />);

    expect(toJSON()).toBeNull();
  });
});
