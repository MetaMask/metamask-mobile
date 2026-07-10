import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import React from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ButtonIconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { BatchSellNetworkFeeInfoModalSelectorsIDs } from './BatchSellNetworkFeeInfoModal.testIds';
import { BatchSellNetworkFeeInfoModalParams } from './BatchSellNetworkFeeInfoModal.types';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

export function BatchSellNetworkFeeInfoModal() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { sourceModal } = useParams<BatchSellNetworkFeeInfoModalParams>();
  const handleBack = sourceModal
    ? () => navigation.replace(sourceModal.screen, sourceModal.params)
    : undefined;
  const surfaceClass = useElevatedSurface();

  return (
    <BottomSheet
      testID={BatchSellNetworkFeeInfoModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
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
      </BottomSheetHeader>
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
