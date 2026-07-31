import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';

export interface PerpsProPositionsOptionSheetProps {
  isVisible: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void;
  onOpen?: () => void;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Shared modal bottom sheet shell for Pro positions filter/sort controls.
 */
const PerpsProPositionsOptionSheet = ({
  isVisible,
  title,
  onClose,
  onApply,
  onOpen,
  testID = 'perps-pro-positions-option-sheet',
  children,
}: PerpsProPositionsOptionSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    const justOpened = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;

    if (!justOpened) {
      return;
    }

    onOpen?.();
    sheetRef.current?.onOpenBottomSheet();
  }, [isVisible, onOpen]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleApply = useCallback(() => {
    onApply();
    handleClose();
  }, [handleClose, onApply]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.apply'),
      onPress: handleApply,
      testID: `${testID}-apply`,
    }),
    [handleApply, testID],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <View>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
          <BottomSheetHeader
            onClose={handleClose}
            closeButtonProps={{ testID: `${testID}-close` }}
          >
            {title}
          </BottomSheetHeader>

          {children}

          <BottomSheetFooter
            primaryButtonProps={primaryButtonProps}
            twClassName="pt-4"
          />
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default PerpsProPositionsOptionSheet;
