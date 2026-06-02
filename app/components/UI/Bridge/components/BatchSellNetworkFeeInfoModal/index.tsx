import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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

export function BatchSellNetworkFeeInfoModal() {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const { sourceModal } = useParams<BatchSellNetworkFeeInfoModalParams>();
  const handleBack = sourceModal
    ? () => navigation.replace(sourceModal.screen, sourceModal.params)
    : undefined;

  return (
    <BottomSheet
      testID={BatchSellNetworkFeeInfoModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
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
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={BatchSellNetworkFeeInfoModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.network_fee_info_content')}
        </Text>
      </Box>
    </BottomSheet>
  );
}
