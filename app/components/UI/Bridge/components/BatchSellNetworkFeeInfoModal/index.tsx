import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import React from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  Box,
  ButtonIconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { BatchSellNetworkFeeInfoModalSelectorsIDs } from './BatchSellNetworkFeeInfoModal.testIds';
import { BatchSellNetworkFeeInfoModalParams } from './BatchSellNetworkFeeInfoModal.types';

export function BatchSellNetworkFeeInfoModal() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { sourceModal } = useParams<BatchSellNetworkFeeInfoModalParams>();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const handleBack = sourceModal
    ? () => navigation.replace(sourceModal.screen)
    : undefined;
  return (
    <BottomSheet
      testID={BatchSellNetworkFeeInfoModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onBack={handleBack}
        backButtonProps={{
          testID: BatchSellNetworkFeeInfoModalSelectorsIDs.BACK_BUTTON,
        }}
        onClose={navigation.goBack}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellNetworkFeeInfoModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.network_fee_info_title')}
      </BottomSheetHeaderGlass>
      <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={BatchSellNetworkFeeInfoModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.batch_sell_network_fee_info_content')}
        </Text>
      </Box>
    </BottomSheet>
  );
}
