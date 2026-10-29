import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import { parseCaipAssetType } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import {
  type RecurringOrder,
  RecurringOrderState,
} from '../../../api/recurringOrders.types';
import {
  formatRecurringInterval,
  formatRecurringTokenAmount,
  getRecurringOrderFilledPercent,
  getRecurringOrderTokens,
} from '../../../utils/recurringOrders';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import { RecurringOrderDetailsViewSelectorsIDs } from '../../RecurringOrderDetailsView/RecurringOrderDetailsView.testIds';

interface RecurringOrderRowProps {
  order: RecurringOrder;
  onPress: (order: RecurringOrder) => void;
}

export function RecurringOrderRow({ order, onPress }: RecurringOrderRowProps) {
  const { sourceToken, destinationToken } = getRecurringOrderTokens(order);
  const interval = formatRecurringInterval(order.schedule);
  const totalReceived = formatRecurringTokenAmount(
    order.fillData.dest.amount,
    order.dest.asset.decimals,
  );
  const filledPercent = getRecurringOrderFilledPercent(order);
  const isOpen = order.state === RecurringOrderState.Open;
  const isClosedUnfilled =
    order.state === RecurringOrderState.Cancelled ||
    order.state === RecurringOrderState.Expired;

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
      titleColor={
        isClosedUnfilled ? TextColor.TextAlternative : TextColor.TextDefault
      }
      primaryColor={
        isClosedUnfilled ? TextColor.TextAlternative : TextColor.SuccessDefault
      }
      onPress={() => onPress(order)}
      testID={
        isOpen
          ? RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(order.id)
          : RecurringOrderDetailsViewSelectorsIDs.HISTORY_ORDER_ROW(order.id)
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

const getRecurringOrderChainId = (order: RecurringOrder) =>
  parseCaipAssetType(order.src.asset.assetId).chainId;

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
    keyExtractor: (order) => order.id,
    getItemChainId: getRecurringOrderChainId,
    isLoading,
    isError,
    isFetchingNextPage,
    onRetry,
  };
}
