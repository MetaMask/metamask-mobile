import React from 'react';
import { Box, SectionHeader } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import type { RecurringOrder } from '../../Bridge/api/recurringOrders.types';
import { LimitOrderTabRow } from '../../Bridge/components/LimitOrderTabRow';
import type { MostRecentOrder } from '../../Bridge/hooks/useMostRecentOrder';
import { BridgeTabKey } from '../../Bridge/Views/BridgeView/BridgeView.constants';
import { RecurringOrderRow } from '../../Bridge/Views/BridgeView/BridgeRecurringBuyView/RecurringOrderRow';

interface TokenDetailsOrdersSectionProps {
  mostRecentOrder: MostRecentOrder;
  onOrdersHeaderPress: () => void;
  onRecurringOrderPress: (recurringOrder: RecurringOrder) => void;
}

export function TokenDetailsOrdersSection({
  mostRecentOrder,
  onOrdersHeaderPress,
  onRecurringOrderPress,
}: TokenDetailsOrdersSectionProps) {
  return (
    <Box
      paddingTop={6}
      paddingBottom={6}
      testID={TokenOverviewSelectorsIDs.ORDERS_SECTION}
    >
      <SectionHeader
        title={strings('asset_overview.orders')}
        isInteractive
        onPress={onOrdersHeaderPress}
        twClassName="py-3"
        testID={TokenOverviewSelectorsIDs.ORDERS_HEADER}
      />
      <Box paddingHorizontal={4}>
        {mostRecentOrder.type === BridgeTabKey.Limit ? (
          <LimitOrderTabRow order={mostRecentOrder.order} />
        ) : (
          <RecurringOrderRow
            order={mostRecentOrder.order}
            onPress={onRecurringOrderPress}
          />
        )}
      </Box>
    </Box>
  );
}
