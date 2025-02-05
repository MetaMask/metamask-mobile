import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TransactionType } from '@metamask/transaction-controller';

import { useStyles } from '../../../../component-library/hooks';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';

import BottomModal from '../components/UI/BottomModal';
import AccountNetworkInfo from '../components/Confirm/AccountNetworkInfo';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';

import styleSheet from './Confirm.styles';

const FLAT_CONFIRMATIONS: TransactionType[] = [
  // To be filled with flat confirmations
];

const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const isFlatConfirmation = FLAT_CONFIRMATIONS.includes(
    approvalRequest?.type as TransactionType,
  );
  const ContentDisplay = isFlatConfirmation ? ScrollView : View;

  return (
    <>
      <ContentDisplay>
        <Title />
        <SignatureBlockaidBanner />
        <AccountNetworkInfo />
        <Info />
      </ContentDisplay>
      <Footer />
    </>
  );
};

const ConfirmationLayout = () => {
  const { approvalRequest } = useApprovalRequest();
  const isFlatConfirmation = FLAT_CONFIRMATIONS.includes(
    approvalRequest?.type as TransactionType,
  );
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <Confirm />
      </SafeAreaView>
    );
  }

  return (
    <BottomModal canCloseOnBackdropClick={false}>
      <View style={styles.container}>
        <Confirm />
      </View>
    </BottomModal>
  );
};

export default ConfirmationLayout;
