import React, { useCallback, useRef } from 'react';
import { Modal } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetHeaderVariant,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface MarketInsightsDisclaimerBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const MarketInsightsDisclaimerBottomSheet: React.FC<
  MarketInsightsDisclaimerBottomSheetProps
> = ({ isVisible, onClose }) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
    onClose();
  }, [onClose]);

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        onClose={onClose}
        shouldNavigateBack={false}
        goBack={handleClose}
      >
        <BottomSheetHeader
          onClose={handleClose}
          variant={BottomSheetHeaderVariant.Display}
          twClassName="px-6"
        >
          {strings('market_insights.disclaimer_modal.title')}
        </BottomSheetHeader>

        <Box twClassName="px-6 pb-4">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('market_insights.disclaimer_modal.body')}
          </Text>
        </Box>

        <Box twClassName="px-6 pb-6">
          <Button
            size={ButtonSize.Lg}
            onPress={handleClose}
            variant={ButtonVariant.Primary}
            isFullWidth
          >
            {strings('market_insights.disclaimer_modal.got_it')}
          </Button>
        </Box>
      </BottomSheet>
    </Modal>
  );
};

export default MarketInsightsDisclaimerBottomSheet;
