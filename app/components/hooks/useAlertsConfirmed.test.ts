import { renderHook, act } from '@testing-library/react-hooks';
import { useAlertsConfirmed } from './useAlertsConfirmed';
import { Alert, Severity } from '../Views/confirmations/types/alerts';

describe('useAlertsConfirmed', () => {
  const dangerAlertMock: Alert = {
    key: 'alert1',
    field: 'from',
    severity: Severity.Danger,
    message: 'Danger alert',
    title: 'Alert 1',
  };

  const warningAlertMock: Alert = {
    key: 'alert2',
    severity: Severity.Warning,
    message: 'Warning alert',
    title: 'Alert 2',
  };

  const infoAlertMock: Alert = {
    key: 'alert3',
    severity: Severity.Info,
    message: 'Info alert',
    title: 'Alert 3',
  };

  const alertsMock = [dangerAlertMock, warningAlertMock, infoAlertMock];

  it('sets and gets alert confirmation status', () => {
    const { result } = renderHook(() => useAlertsConfirmed(alertsMock));

    act(() => {
      result.current.setAlertConfirmed(dangerAlertMock.key, true);
    });
    expect(result.current.isAlertConfirmed(dangerAlertMock.key)).toBe(true);

    act(() => {
      result.current.setAlertConfirmed(dangerAlertMock.key, false);
    });
    expect(result.current.isAlertConfirmed(dangerAlertMock.key)).toBe(false);
  });

  it('returns unconfirmed danger alerts', () => {
    const { result } = renderHook(() => useAlertsConfirmed(alertsMock));
    expect(result.current.unconfirmedDangerAlerts).toEqual([dangerAlertMock]);
    expect(result.current.hasUnconfirmedDangerAlerts).toBe(true);
  });

  it('returns unconfirmed field danger alerts', () => {
    const { result } = renderHook(() => useAlertsConfirmed(alertsMock));
    expect(result.current.unconfirmedFieldDangerAlerts).toEqual([dangerAlertMock]);
    expect(result.current.hasUnconfirmedFieldDangerAlerts).toBe(true);
  });

});
