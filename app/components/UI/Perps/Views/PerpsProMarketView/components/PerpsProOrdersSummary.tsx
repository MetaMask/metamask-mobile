import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProOrdersSummaryProps {
  orderCount: number;
  isFiltered?: boolean;
  onCancelAll?: () => void;
}

/**
 * Aggregate summary for the Pro orders list, hosting Cancel all.
 *
 * Mirrors PerpsProUnrealizedPnl's placement and treatment on the Positions tab
 * so both tabs offer their bulk action in the same spot. Orders have no
 * aggregate P&L to show, so the left side carries the open-order count.
 */
const PerpsProOrdersSummary = ({
  orderCount,
  isFiltered = false,
  onCancelAll,
}: PerpsProOrdersSummaryProps) => (
  <Box twClassName="px-2 py-3">
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="gap-4 rounded-xl bg-muted px-4 py-3"
      testID={PerpsProMarketViewSelectorsIDs.ORDERS_SUMMARY}
    >
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('perps.pro_positions_panel.orders')}
        </Text>
        <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
          {strings('perps.pro_positions_panel.open_orders', {
            count: orderCount,
          })}
        </Text>
      </Box>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        isDanger
        twClassName="self-center border-muted bg-transparent"
        onPress={onCancelAll}
        testID={PerpsProMarketViewSelectorsIDs.ORDERS_CANCEL_ALL}
      >
        {isFiltered
          ? strings('perps.pro_positions_panel.cancel_count', {
              count: orderCount,
            })
          : strings('perps.pro_positions_panel.cancel_all')}
      </Button>
    </Box>
  </Box>
);

export default React.memo(PerpsProOrdersSummary);
