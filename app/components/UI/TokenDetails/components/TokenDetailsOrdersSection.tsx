import React from 'react';
import { Box, SectionHeader } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import type { RecurringOrder } from '../../Bridge/api/recurringOrders.types';
import { RecurringOrderRow } from '../../Bridge/Views/BridgeView/BridgeRecurringBuyView/RecurringOrderRow';

interface TokenDetailsOrdersSectionProps {
  latestRecurringOrder: RecurringOrder;
  onOrdersHeaderPress: () => void;
  onRecurringOrderPress: (recurringOrder: RecurringOrder) => void;
}

export function TokenDetailsOrdersSection({
  latestRecurringOrder,
  onOrdersHeaderPress,
  onRecurringOrderPress,
}: TokenDetailsOrdersSectionProps) {
  return (
    <Box paddingTop={6} testID={TokenOverviewSelectorsIDs.ORDERS_SECTION}>
      <SectionHeader
        title={strings('asset_overview.orders')}
        isInteractive
        onPress={onOrdersHeaderPress}
        twClassName="py-3"
        testID={TokenOverviewSelectorsIDs.ORDERS_HEADER}
      />
      <Box paddingHorizontal={4}>
        <RecurringOrderRow
          order={latestRecurringOrder}
          onPress={onRecurringOrderPress}
        />
      </Box>
    </Box>
  );
}
