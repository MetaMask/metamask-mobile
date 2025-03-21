import { renderHook } from '@testing-library/react-hooks';
import useConfirmationAlerts from './useConfirmationAlerts';
import useBlockaidAlerts from './alerts/useBlockaidAlerts';
import { Alert, Severity } from '../types/alerts';

jest.mock('./alerts/useBlockaidAlerts');

describe('useConfirmationAlerts', () => {
  const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
  const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
  const mockBlockaidAlerts: Alert[] = [
    {
      key: 'alert1',
      title: 'Test Alert',
      message: ALERT_MESSAGE_MOCK,
      severity: Severity.Warning,
      alertDetails: ALERT_DETAILS_MOCK,
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useBlockaidAlerts as jest.Mock).mockReturnValue(mockBlockaidAlerts);
  });

  it('returns empty array if no alerts', () => {
    (useBlockaidAlerts as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useConfirmationAlerts());
    expect(result.current).toEqual([]);
  });

  it('returns blockaid alerts', () => {
    const { result } = renderHook(() => useConfirmationAlerts());
    expect(result.current).toEqual(mockBlockaidAlerts);
  });
});
