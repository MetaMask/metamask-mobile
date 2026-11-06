import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { PREDICT_MARKET_UNAVAILABLE_TEST_IDS } from './PredictMarketUnavailableModal.testIds';

/**
 * Shown instead of buy, cash out, or claim on a Protocol V2 market while the
 * `predictDisablePolymarketV2Markets` kill switch is on.
 */
const PredictMarketUnavailableModal: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      isInteractable
      testID={PREDICT_MARKET_UNAVAILABLE_TEST_IDS.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PREDICT_MARKET_UNAVAILABLE_TEST_IDS.CLOSE_BUTTON,
        }}
        textProps={{ testID: PREDICT_MARKET_UNAVAILABLE_TEST_IDS.TITLE }}
      >
        {strings('predict.market_unavailable.title')}
      </BottomSheetHeader>
      <Box
        alignItems={BoxAlignItems.Start}
        paddingHorizontal={4}
        paddingBottom={4}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={PREDICT_MARKET_UNAVAILABLE_TEST_IDS.DESCRIPTION}
        >
          {strings('predict.market_unavailable.description')}
        </Text>
      </Box>
      <BottomSheetFooter
        twClassName="px-4"
        primaryButtonProps={{
          children: strings('predict.market_unavailable.button'),
          onPress: handleClose,
          testID: PREDICT_MARKET_UNAVAILABLE_TEST_IDS.GOT_IT_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default PredictMarketUnavailableModal;
