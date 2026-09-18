import React from 'react';
import {
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { RecurringOrder } from '../../../api/recurringOrders.types';
import {
  formatRecurringInterval,
  formatRecurringTokenAmount,
  getRecurringOrderFilledPercent,
  getRecurringOrderTokens,
} from '../../../utils/recurringOrders';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import { RecurringOrderDetailsViewSelectorsIDs } from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.testIds';

function getStatusTag(order: RecurringOrder) {
  if (order.status === 'completed') {
    return (
      <Tag severity={TagSeverity.Neutral}>
        {strings('bridge.recurring.completed')}
      </Tag>
    );
  }

  if (order.status === 'cancelled') {
    return (
      <Tag severity={TagSeverity.Neutral}>
        {strings('bridge.recurring.cancelled')}
      </Tag>
    );
  }

  return undefined;
}

interface RecurringOrderRowProps {
  order: RecurringOrder;
  onPress: (order: RecurringOrder) => void;
}

export function RecurringOrderRow({ order, onPress }: RecurringOrderRowProps) {
  const { sourceToken, destinationToken } = getRecurringOrderTokens(order);
  const interval = formatRecurringInterval(order.schedule);
  const totalReceived = formatRecurringTokenAmount(
    order.destFilled.amount,
    order.dest.asset.decimals,
  );
  const filledPercent = getRecurringOrderFilledPercent(order);
  const isOpen = order.status === 'open';

  return (
    <OpenOrderRow
      token={destinationToken}
      title={strings('bridge.recurring.pair', {
        source: sourceToken.symbol,
        dest: destinationToken.symbol,
      })}
      subtitle={strings('bridge.recurring.schedule_summary', {
        interval,
        count: order.schedule.repeatCount,
      })}
      primaryValue={`+${totalReceived} ${destinationToken.symbol}`}
      secondaryValue={strings('bridge.recurring.percent_filled', {
        percent: filledPercent,
      })}
      primaryColor={TextColor.SuccessDefault}
      titleEndAccessory={getStatusTag(order)}
      onPress={() => onPress(order)}
      testID={
        isOpen
          ? RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(order.orderId)
          : RecurringOrderDetailsViewSelectorsIDs.HISTORY_ORDER_ROW(
              order.orderId,
            )
      }
    />
  );
}

interface CreateRecurringOrdersTabOptions {
  orders: RecurringOrder[];
  onOrderPress: (order: RecurringOrder) => void;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
}

export function createRecurringOrdersTab({
  orders,
  onOrderPress,
  isLoading,
  isError,
  isFetchingNextPage,
  onRetry,
}: CreateRecurringOrdersTabOptions): OrdersTabConfig<RecurringOrder> {
  return {
    items: orders,
    renderItem: (order) => (
      <RecurringOrderRow order={order} onPress={onOrderPress} />
    ),
    keyExtractor: (order) => order.orderId,
    isLoading,
    isError,
    isFetchingNextPage,
    onRetry,
  };
}
