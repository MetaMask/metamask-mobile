import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionType } from '@metamask/transaction-controller';

import { useStyles } from '../../../../component-library/hooks';
import AccountNetworkInfo from '../components/Confirm/AccountNetworkInfo';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';

import styleSheet from './Confirm.styles';

// todo: if possible derive way to dynamically check if confirmation should be rendered flat
// todo: unit test coverage to be added once we have flat confirmations in place
const FLAT_CONFIRMATIONS: TransactionType[] = [
  // To be filled with flat confirmations
];

const ConfirmWrapped = () => (
  <QRHardwareContextProvider>
    <>
      <ScrollView>
        <Title />
        <SignatureBlockaidBanner />
        <AccountNetworkInfo />
        <Info />
      </ScrollView>
      <Footer />
    </>
  </QRHardwareContextProvider>
);

const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  const isFlatConfirmation = FLAT_CONFIRMATIONS.includes(
    approvalRequest?.type as TransactionType,
  );

  if (isFlatConfirmation) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <ConfirmWrapped />
      </SafeAreaView>
    );
  }

  return (
    <BottomModal canCloseOnBackdropClick={false}>
      <View style={styles.container}>
        <ConfirmWrapped />
      </View>
    </BottomModal>
  );
};

export default Confirm;
