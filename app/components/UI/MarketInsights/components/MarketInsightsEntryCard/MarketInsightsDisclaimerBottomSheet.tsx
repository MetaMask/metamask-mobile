import React, { useCallback, useRef } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';

interface MarketInsightsDisclaimerBottomSheetProps {
  onClose: () => void;
}

const MarketInsightsDisclaimerBottomSheet: React.FC<
  MarketInsightsDisclaimerBottomSheetProps
> = ({ onClose }) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
          {strings('market_insights.disclaimer_modal.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('market_insights.disclaimer_modal.body')}
        </Text>
      </Box>

      <Box twClassName="px-4 pb-6 mt-4">
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
  );
};

export default MarketInsightsDisclaimerBottomSheet;
