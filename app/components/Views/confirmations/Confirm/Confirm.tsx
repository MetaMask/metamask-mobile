import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionType } from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useTransactionMetadata } from '../hooks/useTransactionMetadata';
import styleSheet from './Confirm.styles';

// todo: if possible derive way to dynamically check if confirmation should be rendered flat
const FLAT_CONFIRMATIONS: (TransactionType | ApprovalType)[] = [
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
  const transactionMetadata = useTransactionMetadata();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  const isFlatConfirmation = FLAT_CONFIRMATIONS.includes(
    // order is important here, as transactionMetadata.type is more specific
    (transactionMetadata?.type || approvalRequest?.type) as
      | TransactionType
      | ApprovalType,
  );

  if (isFlatConfirmation) {
    return (
      <SafeAreaView style={styles.mainContainer} testID="flat-confirmation-container">
        <ConfirmWrapped />
      </SafeAreaView>
    );
  }

  return (
    <BottomModal canCloseOnBackdropClick={false} testID="modal-confirmation-container">
      <View style={styles.container} testID={approvalRequest?.type}>
        <ConfirmWrapped />
      </View>
    </BottomModal>
  );
};

export default Confirm;
