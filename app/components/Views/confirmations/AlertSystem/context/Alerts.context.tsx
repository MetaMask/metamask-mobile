import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Severity } from '../../types/confirm';
import useConfirmationAlerts from '../../hooks/useConfirmationAlerts';

interface AlertsContextParams {
  alerts: Alert[];
  generalAlerts: Alert[];
  alertModalVisible: boolean;
  fieldAlerts: Alert[];
  hasAlerts: boolean;
  dangerAlerts: Alert[];
  hasDangerAlerts: boolean;
  hasUnconfirmedDangerAlerts: boolean;
  showAlertModal: () => void;
  hideAlertModal: () => void;
  setAlertConfirmed: (key: string, confirmed: boolean) => void;
  isAlertConfirmed: (key: string) => boolean;
  unconfirmedDangerAlerts: Alert[];
  unconfirmedFieldDangerAlerts: Alert[];
  hasUnconfirmedFieldDangerAlerts: boolean;
}

const AlertsContext = React.createContext<AlertsContextParams>({
  alerts: [],
  generalAlerts: [],
  alertModalVisible: true,
  fieldAlerts: [],
  hasAlerts: false,
  dangerAlerts: [],
  hasDangerAlerts: false,
  hasUnconfirmedDangerAlerts: false,
  showAlertModal: () => undefined,
  hideAlertModal: () => undefined,
  setAlertConfirmed: () => undefined,
  isAlertConfirmed: () => false,
  unconfirmedDangerAlerts: [],
  unconfirmedFieldDangerAlerts: [],
  hasUnconfirmedFieldDangerAlerts: false,
});

export const AlertsContextProvider: React.FC = ({ children }) => {
  const confirmationAlerts = useConfirmationAlerts();

  const [alertModalVisible, setAlertModalVisibility] = useState(false);
  const [confirmed, setConfirmed] = useState<{ [key: string]: boolean }>({});

  const setAlertConfirmed = useCallback((key: string, confirm: boolean) => {
    setConfirmed((prevConfirmed) => ({
      ...prevConfirmed,
      [key]: confirm,
    }));
  }, []);

  const isAlertConfirmed = useCallback((key: string) => confirmed[key] ?? false, [confirmed]);

  const alertsMemo = useMemo(() => {
    const alertsArr = confirmationAlerts;
    return sortAlertsBySeverity(alertsArr.reduce((result: Alert[], val: Alert) => {
      result = [...result, val];
      return result;
    }, []));
  }, [confirmationAlerts]);

  const generalAlerts = useMemo(() => alertsMemo.reduce((result: Alert[], val: Alert) => {
    if (val.field === undefined) {
      result = [...result, val];
    }
    return result;
  }, []), [alertsMemo]);

  const fieldAlerts = useMemo(() => alertsMemo.reduce((result: Alert[], val: Alert) => {
      if (val.field !== undefined) {
        result = [...result, val];
      }
      return result;
    }, []), [alertsMemo]);

    const unconfirmedDangerAlerts = alertsMemo.filter(
      (alertSelected) =>
        !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger,
    );

    const hasAlerts = alertsMemo.length > 0;

    const dangerAlerts = alertsMemo.filter(
      (alertSelected) => alertSelected.severity === Severity.Danger,
    );

    const hasUnconfirmedDangerAlerts = unconfirmedDangerAlerts.length > 0;

    const unconfirmedFieldDangerAlerts = fieldAlerts.filter(
      (alertSelected) =>
        !isAlertConfirmed(alertSelected.key) && alertSelected.severity === Severity.Danger,
    );


  return (
    <AlertsContext.Provider
      value={{
        alerts: alertsMemo,
        generalAlerts,
        alertModalVisible,
        fieldAlerts,
        hasAlerts,
        dangerAlerts,
        hasDangerAlerts: dangerAlerts?.length > 0,
        hasUnconfirmedDangerAlerts,
        showAlertModal: () => setAlertModalVisibility(true),
        hideAlertModal: () => setAlertModalVisibility(false),
        setAlertConfirmed,
        isAlertConfirmed,
        unconfirmedDangerAlerts,
        unconfirmedFieldDangerAlerts,
        hasUnconfirmedFieldDangerAlerts: unconfirmedFieldDangerAlerts.length > 0,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsContextProvider');
  }
  return context;
};


function sortAlertsBySeverity(alerts: Alert[]): Alert[] {
    const severityOrder = {
      [Severity.Danger]: 3,
      [Severity.Warning]: 2,
      [Severity.Info]: 1,
    };
    return alerts.sort(
      (a, b) => severityOrder[b.severity] - severityOrder[a.severity],
    );
  }