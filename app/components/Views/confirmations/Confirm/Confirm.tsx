import React from 'react';
import { ScrollView, View } from 'react-native';

import { useStyles } from '../../../../component-library/hooks';
import BottomModal from '../components/UI/BottomModal';
import AccountNetworkInfo from '../components/Confirm/AccountNetworkInfo';
import Footer from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
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
    <QRHardwareContextProvider>
      <BottomModal canCloseOnBackdropClick={false}>
        <View style={styles.container} testID={approvalRequest?.type}>
          <View>
            <Title />
            <View style={styles.scrollWrapper}>
              <ScrollView>
                <View style={styles.scrollableSection}>
                  {/* TODO: component SignatureBlockaidBanner to be removed once we implement alert system in mobile */}
                  <SignatureBlockaidBanner />
                  <AccountNetworkInfo />
                  <Info />
                </View>
              </ScrollView>
            </View>
          </View>
          <Footer />
        </View>
      </BottomModal>
    </QRHardwareContextProvider>
  );
};

export default Confirm;
