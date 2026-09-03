import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProOrdersSummaryProps {
  orderCount: number;
  onCancelAll?: () => void;
}

/**
 * Aggregate summary for the Pro orders list, hosting Cancel all.
 *
 * The count reflects the orders currently listed, so it already narrows when a
 * filter is applied — the button label stays `Cancel all` in both states and
 * the scope is read from this count rather than repeated in the label.
 */
const PerpsProOrdersSummary = ({
  orderCount,
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
        onPress={onCancelAll}
        testID={PerpsProMarketViewSelectorsIDs.ORDERS_CANCEL_ALL}
      >
        {strings('perps.pro_positions_panel.cancel_all')}
      </Button>
    </Box>
  </Box>
);

export default React.memo(PerpsProOrdersSummary);
