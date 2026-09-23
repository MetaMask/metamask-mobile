import React from 'react';
import {
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  LimitOrderStatus,
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

  switch (order.status) {
    case LimitOrderStatus.Filled: {
      const receivedAmount = order.dest.amount
        ? formatLimitOrderAmount(order.dest.amount, order.dest.asset.decimals)
        : undefined;

      return {
        subtitle: strings('bridge.limit.filled_at', {
          date: formatLimitOrderDate(order.filledAt),
        }),
        primaryValue: receivedAmount
          ? `+${receivedAmount} ${destSymbol}`
          : '--',
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
    }
    case LimitOrderStatus.Expired:
      return {
        subtitle: strings('bridge.limit.expired_after', {
          duration: formatLimitOrderExpiredDuration(
            order.createdAt,
            order.expiresAt,
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
    case LimitOrderStatus.Cancelled:
      return {
        subtitle: strings('bridge.limit.canceled_at', {
          date: formatLimitOrderDate(order.cancelledAt),
        }),
        primaryValue: stakedAmount,
        secondaryValue: limitPriceLabel,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Neutral}>
            {strings('bridge.limit.canceled')}
          </Tag>
        ),
      };
    case LimitOrderStatus.Failed:
      return {
        subtitle: strings('bridge.limit.failed_at', {
          date: formatLimitOrderDate(order.failedAt),
        }),
        primaryValue: stakedAmount,
        secondaryValue: limitPriceLabel,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Danger}>
            {strings('bridge.limit.failed')}
          </Tag>
        ),
      };
    case LimitOrderStatus.Open:
    default:
      return {
        subtitle: strings('bridge.limit.expiry', {
          timeLeft: formatLimitOrderTimeLeft(order.expiresAt),
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
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const slots = getLimitOrderRowSlots(
    order,
    sourceToken.symbol,
    destinationToken.symbol,
  );

  return (
    <OpenOrderRow
      token={destinationToken}
      title={strings('bridge.limit.pair', {
        source: sourceToken.symbol,
        dest: destinationToken.symbol,
      })}
      {...slots}
    />
  );
}
