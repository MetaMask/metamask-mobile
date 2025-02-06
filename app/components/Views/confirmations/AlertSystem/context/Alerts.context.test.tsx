import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Severity, Alert } from '../../types/confirm-alerts';
import { useAlerts, AlertsContextProvider, AlertsContextParams } from './Alerts.context';
import useConfirmationAlerts from '../../hooks/useConfirmationAlerts';

jest.mock('../../hooks/useConfirmationAlerts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('AlertsContext', () => {
  const alert1: Alert = {
    key: 'alert1',
    field: 'from',
    severity: Severity.Danger,
    message: 'Danger alert',
    title: 'Alert 1',
  };

  const alert2: Alert = {
    key: 'alert2',
    severity: Severity.Warning,
    message: 'Warning alert',
    title: 'Alert 2',
  };

  const alert3: Alert = {
    key: 'alert3',
    severity: Severity.Info,
    message: 'Info alert',
    title: 'Alert 3',
  };

  const alertsMock = [alert1, alert2, alert3];

  (useConfirmationAlerts as jest.Mock).mockReturnValue(alertsMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderHookWithProvider = (hook: () => AlertsContextParams) => renderHook(hook, {
    wrapper: ({ children }) => <AlertsContextProvider>{children}</AlertsContextProvider>,
  });

  it('provides the correct context values', () => {
    const { result } = renderHookWithProvider(() => useAlerts());

    expect(result.current.alerts).toBeDefined();
    expect(result.current.dangerAlerts).toBeDefined();
    expect(result.current.fieldAlerts).toBeDefined();
    expect(result.current.generalAlerts).toBeDefined();
    expect(result.current.hasAlerts).toBeDefined();
    expect(result.current.hasDangerAlerts).toBeDefined();
    expect(result.current.hasUnconfirmedDangerAlerts).toBeDefined();
    expect(result.current.hasUnconfirmedFieldDangerAlerts).toBeDefined();
    expect(result.current.hideAlertModal).toBeDefined();
    expect(result.current.isAlertConfirmed).toBeDefined();
    expect(result.current.setAlertConfirmed).toBeDefined();
    expect(result.current.showAlertModal).toBeDefined();
    expect(result.current.unconfirmedDangerAlerts).toBeDefined();
    expect(result.current.unconfirmedFieldDangerAlerts).toBeDefined();
  });

  it('provides setAlertConfirmed and isAlertConfirmed functions', () => {
    const { result } = renderHookWithProvider(() => useAlerts());

    act(() => {
      result.current.setAlertConfirmed(alert1.key, true);
    });
    expect(result.current.isAlertConfirmed(alert1.key)).toBe(true);

    act(() => {
      result.current.setAlertConfirmed(alert1.key, false);
    });
    expect(result.current.isAlertConfirmed(alert1.key)).toBe(false);
  });

  it('provides showAlertModal and hideAlertModal functions', () => {
    const { result } = renderHookWithProvider(() => useAlerts());

    expect(result.current.alertModalVisible).toBe(false);

    act(() => {
      result.current.showAlertModal();
    });
    expect(result.current.alertModalVisible).toBe(true);

    act(() => {
      result.current.hideAlertModal();
    });
    expect(result.current.alertModalVisible).toBe(false);
  });
});
