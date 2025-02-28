import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { LedgerContextProvider } from '../context/LedgerContext';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmActions } from '../hooks/useConfirmActions';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import styleSheet from './Confirm.styles';
import { AlertsContextProvider } from '../AlertSystem/context';
import useConfirmationAlerts from '../hooks/useConfirmationAlerts';
import { Alert } from '../types/alerts';
import GeneralAlertBanner from '../AlertSystem/GeneralAlertBanner';
import MultipleAlertModal from '../AlertSystem/MultipleAlertModal';

const ConfirmWrapped = ({
  styles,
  alerts,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  alerts: Alert[];
}) => (
  <AlertsContextProvider alerts={alerts}>
  <QRHardwareContextProvider>
    <LedgerContextProvider>
      <Title />
      <ScrollView style={styles.scrollable}>
        <TouchableWithoutFeedback>
          <View style={styles.scrollableSection}>
            <GeneralAlertBanner />
            <Info />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      <Footer />
    </LedgerContextProvider>
    <MultipleAlertModal />
  </QRHardwareContextProvider>
  </AlertsContextProvider>
);

export const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { onReject } = useConfirmActions();
  const alerts = useConfirmationAlerts();

  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped styles={styles} alerts={alerts} />
      </View>
    );
  }

  return (
    <BottomModal onClose={onReject} testID="modal-confirmation-container">
      <View style={styles.modalContainer} testID={approvalRequest?.type}>
        <ConfirmWrapped styles={styles} alerts={alerts} />
      </View>
    </BottomModal>
  );
};
