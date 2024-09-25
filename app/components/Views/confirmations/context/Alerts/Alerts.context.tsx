import React, { useContext, useMemo, useState } from 'react';

import Alert from '../../types/confirm';
import useBlockaidAlert from '../../hooks/useBlockaidAlert';
import useGasFeeAlert from '../../hooks/useGasFeeAlert';

interface AlertsContextParams {
  alerts: Alert[];
  alertModalVisible: boolean;
  showAlertModal: () => void;
  hideAlertModal: () => void;
}

const AlertsContext = React.createContext<AlertsContextParams>({
  alerts: [],
  alertModalVisible: true,
  showAlertModal: () => undefined,
  hideAlertModal: () => undefined,
});

export const AlertsContextProvider: React.FC = ({ children }) => {
  const blockaidAlert = useBlockaidAlert();
  const gasFeeAlert = useGasFeeAlert();
  const [alertModalVisible, setAlertModalVisibility] = useState(false);

  const alerts: Alert[] = useMemo(() => {
    const alertsArr = [blockaidAlert, gasFeeAlert];
    return alertsArr.reduce((result: Alert[], val: Alert | undefined) => {
      if (val !== undefined) {
        result = [...result, val];
      }
      return result;
    }, []);
  }, [blockaidAlert, gasFeeAlert]);

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        alertModalVisible,
        showAlertModal: () => setAlertModalVisibility(true),
        hideAlertModal: () => setAlertModalVisibility(false),
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
