import React, { type ReactNode } from 'react';
import { Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';

/** Native window hosting MMDS BottomSheet; sheet gestures/lifecycle remain owned by MMDS. */
export default function CollectiblesSheetModal({
  children,
  onRequestClose,
}: {
  children: ReactNode;
  onRequestClose: () => void;
}) {
  const tw = useTailwind();
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <ModalSafeAreaProvider>
        <GestureHandlerRootView style={tw.style('flex-1')}>
          {children}
        </GestureHandlerRootView>
      </ModalSafeAreaProvider>
    </Modal>
  );
}
