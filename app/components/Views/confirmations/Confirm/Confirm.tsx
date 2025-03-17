import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import { UnstakeConfirmationViewProps } from '../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { Footer } from '../components/Confirm/Footer';
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
  route,
  alerts,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  route?: UnstakeConfirmationViewProps['route'];
  alerts: Alert[];
}) => (
  <AlertsContextProvider alerts={alerts}>
  <QRHardwareContextProvider>
    <LedgerContextProvider>
      <Title />
      <ScrollView style={styles.scrollView}>
        <TouchableWithoutFeedback>
          <>
            <GeneralAlertBanner />
            <Info route={route} />
          </>
        </TouchableWithoutFeedback>
      </ScrollView>
      <Footer />
    </LedgerContextProvider>
    <MultipleAlertModal />
  </QRHardwareContextProvider>
  </AlertsContextProvider>
);

interface ConfirmProps {
  route?: UnstakeConfirmationViewProps['route'];
}

export const Confirm = ({ route }: ConfirmProps) => {
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
        <ConfirmWrapped styles={styles} route={route} alerts={alerts} />
      </View>
    );
  }

  return (
    <BottomSheet
      onClose={onReject}
      style={styles.bottomSheetDialogSheet}
      testID="modal-confirmation-container"
    >
      <View testID={approvalRequest?.type} style={styles.confirmContainer}>
        <ConfirmWrapped styles={styles} route={route} alerts={alerts} />
      </View>
    </BottomSheet>
  );
};
