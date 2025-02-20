import React from 'react';
import { View } from 'react-native';

import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import { Footer } from '../components/Confirm/Footer';
import Info from '../components/Confirm/Info';
import { ScrollContextProvider } from '../context/ScrollContext';
import SignatureBlockaidBanner from '../components/Confirm/SignatureBlockaidBanner';
import Title from '../components/Confirm/Title';
import { QRHardwareContextProvider } from '../context/QRHardwareContext/QRHardwareContext';
import { useConfirmationRedesignEnabled } from '../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../hooks/useFlatConfirmation';
import styleSheet from './Confirm.styles';

const ConfirmWrapped = () => (
  <QRHardwareContextProvider>
    <Title />
    <ScrollContextProvider>
      {/* TODO: component SignatureBlockaidBanner to be removed once we implement alert system in mobile */}
      <SignatureBlockaidBanner />
      <Info />
    </ScrollContextProvider>
    <Footer />
  </QRHardwareContextProvider>
);

export const Confirm = () => {
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();

  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    return null;
  }

  if (isFlatConfirmation) {
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped />
      </View>
    );
  }

  return (
    <BottomSheet
      isInteractable={false}
      style={styles.bottomSheetDialogSheet}
      testID="modal-confirmation-container"
    >
      <ConfirmWrapped />
    </BottomSheet>
  );
};
