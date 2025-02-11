import { useCallback, useMemo, useState } from 'react';
import { Alert, Severity } from '../Views/confirmations/types/confirm-alerts';

/**
 * Custom hook to manage alerts.
 * @param alerts - Array of alerts to manage.
 * @returns An object containing various alert-related states and functions.
 */
export const useAlertsManagement = (alerts: Alert[]) => {
  const [confirmed, setConfirmed] = useState<{ [key: string]: boolean }>({});
  const [alertKey, setAlertKey] = useState(alerts[0]?.key);

  /**
   * Sets the confirmation status of an alert.
   * @param key - The key of the alert.
   * @param confirm - The confirmation status to set.
   */
  const setAlertConfirmed = useCallback((key: string, confirm: boolean) => {
    setConfirmed((prevConfirmed) => ({
      ...prevConfirmed,
      [key]: confirm,
    }));
  }, []);

  /**
   * Checks if an alert is confirmed.
   * @param key - The key of the alert.
   * @returns True if the alert is confirmed, false otherwise.
   */
  const isAlertConfirmed = useCallback((key: string) => confirmed[key] ?? false, [confirmed]);

  /**
   * Sorted alerts by severity.
   */
  const alertsMemo = useMemo(() => sortAlertsBySeverity(alerts), [alerts]);

  /**
   * General alerts (alerts without a specific field).
   */
  const generalAlerts = useMemo(() => alertsMemo.filter(alertSelected => alertSelected.field === undefined), [alertsMemo]);

  /**
   * Field alerts (alerts with a specific field).
   */
  const fieldAlerts = useMemo(() => alertsMemo.filter(alertSelected => alertSelected.field !== undefined), [alertsMemo]);

  /**
   * Unconfirmed danger alerts.
   */
  const unconfirmedDangerAlerts = useMemo(() => alertsMemo.filter(
    alertSelected => !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger
  ), [alertsMemo, isAlertConfirmed]);

  /**
   * Danger alerts.
   */
  const dangerAlerts = useMemo(() => alertsMemo.filter(
    alertSelected => alertSelected.severity === Severity.Danger
  ), [alertsMemo]);

  /**
   * Unconfirmed field danger alerts.
   */
  const unconfirmedFieldDangerAlerts = useMemo(() => fieldAlerts.filter(
    alertSelected => !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger
  ), [fieldAlerts, isAlertConfirmed]);

  return {
    alerts: alertsMemo,
    alertKey,
    dangerAlerts,
    fieldAlerts,
    generalAlerts,
    hasAlerts: alertsMemo.length > 0,
    hasDangerAlerts: dangerAlerts.length > 0,
    hasUnconfirmedDangerAlerts: unconfirmedDangerAlerts.length > 0,
    hasUnconfirmedFieldDangerAlerts: unconfirmedFieldDangerAlerts.length > 0,
    isAlertConfirmed,
    setAlertConfirmed,
    setAlertKey: (key: string) => setAlertKey(key),
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  };
};

/**
 * Sorts alerts by severity.
 * @param alerts - Array of alerts to sort.
 * @returns Sorted array of alerts.
 */
function sortAlertsBySeverity(alerts: Alert[]): Alert[] {
  const severityOrder = {
    [Severity.Danger]: 3,
    [Severity.Warning]: 2,
    [Severity.Info]: 1,
  };
  return alerts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
}
