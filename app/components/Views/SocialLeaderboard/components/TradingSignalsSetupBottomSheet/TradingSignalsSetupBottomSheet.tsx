import React, { forwardRef } from 'react';
import { Modal, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  useControllableBottomSheet,
  type ControllableBottomSheetRef,
} from '../hooks/useControllableBottomSheet';
import TradingSignalsSetupContent from './TradingSignalsSetupContent';
import { TradingSignalsSetupBottomSheetSelectorsIDs } from './TradingSignalsSetupBottomSheet.testIds';

export type TradingSignalsSetupBottomSheetRef = ControllableBottomSheetRef;

interface TradingSignalsSetupBottomSheetProps {
  onDismiss?: () => void;
}

const TradingSignalsSetupBottomSheet = forwardRef<
  TradingSignalsSetupBottomSheetRef,
  TradingSignalsSetupBottomSheetProps
>(({ onDismiss }, ref) => {
  const tw = useTailwind();
  const { sheetRef, isVisible, closeSheet, handleSheetClosed } =
    useControllableBottomSheet({ ref, onDismiss });

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <GestureHandlerRootView style={tw.style('flex-1')}>
        <BottomSheet
          ref={sheetRef}
          isInteractable
          onClose={handleSheetClosed}
          testID={TradingSignalsSetupBottomSheetSelectorsIDs.CONTAINER}
        >
          <HeaderStandard
            title={strings('app_settings.notifications_title')}
            onClose={closeSheet}
            closeButtonProps={{
              testID: TradingSignalsSetupBottomSheetSelectorsIDs.CLOSE_BUTTON,
            }}
          />

          <TradingSignalsSetupContent />

          <View style={tw.style('h-4')} />
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
});

export default TradingSignalsSetupBottomSheet;
