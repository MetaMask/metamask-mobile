import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';

import Device from '../../../../util/device';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { useTheme } from '../../../../util/theme';
import { AlertsContextProvider } from '../context/Alerts';
import useApprovalRequest from '../hooks/useApprovalRequest';

import AlertBanner from '../components/Confirm/AlertBanner';
import AlertModal from '../components/Confirm/AlertModal';
import BottomModal from '../components/Confirm/BottomModal';
import Footer from '../components/Confirm//Footer';
import Header from '../components/Confirm//Header';
import Info from '../components/Confirm/Info';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      minHeight: '90%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
    },
  });

const Confirm = () => {
  const { approvalRequest, onReject } = useApprovalRequest();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (
    ![
      ApprovalTypes.ETH_SIGN,
      ApprovalTypes.PERSONAL_SIGN,
      ApprovalTypes.ETH_SIGN_TYPED_DATA,
      ApprovalTypes.TRANSACTION,
    ].includes(approvalRequest?.type as ApprovalTypes) &&
    approvalRequest?.origin !== 'metamask'
  ) {
    return;
  }

  return (
    <AlertsContextProvider>
      <BottomModal onClose={onReject}>
        <View style={styles.container}>
          <AlertBanner />
          <Header />
          <Info />
          <Footer />
          <AlertModal />
        </View>
      </BottomModal>
    </AlertsContextProvider>
  );
};

export default Confirm;
