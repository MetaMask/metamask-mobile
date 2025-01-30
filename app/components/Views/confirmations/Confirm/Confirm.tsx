import React from 'react';
import { ScrollView } from 'react-native';

import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import AccountNetworkInfo from '../components/Confirm/AccountNetworkInfo';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import styleSheet from './Confirm.styles';

const Confirm = () => {
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  return (
    <BottomSheet 
      isInteractable={false} 
      styleAnimatedView={styles.bottomSheetDialogAnimatedView}
      testID={approvalRequest?.type}
      >
        <Title />
        <ScrollView style={styles.scrollView}>
          {/* TODO: component SignatureBlockaidBanner to be removed once we implement alert system in mobile */}
          <SignatureBlockaidBanner />
          <AccountNetworkInfo />
          <Info />
        </ScrollView>
        <Footer />
    </BottomSheet>
  );
};

export default Confirm;
