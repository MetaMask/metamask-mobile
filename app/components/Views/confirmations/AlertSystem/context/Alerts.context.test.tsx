import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Severity, Alert } from '../../types/alerts';
import { useAlerts, AlertsContextProvider, AlertsContextParams } from './Alerts.context';

jest.mock('../../hooks/useConfirmationAlerts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('AlertsContext', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderHookWithProvider = (hook: () => AlertsContextParams) => renderHook(hook, {
    wrapper: ({ children }) => <AlertsContextProvider alerts={alertsMock}>{children}</AlertsContextProvider>,
  });

  describe('useAlerts', () => {
    it('provides the correct context values', () => {
      const { result } = renderHookWithProvider(() => useAlerts());

      expect(result.current.alerts).toBeDefined();
      expect(result.current.dangerAlerts).toBeDefined();
      expect(result.current.fieldAlerts).toBeDefined();
      expect(result.current.generalAlerts).toBeDefined();
      expect(result.current.hasAlerts).toBeDefined();
      expect(result.current.hasDangerAlerts).toBeDefined();
      expect(result.current.hideAlertModal).toBeDefined();
      expect(result.current.showAlertModal).toBeDefined();
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

    it('context value is correct when there are no alerts', () => {
      const { result } = renderHook(() => useAlerts(), {
        wrapper: ({ children }) => <AlertsContextProvider alerts={[]}>{children}</AlertsContextProvider>,
      });

      expect(result.current.alerts).toEqual([]);
      expect(result.current.dangerAlerts).toEqual([]);
      expect(result.current.fieldAlerts).toEqual([]);
      expect(result.current.generalAlerts).toEqual([]);
      expect(result.current.hasAlerts).toBe(false);
      expect(result.current.hasDangerAlerts).toBe(false);
    });
  });

  describe('useAlertsManagement', () => {
    it('returns all alerts', () => {
      const { result } = renderHookWithProvider(() => useAlerts());
      expect(result.current.alerts).toEqual(alertsMock);
      expect(result.current.hasAlerts).toEqual(true);
    });

    it('returns alerts ordered by severity', () => {
      const { result } = renderHookWithProvider(() => useAlerts());
      const orderedAlerts = result.current.alerts;
      expect(orderedAlerts[0].severity).toEqual(Severity.Danger);
    });

    it('returns general alerts sorted by severity', () => {
      const { result } = renderHookWithProvider(() => useAlerts());
      const generalAlerts = result.current.generalAlerts;
      expect(generalAlerts[0]?.severity).toEqual(Severity.Warning);
    });

    it('returns all alerts with field property', () => {
      const { result } = renderHookWithProvider(() => useAlerts());
      expect(result.current.fieldAlerts).toEqual([dangerAlertMock]);
    });

    it('initializes with the correct alert key', () => {
      const { result } = renderHookWithProvider(() => useAlerts());
      expect(result.current.alertKey).toBe(dangerAlertMock.key);
    });

    it('sets a new alert key', () => {
      const { result } = renderHookWithProvider(() => useAlerts());

      act(() => {
        result.current.setAlertKey(warningAlertMock.key);
      });
      expect(result.current.alertKey).toBe(warningAlertMock.key);
    });
  });

  describe('AlertsContextProvider', () => {
    it('should throw error if not wrapped in AlertsContextProvider', () => {
      expect(() => {
        useAlerts();
      }).toThrow();
    });
  });
});
