import { useCallback, useState, useMemo } from 'react';
import { Alert, Severity } from '../Views/confirmations/types/alerts';

/**
 * Custom hook to manage alert confirmation.
 * @param alerts - Array of alerts to manage.
 * @returns An object containing various alert confirmation-related states and functions.
 */
export const useAlertsConfirmed = (alerts: Alert[]) => {
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
   * Unconfirmed danger alerts.
   */
  const unconfirmedDangerAlerts = useMemo(() => alerts.filter(
    alertSelected => !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger
  ), [alerts, isAlertConfirmed]);

  /**
   * Unconfirmed field danger alerts.
   */
  const unconfirmedFieldDangerAlerts = useMemo(() => alerts.filter(
    alertSelected => !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger && alertSelected.field !== undefined
  ), [alerts, isAlertConfirmed]);

  return {
    alertKey,
    isAlertConfirmed,
    setAlertConfirmed,
    setAlertKey: (key: string) => setAlertKey(key),
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
    hasUnconfirmedDangerAlerts: unconfirmedDangerAlerts.length > 0,
    hasUnconfirmedFieldDangerAlerts: unconfirmedFieldDangerAlerts.length > 0,
  };
};
