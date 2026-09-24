import React from 'react';
import { Box, SectionHeader } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import type { RecurringOrder } from '../../Bridge/api/recurringOrders.types';
import { RecurringOrderRow } from '../../Bridge/Views/BridgeView/BridgeRecurringBuyView/RecurringOrderRow';

interface TokenDetailsOrdersSectionProps {
  recurringOrder: RecurringOrder;
  onOrdersPress: () => void;
  onOrderPress: (recurringOrder: RecurringOrder) => void;
}

export function TokenDetailsOrdersSection({
  recurringOrder,
  onOrdersPress,
  onOrderPress,
}: TokenDetailsOrdersSectionProps) {
  return (
    <Box paddingTop={6} testID={TokenOverviewSelectorsIDs.ORDERS_SECTION}>
      <SectionHeader
        title={strings('asset_overview.orders')}
        isInteractive
        onPress={onOrdersPress}
        twClassName="py-3"
        testID={TokenOverviewSelectorsIDs.ORDERS_HEADER}
      />
      <Box paddingHorizontal={4}>
        <RecurringOrderRow order={recurringOrder} onPress={onOrderPress} />
      </Box>
    </Box>
  );
}
