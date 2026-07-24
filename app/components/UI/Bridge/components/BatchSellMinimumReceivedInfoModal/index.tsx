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
import { BatchSellMinimumReceivedInfoModalSelectorsIDs } from './BatchSellMinimumReceivedInfoModal.testIds';
import { BatchSellMinimumReceivedInfoModalParams } from './BatchSellMinimumReceivedInfoModal.types';

export function BatchSellMinimumReceivedInfoModal() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { sourceModal } = useParams<BatchSellMinimumReceivedInfoModalParams>();
  const handleBack = sourceModal
    ? () => navigation.replace(sourceModal.screen, sourceModal.params)
    : undefined;
  return (
    <BottomSheet
      testID={BatchSellMinimumReceivedInfoModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeader
        onBack={handleBack}
        backButtonProps={{
          testID: BatchSellMinimumReceivedInfoModalSelectorsIDs.BACK_BUTTON,
        }}
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
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={BatchSellMinimumReceivedInfoModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.minimum_received_tooltip_content')}
        </Text>
      </Box>
    </BottomSheet>
  );
}
