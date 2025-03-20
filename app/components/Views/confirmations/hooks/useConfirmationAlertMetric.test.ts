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
      { key: AlertNames.Blockaid },
      { key: AlertNames.DomainMismatch },
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
  });

  const baseAlertProperties = {
    alert_trigger_count: 2,
    alert_trigger_name: [AlertNames.Blockaid, AlertNames.DomainMismatch],
    alert_resolved_count: 0,
    alert_resolved: [],
  };

  it('sets confirmation metrics properties on initialization', () => {
    (useSelector as jest.Mock).mockReturnValue({
      properties: baseAlertProperties,
    });

    renderHook(() => useConfirmationAlertMetric());

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: baseAlertProperties,
    });
  });

  it('tracks inline alert clicked', () => {
    (useSelector as jest.Mock).mockReturnValue({
      properties: {
        ...baseAlertProperties,
        alert_visualized: [],
      },
    });

    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackInlineAlertClicked();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_visualized: [AlertNames.DomainMismatch],
        alert_visualized_count: 1,
      },
    });
  });

  it('tracks alert rendered', () => {
    (useSelector as jest.Mock).mockReturnValue({
      properties: {
        ...baseAlertProperties,
        alert_rendered: [],
      },
    });

    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackAlertRendered();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_rendered: [AlertNames.DomainMismatch],
        alert_rendered_count: 1,
      },
    });
  });

  it('handles confirmed alerts correctly', () => {
    (mockUseAlerts.isAlertConfirmed as jest.Mock).mockImplementation((key: string) => key === AlertNames.Blockaid);

    (useSelector as jest.Mock).mockReturnValue({
      properties: baseAlertProperties,
    });

    renderHook(() => useConfirmationAlertMetric());

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_resolved_count: 1,
        alert_resolved: [AlertNames.Blockaid],
      },
    });
  });
});
