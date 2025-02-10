import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionType } from '@metamask/transaction-controller';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useTransactionMetadataRequest } from '../hooks/useTransactionMetadataRequest';
import styleSheet from './Confirm.styles';

// todo: if possible derive way to dynamically check if confirmation should be rendered flat
const FLAT_TRANSACTION_CONFIRMATIONS: TransactionType[] = [
  TransactionType.stakingDeposit,
];

const ConfirmWrapped = ({
  styles,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}) => (
  <QRHardwareContextProvider>
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
  </QRHardwareContextProvider>
);

const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  const isFlatConfirmation = FLAT_TRANSACTION_CONFIRMATIONS.includes(
    transactionMetadata?.type as TransactionType,
  );

  const { styles } = useStyles(styleSheet, { isFlatConfirmation });

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <SafeAreaView
        style={styles.flatContainer}
        testID="flat-confirmation-container"
      >
        <ConfirmWrapped styles={styles} />
      </SafeAreaView>
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

export default Confirm;
