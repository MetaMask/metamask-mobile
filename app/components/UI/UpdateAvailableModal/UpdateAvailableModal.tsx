import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';

interface UpdateAvailableModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  isVisible,
  onClose,
}) => {
  const sheetRef = React.useRef<BottomSheetRef>(null);

  // Only render when visible
  if (!isVisible) return null;

  return (
    <BottomSheet ref={sheetRef} onClose={onClose}>
      <Box twClassName="px-4 pb-4">
        <Box twClassName="mb-4">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            twClassName="mb-2"
          >
            Update Available
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            A new version of MetaMask is ready. Tap below to restart the app and
            apply the update.
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Stretch}
          twClassName="gap-3"
        >
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label="Restart App"
            onPress={onClose}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default UpdateAvailableModal;
