import React, { useCallback, useRef } from 'react';
import { Modal } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export interface MfaRecoveryOption<T extends string> {
  id: T;
  labelKey: string;
  isDisabled?: boolean;
}

interface MfaRecoveryOptionsBottomSheetProps<T extends string> {
  testID: string;
  optionTestIdPrefix: string;
  titleKey: string;
  options: readonly MfaRecoveryOption<T>[];
  /** Called with the chosen option; the caller unmounts the sheet. */
  onSelect: (id: T) => void;
  onClose: () => void;
}

const MfaRecoveryOptionsBottomSheet = <T extends string>({
  testID,
  optionTestIdPrefix,
  titleKey,
  options,
  onSelect,
  onClose,
}: MfaRecoveryOptionsBottomSheetProps<T>) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={sheetRef}
        keyboardAvoidingViewEnabled={false}
        onClose={onClose}
        testID={testID}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings(titleKey)}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col gap-2 px-4 pb-4">
          {options.map((option) => (
            <Button
              key={option.id}
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={option.isDisabled}
              onPress={() => onSelect(option.id)}
              testID={`${optionTestIdPrefix}-${option.id}`}
            >
              {strings(option.labelKey)}
            </Button>
          ))}
        </Box>
      </BottomSheet>
    </Modal>
  );
};

export default MfaRecoveryOptionsBottomSheet;
