import React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { LedgerContextProvider } from '../context/LedgerContext';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import { ScrollContextProvider } from '../context/ScrollContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmActions } from '../hooks/useConfirmActions';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import styleSheet from './Confirm.styles';

const ConfirmWrapped = () => (
  <QRHardwareContextProvider>
    <LedgerContextProvider>
      <Title />
      <ScrollContextProvider>
        <SignatureBlockaidBanner />
        <Info />
      </ScrollContextProvider>
      <Footer />
    </LedgerContextProvider>
  </QRHardwareContextProvider>
);

export const Confirm = () => {
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
        <ConfirmWrapped />
      </View>
    );
  }

  return (
    <BottomModal onClose={onReject} testID="modal-confirmation-container">
      <View style={styles.modalContainer} testID={approvalRequest?.type}>
        <ConfirmWrapped />
      </View>
    </BottomModal>
  );
};
