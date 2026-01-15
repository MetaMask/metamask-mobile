import React, { forwardRef } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { PredictGameAboutSheetProps } from './PredictGameDetailsFooter.types';

const POLYMARKET_TERMS_URL = 'https://polymarket.com/tos';

const PredictGameAboutSheet = forwardRef<
  BottomSheetRef,
  PredictGameAboutSheetProps
>(({ description, onClose }, ref) => {
  const handleTermsPress = () => {
    Linking.openURL(POLYMARKET_TERMS_URL);
  };

  return (
    <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
      <SheetHeader title={strings('predict.tabs.about')} />
      <Box twClassName="px-4 pb-4 flex-col gap-2">
        <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
          {description}
        </Text>

        <TextButton onPress={handleTermsPress}>
          {strings('predict.game_details_footer.read_terms')}
        </TextButton>
      </Box>
    </BottomSheet>
  );
});

PredictGameAboutSheet.displayName = 'PredictGameAboutSheet';

export default PredictGameAboutSheet;
