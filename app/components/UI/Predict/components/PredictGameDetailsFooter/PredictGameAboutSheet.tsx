import React, { forwardRef } from 'react';
import { Linking, Pressable } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  const tw = useTailwind();

  const handleTermsPress = () => {
    Linking.openURL(POLYMARKET_TERMS_URL);
  };

  return (
    <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
      <SheetHeader title={strings('predict.tabs.about')} />
      <Box twClassName="px-4 pb-6 flex-col gap-4">
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {description}
        </Text>

        <Pressable
          onPress={handleTermsPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            color={TextColor.InfoDefault}
            variant={TextVariant.BodyMd}
            style={tw.style('underline')}
          >
            {strings('predict.game_details_footer.read_terms')}
          </Text>
        </Pressable>
      </Box>
    </BottomSheet>
  );
});

PredictGameAboutSheet.displayName = 'PredictGameAboutSheet';

export default PredictGameAboutSheet;
