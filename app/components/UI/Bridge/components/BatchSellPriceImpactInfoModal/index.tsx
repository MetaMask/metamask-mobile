import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
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
import { BatchSellPriceImpactInfoModalSelectorsIDs } from './BatchSellPriceImpactInfoModal.testIds';
import { BatchSellPriceImpactInfoModalParams } from './BatchSellPriceImpactInfoModal.types';

function formatPriceImpact(priceImpact: string) {
  const parsedPriceImpact = Number(priceImpact);

  if (!Number.isFinite(parsedPriceImpact)) return '0%';

  return `${(parsedPriceImpact * 100).toFixed(2)}%`;
}

export function BatchSellPriceImpactInfoModal() {
  const navigation = useNavigation<AppNavigationProp>();
  const { priceImpact } = useParams<BatchSellPriceImpactInfoModalParams>();
  const formattedPriceImpact = formatPriceImpact(priceImpact);

  return (
    <BottomSheet
      testID={BatchSellPriceImpactInfoModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeader
        onClose={navigation.goBack}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellPriceImpactInfoModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_high_price_impact')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={BatchSellPriceImpactInfoModalSelectorsIDs.DESCRIPTION}
        >
          {strings('bridge.batch_sell_high_price_impact_description', {
            priceImpact: formattedPriceImpact,
          })}
        </Text>
      </Box>
    </BottomSheet>
  );
}
