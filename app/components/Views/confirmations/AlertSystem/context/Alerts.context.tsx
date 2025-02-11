import React, { useContext, useMemo, useState } from 'react';
import { Alert } from '../../types/confirm-alerts';
import useConfirmationAlerts from '../../hooks/useConfirmationAlerts';
import { useAlertsManagement } from '../../../../hooks/useAlertsManagement';

export interface AlertsContextParams {
  alertModalVisible: boolean;
  alerts: Alert[];
  alertKey?: string;
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
  setAlertKey: (key: string) => void;
  showAlertModal: () => void;
  unconfirmedDangerAlerts: Alert[];
  unconfirmedFieldDangerAlerts: Alert[];
}

const AlertsContext = React.createContext<AlertsContextParams>({
  alertModalVisible: true,
  alerts: [],
  alertKey: undefined,
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
  setAlertKey: () => undefined,
  showAlertModal: () => undefined,
  unconfirmedDangerAlerts: [],
  unconfirmedFieldDangerAlerts: [],
});

export const AlertsContextProvider: React.FC = ({ children }) => {
  const confirmationAlerts = useConfirmationAlerts();
  const {
    alerts,
    alertKey,
    dangerAlerts,
    fieldAlerts,
    generalAlerts,
    hasAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
    hasUnconfirmedFieldDangerAlerts,
    isAlertConfirmed,
    setAlertConfirmed,
    setAlertKey,
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  } = useAlertsManagement(confirmationAlerts);

  const [alertModalVisible, setAlertModalVisibility] = useState(false);

  const contextValue = useMemo(() => ({
    alertModalVisible,
    alerts,
    alertKey,
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
    setAlertKey: (key: string) => setAlertKey(key),
    showAlertModal: () => setAlertModalVisibility(true),
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  }), [
    alertModalVisible,
    alerts,
    alertKey,
    dangerAlerts,
    fieldAlerts,
    generalAlerts,
    hasAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
    hasUnconfirmedFieldDangerAlerts,
    isAlertConfirmed,
    setAlertConfirmed,
    setAlertKey,
    unconfirmedDangerAlerts,
    unconfirmedFieldDangerAlerts,
  ]);

  return (
    <AlertsContext.Provider value={contextValue}>
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
