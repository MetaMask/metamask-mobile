import React from 'react';
import {
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import {
  getRecurringOrderSwapCounts,
  MOCK_RECURRING_COMPLETED_ORDER,
} from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.mock';
import { RecurringOrderDetailsViewSelectorsIDs } from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.testIds';
import type {
  OnRecurringOrderPress,
  RecurringOrder,
} from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.types';

export const MOCK_RECURRING_HISTORY_ORDERS = [MOCK_RECURRING_COMPLETED_ORDER];

function renderRecurringHistoryOrder(
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
      titleEndAccessory={
        <Tag severity={TagSeverity.Neutral}>
          {strings('bridge.recurring.completed')}
        </Tag>
      }
      onPress={() => onOrderPress(order.orderId)}
      testID={RecurringOrderDetailsViewSelectorsIDs.COMPLETED_ORDER_ROW}
    />
  );
}

export function createRecurringMockHistoryTab(
  onOrderPress: OnRecurringOrderPress,
): OrdersTabConfig<RecurringOrder> {
  return {
    items: MOCK_RECURRING_HISTORY_ORDERS,
    renderItem: (order) => renderRecurringHistoryOrder(order, onOrderPress),
    keyExtractor: (order) => order.orderId,
    getItemChainId: (order) => order.destinationToken.chainId,
  };
}
