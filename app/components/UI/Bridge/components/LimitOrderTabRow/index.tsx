import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  LimitOrderState,
  type LimitOrder,
} from '../../api/limitOrders/getLimitOrders/types';
import {
  HISTORY_LIMIT_ORDER_STATES,
  OPEN_LIMIT_ORDER_STATES,
} from '../../constants/limitOrders';
import OpenOrderRow from '../OpenOrderRow';
import { getUsdTriggerPrice } from '../OpenLimitOrderDetailsModal/utils';
import type { BridgeToken } from '../../types';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { formatLimitOrderRowAmount } from '../../utils/limitOrders/formatLimitOrderRowAmount';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';
import {
  formatLimitOrderExpiredDuration,
  formatLimitOrderTimeLeft,
} from '../../utils/limitOrders/formatLimitOrderDuration';

function getLimitOrderRowSlots(
  order: LimitOrder,
  sourceToken: BridgeToken,
  destinationToken: BridgeToken,
) {
  const sourceSymbol = sourceToken.symbol;
  const destSymbol = destinationToken.symbol;
  // `src_price` / `dest_price` were placed in fiat (USD). A `ratio` was placed
  // as an amount of the counter token. The row shows that same denomination.
  const { triggerPrice, triggerToken } = getUsdTriggerPrice(
    order,
    sourceToken,
    destinationToken,
  );
  const limitPriceLabel = strings('bridge.limit.limit_price', {
    symbol: triggerToken.symbol,
  });

  switch (order.state) {
    case LimitOrderState.Filled:
      return {
        subtitle: strings('bridge.limit.filled_at', {
          date: formatLimitOrderDate(order.timingData.closedAt),
        }),
        // The orders list only carries the guaranteed minimum, not the amount
        // the fill actually delivered.
        primaryValue: `+${formatLimitOrderRowAmount(
          order.dest.amount,
          order.dest.asset.decimals,
        )} ${destSymbol}`,
        secondaryValue: `-${formatLimitOrderRowAmount(
          order.src.amount,
          order.src.asset.decimals,
        )} ${sourceSymbol}`,
        primaryColor: TextColor.SuccessDefault,
      };
    case LimitOrderState.Expired:
      return {
        subtitle: strings('bridge.limit.expired_after', {
          duration: formatLimitOrderExpiredDuration(
            order.timingData.createdAt,
            order.timingData.expiresAt,
          ),
        }),
        primaryValue: triggerPrice,
        secondaryValue: limitPriceLabel,
        titleColor: TextColor.TextAlternative,
        primaryColor: TextColor.TextAlternative,
      };
    case LimitOrderState.Cancelled:
      return {
        subtitle: strings('bridge.limit.canceled_at', {
          // The API leaves `closedAt` unset on orders it cancels itself, e.g.
          // for insufficient funds at execution.
          date: formatLimitOrderDate(
            order.timingData.closedAt ?? order.timingData.expiresAt,
          ),
        }),
        primaryValue: triggerPrice,
        secondaryValue: limitPriceLabel,
        titleColor: TextColor.TextAlternative,
        primaryColor: TextColor.TextAlternative,
      };
    case LimitOrderState.Failed:
      return {
        subtitle: strings('bridge.limit.failed_at', {
          date: formatLimitOrderDate(order.timingData.closedAt),
        }),
        primaryValue: triggerPrice,
        secondaryValue: limitPriceLabel,
        titleColor: TextColor.ErrorDefault,
        primaryColor: TextColor.TextAlternative,
      };
    case LimitOrderState.Open:
    default:
      return {
        subtitle: strings('bridge.limit.expiry', {
          timeLeft: formatLimitOrderTimeLeft(order.timingData.expiresAt),
        }),
        primaryValue: triggerPrice,
        secondaryValue: limitPriceLabel,
      };
  }
}

/**
 * Every order of the open orders tab opens the details sheet, including one
 * being executed, which the sheet shows without the cancel button since the
 * API no longer reports it as cancellable. A closed order opens its activity
 * page. A state the client doesn't know opens nothing.
 */
function getRowPressHandler(
  order: LimitOrder,
  onOpenOrderPress: () => void,
  onHistoryOrderPress: () => void,
): (() => void) | undefined {
  const state = order.state as LimitOrderState;

  if (OPEN_LIMIT_ORDER_STATES.includes(state)) {
    return onOpenOrderPress;
  }

  return HISTORY_LIMIT_ORDER_STATES.includes(state)
    ? onHistoryOrderPress
    : undefined;
}

interface LimitOrderTabRowProps {
  order: LimitOrder;
}

export function LimitOrderTabRow({ order }: LimitOrderTabRowProps) {
  const navigation = useNavigation<AppNavigationProp>();
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const slots = getLimitOrderRowSlots(order, sourceToken, destinationToken);

  const handleOpenOrderPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.OPEN_LIMIT_ORDER_DETAILS_MODAL,
      params: { order },
    });
  }, [navigation, order]);

  const handleHistoryOrderPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.SWAPS_LIMIT_ORDER_ACTIVITY,
      params: { order },
    });
  }, [navigation, order]);

  return (
    <OpenOrderRow
      token={destinationToken}
      title={strings('bridge.limit.pair', {
        source: sourceToken.symbol,
        dest: destinationToken.symbol,
      })}
      onPress={getRowPressHandler(
        order,
        handleOpenOrderPress,
        handleHistoryOrderPress,
      )}
      {...slots}
    />
  );
}
