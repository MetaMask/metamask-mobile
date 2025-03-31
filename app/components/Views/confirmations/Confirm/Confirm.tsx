import React from 'react';
import {
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
import GeneralAlertBanner from '../AlertSystem/GeneralAlertBanner';
import { ConfirmAlerts } from '../components/Confirm/ConfirmAlerts';

const ConfirmWrapped = ({
  styles,
  route,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  route?: UnstakeConfirmationViewProps['route'];
}) => (
    <ConfirmAlerts>
      <QRHardwareContextProvider>
        <LedgerContextProvider>
          <Title />
          <ScrollView style={styles.scrollView} nestedScrollEnabled>
            <TouchableWithoutFeedback>
              <>
                <GeneralAlertBanner />
                <Info route={route} />
              </>
            </TouchableWithoutFeedback>
          </ScrollView>
          <Footer />
        </LedgerContextProvider>
      </QRHardwareContextProvider>
    </ConfirmAlerts>
  );

interface ConfirmProps {
  route?: UnstakeConfirmationViewProps['route'];
}

export const Confirm = ({ route }: ConfirmProps) => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { onReject } = useConfirmActions();

  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    );
  }

  return (
    <BottomSheet
      onClose={onReject}
      shouldNavigateBack={false}
      style={styles.bottomSheetDialogSheet}
      testID="modal-confirmation-container"
    >
      <View testID={approvalRequest?.type} style={styles.confirmContainer}>
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    </BottomSheet>
  );
};
