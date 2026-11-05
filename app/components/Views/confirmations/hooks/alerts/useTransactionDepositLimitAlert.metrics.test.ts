import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAlerts } from '../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../metrics/useConfirmationAlertMetrics';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));
jest.mock('../metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));
jest.mock('../signatures/useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

/**
 * The deposit cap blocks the amount keypad, so the alert it produces has to
 * reach the confirmation alert context to be reported as `deposit_limit` on
 * the transaction events. This covers the mapping at the end of that path.
 */
describe('deposit limit alert metrics', () => {
  const mockSetConfirmationMetric = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useConfirmationMetricEvents as jest.Mock).mockReturnValue({
      setConfirmationMetric: mockSetConfirmationMetric,
    });
    (useSignatureRequest as jest.Mock).mockReturnValue(undefined);
    (useSelector as jest.Mock).mockReturnValue(undefined);
  });

  it('reports an over-cap deposit alert as deposit_limit', () => {
    const title = 'Max deposit: $100,000';

    (useAlerts as jest.Mock).mockReturnValue({
      alerts: [
        {
          key: AlertKeys.DepositLimit,
          field: RowAlertKey.Amount,
          title,
          message: title,
          severity: Severity.Danger,
          isBlocking: true,
        },
      ],
      isAlertConfirmed: jest.fn().mockReturnValue(false),
      alertKey: AlertKeys.DepositLimit,
    });

    const { result } = renderHook(() => useConfirmationAlertMetrics());

    result.current.trackAlertMetrics();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        alert_trigger_count: 1,
        alert_trigger_name: ['deposit_limit'],
        alert_resolved_count: 0,
        alert_resolved: [],
      },
    });
  });

  it('does not write alert properties when the amount is under the cap', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      alerts: [],
      isAlertConfirmed: jest.fn().mockReturnValue(false),
      alertKey: '',
    });

    const { result } = renderHook(() => useConfirmationAlertMetrics());

    result.current.trackAlertMetrics();

    expect(mockSetConfirmationMetric).not.toHaveBeenCalled();
  });
});
