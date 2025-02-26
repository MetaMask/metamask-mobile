import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import { Footer } from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { LedgerContextProvider } from '../context/LedgerContext';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import useApprovalRequest from '../hooks/useApprovalRequest';
import styleSheet from './Confirm.styles';

const ConfirmWrapped = ({
  styles,
  testID,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  testID?: string;
}) => (
  <QRHardwareContextProvider>
    <LedgerContextProvider>
      <Title />
      <ScrollView style={styles.scrollable}>
        <TouchableWithoutFeedback testID={testID}>
          <View style={styles.scrollableSection}>
            <SignatureBlockaidBanner />
            <Info />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      <Footer />
    </LedgerContextProvider>
  </QRHardwareContextProvider>
);

export const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped styles={styles} />
      </View>
    );
  }

  return (
    <BottomSheet
      isInteractable={false}
      style={styles.bottomSheetDialogSheet}
      testID="modal-confirmation-container"
    >
      <ConfirmWrapped testID={approvalRequest?.type} styles={styles} />
    </BottomSheet>
  );
};
