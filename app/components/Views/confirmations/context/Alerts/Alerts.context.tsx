import React, { useContext, useMemo, useState, useCallback } from 'react';
import Alert from '../../types/confirm';
import useBlockaidAlert from '../../hooks/useBlockaidAlert';
import useGasFeeAlert from '../../hooks/useGasFeeAlert';
import useOriginAlert from '../../hooks/useOriginAlert';

interface AlertsContextParams {
  alerts: Alert[];
  generalAlerts: Alert[];
  alertModalVisible: boolean;
  showAlertModal: () => void;
  hideAlertModal: () => void;
  setAlertConfirmed: (key: string, confirmed: boolean) => void;
  isAlertConfirmed: (key: string) => boolean;
}

const AlertsContext = React.createContext<AlertsContextParams>({
  alerts: [],
  generalAlerts: [],
  alertModalVisible: true,
  showAlertModal: () => undefined,
  hideAlertModal: () => undefined,
  setAlertConfirmed: () => undefined,
  isAlertConfirmed: () => false,
});

export const AlertsContextProvider: React.FC = ({ children }) => {
  const originAlerts = useOriginAlert();
  const confirmationAlerts = useMemo(() => [originAlerts].filter((confirmAlert): confirmAlert is Alert => alert !== undefined), [originAlerts]);
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
    return alertsArr.reduce((result: Alert[], val: Alert) => {
      result = [...result, val];
      return result;
    }, []);
  }, [confirmationAlerts]);

  const generalAlerts = useMemo(() => alertsMemo.reduce((result: Alert[], val: Alert) => {
    if (val.field === undefined) {
      result = [...result, val];
    }
    return result;
  }, []), [alertsMemo]);

  return (
    <AlertsContext.Provider
      value={{
        alerts: alertsMemo,
        generalAlerts,
        alertModalVisible,
        showAlertModal: () => setAlertModalVisibility(true),
        hideAlertModal: () => setAlertModalVisibility(false),
        setAlertConfirmed,
        isAlertConfirmed,
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
