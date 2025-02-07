import React from 'react';
import { View, ScrollView } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
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

const ConfirmWrapped = () => (
  <>
    <ScrollView>
      <Title />
      <SignatureBlockaidBanner />
      <Info />
    </ScrollView>
    <Footer />
  </>
);

const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  const isFlatConfirmation = FLAT_TRANSACTION_CONFIRMATIONS.includes(
    transactionMetadata?.type as TransactionType,
  );

  if (isFlatConfirmation) {
    return (
      <View
        style={styles.mainContainer}
        testID="flat-confirmation-container"
      >
        <ConfirmWrapped />
      </View>
    );
  }

  return (
    <BottomModal
      canCloseOnBackdropClick={false}
      testID="modal-confirmation-container"
    >
      <View style={styles.container} testID={approvalRequest?.type}>
        <ConfirmWrapped />
      </View>
    </BottomModal>
  );
};

export default Confirm;
