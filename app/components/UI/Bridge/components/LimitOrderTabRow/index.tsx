import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  LimitOrderState,
  type LimitOrder,
} from '../../api/limitOrders/getLimitOrders/types';
import OpenOrderRow from '../OpenOrderRow';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { formatLimitOrderAmount } from '../../utils/limitOrders/formatLimitOrderAmount';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';
import {
  formatLimitOrderExpiredDuration,
  formatLimitOrderTimeLeft,
} from '../../utils/limitOrders/formatLimitOrderDuration';

function getLimitOrderRowSlots(
  order: LimitOrder,
  sourceSymbol: string,
  destSymbol: string,
) {
  const stakedAmount = `${formatLimitOrderAmount(
    order.src.amount,
    // src.asset.decimals is looked up by the caller via getLimitOrderTokens,
    // but the raw asset is also available directly on the order.
    order.src.asset.decimals,
  )} ${sourceSymbol}`;
  const limitPriceLabel = strings('bridge.limit.limit_price', {
    symbol: destSymbol,
  });

  switch (order.state) {
    case LimitOrderState.Filled:
      return {
        subtitle: strings('bridge.limit.filled_at', {
          date: formatLimitOrderDate(order.timingData.closedAt),
        }),
        // The orders list only carries the guaranteed minimum, not the amount
        // the fill actually delivered.
        primaryValue: `+${formatLimitOrderAmount(
          order.dest.amount,
          order.dest.asset.decimals,
        )} ${destSymbol}`,
        secondaryValue: `-${formatLimitOrderAmount(
          order.src.amount,
          order.src.asset.decimals,
        )} ${sourceSymbol}`,
        primaryColor: TextColor.SuccessDefault,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Success}>
            {strings('bridge.limit.filled')}
          </Tag>
        ),
      };
    case LimitOrderState.Expired:
      return {
        subtitle: strings('bridge.limit.expired_after', {
          duration: formatLimitOrderExpiredDuration(
            order.timingData.createdAt,
            order.timingData.expiresAt,
          ),
        }),
        primaryValue: stakedAmount,
        secondaryValue: limitPriceLabel,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Neutral}>
            {strings('bridge.limit.expired')}
          </Tag>
        ),
      };
    case LimitOrderState.Cancelled:
      return {
        subtitle: strings('bridge.limit.canceled_at', {
          date: formatLimitOrderDate(order.timingData.closedAt),
        }),
        primaryValue: stakedAmount,
        secondaryValue: limitPriceLabel,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Neutral}>
            {strings('bridge.limit.canceled')}
          </Tag>
        ),
      };
    case LimitOrderState.Failed:
      return {
        subtitle: strings('bridge.limit.failed_at', {
          date: formatLimitOrderDate(order.timingData.closedAt),
        }),
        primaryValue: stakedAmount,
        secondaryValue: limitPriceLabel,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Danger}>
            {strings('bridge.limit.failed')}
          </Tag>
        ),
      };
    case LimitOrderState.Open:
    default:
      return {
        subtitle: strings('bridge.limit.expiry', {
          timeLeft: formatLimitOrderTimeLeft(order.timingData.expiresAt),
        }),
        primaryValue: stakedAmount,
        secondaryValue: limitPriceLabel,
      };
  }
}

interface LimitOrderTabRowProps {
  order: LimitOrder;
}

export function LimitOrderTabRow({ order }: LimitOrderTabRowProps) {
  const navigation = useNavigation<AppNavigationProp>();
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const slots = getLimitOrderRowSlots(
    order,
    sourceToken.symbol,
    destinationToken.symbol,
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.OPEN_LIMIT_ORDER_DETAILS_MODAL,
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
      // Only an order that is still open can be cancelled, which is all the
      // details sheet offers today.
      onPress={order.state === LimitOrderState.Open ? handlePress : undefined}
      {...slots}
    />
  );
}
