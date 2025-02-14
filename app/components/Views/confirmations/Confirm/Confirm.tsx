import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import { Footer } from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import styleSheet from './Confirm.styles';

const ConfirmWrapped = ({
  styles,
  testID,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  testID?: string;
}) => (
  <QRHardwareContextProvider>
    <Title />
    <ScrollView style={styles.scrollView} testID={testID}>
      {/* TODO: component SignatureBlockaidBanner to be removed once we implement alert system in mobile */}
      <SignatureBlockaidBanner />
      <Info />
    </ScrollView>
    <Footer />
  </QRHardwareContextProvider>
);

export const Confirm = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  const { styles } = useStyles(styleSheet, { isFlatConfirmation });

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped styles={styles} />
      </View>
    );
  }

  return (
    <BottomSheet
      isInteractable={false}
      stylesDialogSheet={styles.bottomSheetDialogSheet}
      testID="modal-confirmation-container"
    >
      <ConfirmWrapped styles={styles} testID={approvalRequest?.type} />
    </BottomSheet>
  );
};
