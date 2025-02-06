import React, { useContext, useState } from 'react';
import { Alert } from '../../types/confirm-alerts';
import useConfirmationAlerts from '../../hooks/useConfirmationAlerts';
import { useAlertsManagement } from '../../../../hooks/useAlertsManagement';

export interface AlertsContextParams {
  alertModalVisible: boolean;
  alerts: Alert[];
  dangerAlerts: Alert[];
  fieldAlerts: Alert[];
  generalAlerts: Alert[];
  hasAlerts: boolean;
  hasDangerAlerts: boolean;
  hasUnconfirmedDangerAlerts: boolean;
  hasUnconfirmedFieldDangerAlerts: boolean;
  hideAlertModal: () => void;
  isAlertConfirmed: (key: string) => boolean;
  setAlertConfirmed: (key: string, confirmed: boolean) => void;
  showAlertModal: () => void;
  unconfirmedDangerAlerts: Alert[];
  unconfirmedFieldDangerAlerts: Alert[];
}

const AlertsContext = React.createContext<AlertsContextParams>({
  alertModalVisible: true,
  alerts: [],
  dangerAlerts: [],
  fieldAlerts: [],
  generalAlerts: [],
  hasAlerts: false,
  hasDangerAlerts: false,
  hasUnconfirmedDangerAlerts: false,
  hasUnconfirmedFieldDangerAlerts: false,
  hideAlertModal: () => undefined,
  isAlertConfirmed: () => false,
  setAlertConfirmed: () => undefined,
  showAlertModal: () => undefined,
  unconfirmedDangerAlerts: [],
  unconfirmedFieldDangerAlerts: [],
});

export const AlertsContextProvider: React.FC = ({ children }) => {
  const confirmationAlerts = useConfirmationAlerts();
  const {
    alerts,
    dangerAlerts,
    fieldAlerts,
    generalAlerts,
    hasAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
    hasUnconfirmedFieldDangerAlerts,
    isAlertConfirmed,
    setAlertConfirmed,
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  } = useAlertsManagement(confirmationAlerts);

  const [alertModalVisible, setAlertModalVisibility] = useState(false);

  return (
    <AlertsContext.Provider
      value={{
        alertModalVisible,
        alerts,
        dangerAlerts,
        fieldAlerts,
        generalAlerts,
        hasAlerts,
        hasDangerAlerts,
        hasUnconfirmedDangerAlerts,
        hasUnconfirmedFieldDangerAlerts,
        hideAlertModal: () => setAlertModalVisibility(false),
        isAlertConfirmed,
        setAlertConfirmed,
        showAlertModal: () => setAlertModalVisibility(true),
        unconfirmedDangerAlerts,
        unconfirmedFieldDangerAlerts,
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
