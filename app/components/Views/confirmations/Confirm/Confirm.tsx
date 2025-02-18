import React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { ScrollContextProvider } from '../context/ScrollContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import { useStandaloneConfirmation } from '../hooks/useStandaloneConfirmation';
import styleSheet from './Confirm.styles';

const ConfirmWrapped = () => (
  <QRHardwareContextProvider>
    <Title />
    <ScrollContextProvider
      scrollableSection={
        <>
          <SignatureBlockaidBanner />
          <Info />
        </>
      }
      staticFooter={<Footer />}
    ></ScrollContextProvider>
  </QRHardwareContextProvider>
);

export const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { isStandaloneConfirmation } = useStandaloneConfirmation();

  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isStandaloneConfirmation) {
    return (
      <View style={styles.standaloneContainer}>
        <ConfirmWrapped />
      </View>
    );
  }

  if (isFlatConfirmation) {
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped />
      </View>
    );
  }

  return (
    <BottomModal
      canCloseOnBackdropClick={false}
      testID="modal-confirmation-container"
    >
      <View style={styles.modalContainer} testID={approvalRequest?.type}>
        <ConfirmWrapped />
      </View>
    </BottomModal>
  );
};
