import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import {
  getRecurringOrderSwapCounts,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_SECONDARY,
  MOCK_RECURRING_OPEN_ORDER_TERTIARY,
} from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.mock';
import { RecurringOrderDetailsViewSelectorsIDs } from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.testIds';
import type {
  OnRecurringOrderPress,
  RecurringOrder,
} from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.types';

export const MOCK_RECURRING_OPEN_ORDERS = [
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_SECONDARY,
  MOCK_RECURRING_OPEN_ORDER_TERTIARY,
];

function renderRecurringOpenOrder(
  order: RecurringOrder,
  onOrderPress: OnRecurringOrderPress,
) {
  const { filledPercent, totalSwapCount } = getRecurringOrderSwapCounts(order);

  return (
    <OpenOrderRow
      token={order.destinationToken}
      title={strings('bridge.recurring.pair', {
        source: order.sourceToken.symbol,
        dest: order.destinationToken.symbol,
      })}
      subtitle={strings('bridge.recurring.schedule_summary', {
        interval: order.interval,
        count: totalSwapCount,
      })}
      primaryValue={`+${order.totalReceived}`}
      secondaryValue={strings('bridge.recurring.percent_filled', {
        percent: filledPercent,
      })}
      primaryColor={TextColor.SuccessDefault}
      onPress={() => onOrderPress(order.orderId)}
      testID={RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(
        order.orderId,
      )}
    />
  );
}

export function createRecurringMockOpenOrdersTab(
  onOrderPress: OnRecurringOrderPress,
): OrdersTabConfig<RecurringOrder> {
  return {
    items: MOCK_RECURRING_OPEN_ORDERS,
    renderItem: (order) => renderRecurringOpenOrder(order, onOrderPress),
    keyExtractor: (order) => order.orderId,
    getItemChainId: (order) => order.destinationToken.chainId,
  };
}
