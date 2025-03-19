import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAlerts } from '../AlertSystem/context';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { useConfirmationAlertMetric, AlertNames } from './useConfirmationAlertMetric';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../AlertSystem/context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('./useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

describe('useConfirmationAlertMetric', () => {
  const mockSetConfirmationMetric = jest.fn();
  const mockUseAlerts = {
    alerts: [
      { key: AlertNames.DomainMismatch },
      { key: AlertNames.Blockaid },
    ],
    isAlertConfirmed: jest.fn(),
    alertKey: AlertNames.DomainMismatch,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useConfirmationMetricEvents as jest.Mock).mockReturnValue({
      setConfirmationMetric: mockSetConfirmationMetric,
    });
    (useAlerts as jest.Mock).mockReturnValue(mockUseAlerts);
    (useSelector as jest.Mock).mockReturnValue({
      alert_visualized: [],
      alert_rendered: [],
    });
  });

  it('should set confirmation metrics properties on initialization', () => {
    renderHook(() => useConfirmationAlertMetric());

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        alert_trigger_count: 2,
        alert_trigger_name: ['domain_mismatch', 'blockaid'],
        alert_resolved_count: 0,
        alert_resolved: [],
      },
    });
  });

  it('should track inline alert clicked', () => {
    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackInlineAlertClicked();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        alert_trigger_count: 2,
        alert_trigger_name: ['domain_mismatch', 'blockaid'],
        alert_resolved_count: 0,
        alert_resolved: [],
        alert_visualized: [AlertNames.DomainMismatch],
        alert_visualized_count: 1,
      },
    });
  });

  it('should track alert rendered', () => {
    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackAlertRendered();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        alert_trigger_count: 2,
        alert_trigger_name: ['domain_mismatch', 'blockaid'],
        alert_resolved_count: 0,
        alert_resolved: [],
        alert_rendered: [AlertNames.DomainMismatch],
        alert_rendered_count: 1,
      },
    });
  });

  it('should handle confirmed alerts correctly', () => {
    (mockUseAlerts.isAlertConfirmed as jest.Mock).mockImplementation((key: string) => key === AlertNames.Blockaid);

    renderHook(() => useConfirmationAlertMetric());

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        alert_trigger_count: 2,
        alert_trigger_name: ['domain_mismatch', 'blockaid'],
        alert_resolved_count: 1,
        alert_resolved: ['blockaid'],
      },
    });
  });
});
