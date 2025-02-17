import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import { useAlertsManagement } from './useAlertsManagement';
import { Alert, Severity } from '../Views/confirmations/types/confirm-alerts';

describe('useAlertsManagement', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('alerts', () => {
    it('returns all alerts', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      expect(result.current.alerts).toEqual(alertsMock);
      expect(result.current.hasAlerts).toEqual(true);
    });

    it('returns alerts ordered by severity', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      const orderedAlerts = result.current.alerts;
      expect(orderedAlerts[0].severity).toEqual(Severity.Danger);
    });
  });

  describe('unconfirmedDangerAlerts', () => {
    it('returns all unconfirmed danger alerts', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      expect(result.current.hasUnconfirmedDangerAlerts).toEqual(true);
      expect(result.current.unconfirmedDangerAlerts).toHaveLength(1);
    });
  });

  describe('unconfirmedFieldDangerAlerts', () => {
    it('returns all unconfirmed field danger alerts', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      expect(result.current.unconfirmedFieldDangerAlerts).toEqual([alert1]);
    });
  });

  describe('hasUnconfirmedFieldDangerAlerts', () => {
    it('returns true if there are unconfirmed field danger alerts', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      expect(result.current.hasUnconfirmedFieldDangerAlerts).toEqual(true);
    });
  });

  describe('generalAlerts', () => {
    it('returns general alerts sorted by severity', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      const generalAlerts = result.current.generalAlerts;
      expect(generalAlerts[0]?.severity).toEqual(Severity.Warning);
    });
  });

  describe('fieldAlerts', () => {
    it('returns all alerts with field property', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      expect(result.current.fieldAlerts).toEqual([alert1]);
    });
  });

  describe('isAlertConfirmed', () => {
    it('returns if an alert is confirmed', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      act(() => {
        result.current.setAlertConfirmed(alert1.key, true);
      });
      expect(result.current.isAlertConfirmed(alert1.key)).toBe(true);
    });

    it('dismisses alert confirmation', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      act(() => {
        result.current.setAlertConfirmed(alert1.key, false);
      });
      expect(result.current.isAlertConfirmed(alert1.key)).toBe(false);
    });

    it('confirms an alert', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      act(() => {
        result.current.setAlertConfirmed(alert1.key, true);
      });
      expect(result.current.isAlertConfirmed(alert1.key)).toBe(true);
    });
  });

  describe('alertKey', () => {
    it('returns the initial alert key', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      expect(result.current.alertKey).toEqual(alert1.key);
    });

    it('sets a new alert key', () => {
      const { result } = renderHookWithProvider(() => useAlertsManagement(alertsMock));
      act(() => {
        result.current.setAlertKey(alert2.key);
      });
      expect(result.current.alertKey).toEqual(alert2.key);
    });
  });
});
