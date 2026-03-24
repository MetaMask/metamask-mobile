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

  const blockerAlertMock: Alert = {
    key: 'alert4',
    severity: Severity.Danger,
    message: 'Blocker alert',
    title: 'Alert 4',
    isBlocking: true,
  };

  const skipConfirmationAlertMock: Alert = {
    key: 'alert5',
    severity: Severity.Danger,
    message: 'Skip confirmation alert',
    title: 'Alert 5',
    skipConfirmation: true,
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
    expect(result.current.unconfirmedFieldDangerAlerts).toEqual([
      dangerAlertMock,
    ]);
    expect(result.current.hasUnconfirmedFieldDangerAlerts).toBe(true);
  });

  it('returns hasBlockingAlerts true when there is a blocker alert', () => {
    const { result } = renderHook(() => useAlertsConfirmed([blockerAlertMock]));
    expect(result.current.hasBlockingAlerts).toBe(true);
  });

  it('returns hasUnconfirmedDangerAlerts false when there is a skip confirmation alert', () => {
    const { result } = renderHook(() =>
      useAlertsConfirmed([skipConfirmationAlertMock]),
    );
    expect(result.current.hasUnconfirmedDangerAlerts).toBe(false);
  });

  it('auto-confirms new alerts with skipConfirmation when alerts array updates', () => {
    const { result, rerender } = renderHook(
      ({ alerts }) => useAlertsConfirmed(alerts),
      { initialProps: { alerts: alertsMock } },
    );

    // Initially, alert5 is not in the list
    expect(result.current.isAlertConfirmed(skipConfirmationAlertMock.key)).toBe(
      false,
    );

    // Add the skipConfirmation alert
    rerender({ alerts: [...alertsMock, skipConfirmationAlertMock] });

    // Alert5 should now be auto-confirmed
    expect(result.current.isAlertConfirmed(skipConfirmationAlertMock.key)).toBe(
      true,
    );
    expect(result.current.hasUnconfirmedDangerAlerts).toBe(true); // alert1 is still unconfirmed
  });
});
