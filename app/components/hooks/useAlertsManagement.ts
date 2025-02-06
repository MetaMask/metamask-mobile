import { useCallback, useMemo, useState } from 'react';
import { Alert, Severity } from '../Views/confirmations/types/confirm';

export const useAlertsManagement = (alerts: Alert[]) => {
  const [confirmed, setConfirmed] = useState<{ [key: string]: boolean }>({});

  const setAlertConfirmed = useCallback((key: string, confirm: boolean) => {
    setConfirmed((prevConfirmed) => ({
      ...prevConfirmed,
      [key]: confirm,
    }));
  }, []);

  const isAlertConfirmed = useCallback((key: string) => confirmed[key] ?? false, [confirmed]);

  const alertsMemo = useMemo(() => sortAlertsBySeverity(alerts), [alerts]);

  const generalAlerts = useMemo(() => alertsMemo.filter(alertSelected => alertSelected.field === undefined), [alertsMemo]);

  const fieldAlerts = useMemo(() => alertsMemo.filter(alertSelected => alertSelected.field !== undefined), [alertsMemo]);

  const unconfirmedDangerAlerts = useMemo(() => alertsMemo.filter(
    alertSelected => !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger
  ), [alertsMemo, isAlertConfirmed]);

  const dangerAlerts = useMemo(() => alertsMemo.filter(
    alertSelected => alertSelected.severity === Severity.Danger
  ), [alertsMemo]);

  const unconfirmedFieldDangerAlerts = useMemo(() => fieldAlerts.filter(
    alertSelected => !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger
  ), [fieldAlerts, isAlertConfirmed]);

  return {
    alerts: alertsMemo,
    dangerAlerts,
    fieldAlerts,
    generalAlerts,
    hasAlerts: alertsMemo.length > 0,
    hasDangerAlerts: dangerAlerts.length > 0,
    hasUnconfirmedDangerAlerts: unconfirmedDangerAlerts.length > 0,
    hasUnconfirmedFieldDangerAlerts: unconfirmedFieldDangerAlerts.length > 0,
    isAlertConfirmed,
    setAlertConfirmed,
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  };
};

function sortAlertsBySeverity(alerts: Alert[]): Alert[] {
    const severityOrder = {
        [Severity.Danger]: 3,
        [Severity.Warning]: 2,
        [Severity.Info]: 1,
    };
    return alerts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
}
