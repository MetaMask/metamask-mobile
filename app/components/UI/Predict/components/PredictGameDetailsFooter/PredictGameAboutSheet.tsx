import React, { forwardRef, useCallback } from 'react';
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
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import { POLYMARKET_TERMS_URL } from '../../providers/polymarket/constants';
import { PredictGameAboutSheetProps } from './PredictGameDetailsFooter.types';

const PredictGameAboutSheet = forwardRef<
  BottomSheetRef,
  PredictGameAboutSheetProps
>(({ description, onClose }, ref) => {
  const handleTermsPress = useCallback(async () => {
    try {
      await Linking.openURL(POLYMARKET_TERMS_URL);
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        message: 'Failed to open Polymarket terms URL',
        feature: 'predict',
        operation: 'openTermsUrl',
      });
    }
  }, []);

  const handleClose = () => {
    onClose?.();
  };

  return (
    <BottomSheet ref={ref} onClose={handleClose} shouldNavigateBack={false}>
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
