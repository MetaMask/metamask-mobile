import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Severity, Alert } from '../../types/alerts';
import { useAlerts, AlertsContextProvider, AlertsContextParams } from './alert-system-context';
import { useAlertsConfirmed } from '../../../../hooks/useAlertsConfirmed';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../hooks/alerts/useConfirmationAlerts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../hooks/useAlertsConfirmed', () => ({
  useAlertsConfirmed: jest.fn(),
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

  const mockUseAlertsConfirmed = {
    hasBlockingAlerts: false,
    hasUnconfirmedDangerAlerts: false,
    hasUnconfirmedFieldDangerAlerts: false,
    isAlertConfirmed: jest.fn(),
    setAlertConfirmed: jest.fn(),
    unconfirmedDangerAlerts: [],
    unconfirmedFieldDangerAlerts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlertsConfirmed as jest.Mock).mockReturnValue(mockUseAlertsConfirmed);
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
      expect(result.current.hasUnconfirmedDangerAlerts).toBeDefined();
      expect(result.current.hasUnconfirmedFieldDangerAlerts).toBeDefined();
      expect(result.current.isAlertConfirmed).toBeDefined();
      expect(result.current.setAlertConfirmed).toBeDefined();
      expect(result.current.unconfirmedDangerAlerts).toBeDefined();
      expect(result.current.unconfirmedFieldDangerAlerts).toBeDefined();
      expect(result.current.hasBlockingAlerts).toBeDefined();
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
      expect(result.current.hasBlockingAlerts).toBe(false);
    });

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

    it('should throw error if not wrapped in AlertsContextProvider', () => {
      expect(() => {
        useAlerts();
      }).toThrow();
    });
  });
});
