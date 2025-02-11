import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { LedgerContextProvider } from '../context/LedgerContext';
import { QRHardwareContextProvider } from '../context/QRHardwareContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import styleSheet from './Confirm.styles';

const ConfirmWrapped = ({
  styles,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
  <QRHardwareContextProvider>
    <LedgerContextProvider>
      <Title />
      <View style={styles.scrollWrapper}>
        <ScrollView
          style={styles.scrollable}
          contentContainerStyle={styles.scrollableSection}
        >
          <SignatureBlockaidBanner />
          <Info />
        </ScrollView>
      </View>
      <Footer />
    </LedgerContextProvider>
  </QRHardwareContextProvider>
);

export const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  const { styles } = useStyles(styleSheet, { isFlatConfirmation });

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
    <BottomModal
      canCloseOnBackdropClick={false}
      testID="modal-confirmation-container"
    >
      <View style={styles.modalContainer} testID={approvalRequest?.type}>
        <ConfirmWrapped styles={styles} />
      </View>
    </BottomModal>
  );
};
