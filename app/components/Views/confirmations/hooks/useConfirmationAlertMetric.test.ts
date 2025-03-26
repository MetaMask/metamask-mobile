import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAlerts } from '../AlertSystem/context';
import { useConfirmationMetricEvents } from './useConfirmationMetricEvents';
import { useConfirmationAlertMetric } from './useConfirmationAlertMetric';
import { AlertKeys } from '../constants/alerts';

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
      { key: AlertKeys.Blockaid },
      { key: AlertKeys.DomainMismatch },
    ],
    isAlertConfirmed: jest.fn(),
    alertKey: AlertKeys.DomainMismatch,
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
    alert_trigger_name: [AlertKeys.Blockaid, AlertKeys.DomainMismatch],
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
        alert_key_clicked: [AlertKeys.DomainMismatch],
      },
    });
  });

  it('tracks alert rendered', () => {
    (useSelector as jest.Mock).mockReturnValue({
      properties: {
        ...baseAlertProperties,
      },
    });

    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackAlertRendered();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_visualized: [AlertKeys.DomainMismatch],
        alert_visualized_count: 1,
      },
    });
  });

  it('handles confirmed alerts correctly', () => {
    (mockUseAlerts.isAlertConfirmed as jest.Mock).mockImplementation((key: string) => key === AlertKeys.Blockaid);

    (useSelector as jest.Mock).mockReturnValue({
      properties: baseAlertProperties,
    });

    renderHook(() => useConfirmationAlertMetric());

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_resolved_count: 1,
        alert_resolved: [AlertKeys.Blockaid],
      },
    });
  });

  it('uses alertKey when there is no match in ALERTS_NAME_METRICS', () => {
    const UNKNOWN_ALERT_KEY_MOCK = 'unknown_alert';
    const mockUseAlertsWithUnknownKey = {
      alerts: [
        { key: UNKNOWN_ALERT_KEY_MOCK },
      ],
      isAlertConfirmed: jest.fn(),
      alertKey: UNKNOWN_ALERT_KEY_MOCK,
    };

    (useAlerts as jest.Mock).mockReturnValue(mockUseAlertsWithUnknownKey);
    (useSelector as jest.Mock).mockReturnValue({
      properties: {
        alert_trigger_count: 1,
        alert_trigger_name: [UNKNOWN_ALERT_KEY_MOCK],
        alert_resolved_count: 0,
        alert_resolved: [],
        alert_visualized: [],
      },
    });

    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackInlineAlertClicked();

    expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(2);
    expect(mockSetConfirmationMetric).toHaveBeenNthCalledWith(2, {
      properties: {
        alert_trigger_count: 1,
        alert_trigger_name: [UNKNOWN_ALERT_KEY_MOCK],
        alert_resolved_count: 0,
        alert_resolved: [],
        alert_key_clicked: [UNKNOWN_ALERT_KEY_MOCK],
      },
    });
  });

  it('handles undefined alert_visualized', () => {
    (mockUseAlerts.isAlertConfirmed as jest.Mock).mockReturnValue(false);
    (useSelector as jest.Mock).mockReturnValue({
      properties: {
        ...baseAlertProperties,
        alert_visualized: undefined,
      },
    });

    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackAlertRendered();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_visualized: [AlertKeys.DomainMismatch],
        alert_visualized_count: 1,
      },
    });
  });

  it('handles undefined alert_key', () => {
    (mockUseAlerts.isAlertConfirmed as jest.Mock).mockReturnValue(false);
    (useSelector as jest.Mock).mockReturnValue({
      properties: {
        ...baseAlertProperties,
        alert_key_clicked: undefined,
      },
    });

    const { result } = renderHook(() => useConfirmationAlertMetric());

    result.current.trackInlineAlertClicked();

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        ...baseAlertProperties,
        alert_key_clicked: [AlertKeys.DomainMismatch],
      },
    });
  });
});
