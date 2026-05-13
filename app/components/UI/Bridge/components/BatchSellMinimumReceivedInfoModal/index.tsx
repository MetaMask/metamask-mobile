import { useNavigation } from '@react-navigation/native';
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
import { BatchSellMinimumReceivedInfoModalSelectorsIDs } from './BatchSellMinimumReceivedInfoModal.testIds';

export function BatchSellMinimumReceivedInfoModal() {
  const navigation = useNavigation();

  return (
    <BottomSheet
      testID={BatchSellMinimumReceivedInfoModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeader
        onClose={navigation.goBack}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellMinimumReceivedInfoModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.minimum_received_tooltip_title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={BatchSellMinimumReceivedInfoModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.minimum_received_tooltip_content')}
        </Text>
      </Box>
    </BottomSheet>
  );
}
