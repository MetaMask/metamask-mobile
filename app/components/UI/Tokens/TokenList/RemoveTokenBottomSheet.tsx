import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useRef } from 'react';
import { Modal, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';

interface RemoveTokenBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onRemove: () => void;
}

const RemoveTokenBottomSheet: React.FC<RemoveTokenBottomSheetProps> = ({
  isVisible,
  onClose,
  onRemove,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleSheetClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleRemove = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    onRemove();
  }, [onRemove]);

  if (!isVisible) return null;

  // Either we use a BottomSheet but need to figure out how to lift this up,
  // Or we use the Modal approach, but requires some heavy styling
  return (
    // Render View - Modal to place bottom sheet on top of stack
    <View testID="remove-token-bottom-sheet">
      <Modal visible transparent animationType="none" statusBarTranslucent>
        {/* Bottom Sheet */}
        <BottomSheet
          shouldNavigateBack={false}
          ref={sheetRef}
          onClose={onClose}
        >
          <BottomSheetHeader onClose={handleSheetClose}>
            <Text variant={TextVariant.HeadingMd}>
              {strings('wallet.remove_token_title')}
            </Text>
          </BottomSheetHeader>

          <Box twClassName="pt-4 mx-4 flex gap-4">
            <Button
              onPress={handleRemove}
              isFullWidth
              isDanger
              testID="remove-token-bottom-sheet-remove-button"
            >
              {strings('wallet.remove')}
            </Button>
            <Button
              onPress={handleSheetClose}
              variant={ButtonVariant.Primary}
              isFullWidth
            >
              {strings('wallet.cancel')}
            </Button>
          </Box>
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default RemoveTokenBottomSheet;
