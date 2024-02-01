import {
  Order,
  QuoteError,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import {
  AggregatorNetwork,
  OrderOrderTypeEnum,
  SellOrder,
} from '@consensys/on-ramp-sdk/dist/API';
import {
  renderFromTokenMinimalUnit,
  renderNumber,
  toTokenMinimalUnit,
} from '../../../../util/number';
import { RampType } from '../types';
import { getOrders, FiatOrder } from '../../../../reducers/fiatOrders';
import { RootState } from '../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import { strings } from '../../../../../locales/i18n';
import { getDecimalChainId } from '../../../../util/networks';

const isOverAnHour = (minutes: number) => minutes > 59;

const isOverADay = (minutes: number) => minutes > 1439;

const toDay = (minutes: number) => Math.round(minutes / 1440);
const toHour = (minutes: number) => Math.round(minutes / 60);

export enum TimeDescriptions {
  instant,
  less_than,
  separator,
  minutes,
  minute,
  hours,
  hour,
  business_days,
  business_day,
}
export const timeToDescription = (timeArr: number[]) => {
  const [lower, upper] = timeArr;
  if (lower === 0 && upper === 0) {
    return [TimeDescriptions.instant];
  }
  if (lower === 0) {
    if (isOverADay(upper)) {
      if (toDay(upper) === 1) {
        return [
          TimeDescriptions.less_than,
          toDay(upper).toString(),
          TimeDescriptions.business_day,
        ];
      }
      return [
        TimeDescriptions.less_than,
        toDay(upper).toString(),
        TimeDescriptions.business_days,
      ];
    } else if (isOverAnHour(upper)) {
      if (toHour(upper) === 1) {
        return [
          TimeDescriptions.less_than,
          toHour(upper).toString(),
          TimeDescriptions.hour,
        ];
      }
      return [
        TimeDescriptions.less_than,
        toHour(upper).toString(),
        TimeDescriptions.hours,
      ];
    }
    if (upper === 1) {
      return [
        TimeDescriptions.less_than,
        upper.toString(),
        TimeDescriptions.minute,
      ];
    }
    return [
      TimeDescriptions.less_than,
      upper.toString(),
      TimeDescriptions.minutes,
    ];
  } else if (isOverADay(lower)) {
    return [
      toDay(lower).toString(),
      TimeDescriptions.separator,
      toDay(upper).toString(),
      TimeDescriptions.business_days,
    ];
  } else if (isOverAnHour(lower)) {
    return [
      toHour(lower).toString(),
      TimeDescriptions.separator,
      toHour(upper).toString(),
      TimeDescriptions.hours,
    ];
  }
  return [
    lower.toString(),
    TimeDescriptions.separator,
    upper.toString(),
    TimeDescriptions.minutes,
  ];
};

export const formatId = (id: string) => {
  if (!id) {
    return id;
  }

  return id.startsWith('/') ? id : '/' + id;
};

export function formatAmount(amount: number) {
  try {
    if (Intl?.NumberFormat) return new Intl.NumberFormat().format(amount);
    return String(amount);
  } catch (e) {
    return String(amount);
  }
}

export function isNetworkRampSupported(
  chainId: string,
  networks: AggregatorNetwork[],
) {
  return (
    networks.find(
      (network) => String(network.chainId) === getDecimalChainId(chainId),
    )?.active ?? false
  );
}

export function isNetworkRampNativeTokenSupported(
  chainId: string,
  networks: AggregatorNetwork[],
) {
  const network = networks.find(
    (_network) => String(_network.chainId) === getDecimalChainId(chainId),
  );
  return (network?.active && network.nativeTokenSupported) ?? false;
}

export function getOrderAmount(order: FiatOrder) {
  let amount = '...';
  if (order.cryptoAmount) {
    const data = order?.data as Order;
    if (data?.cryptoCurrency?.decimals !== undefined && order.cryptocurrency) {
      amount = renderFromTokenMinimalUnit(
        toTokenMinimalUnit(
          order.cryptoAmount,
          data.cryptoCurrency.decimals,
        ).toString(),
        data.cryptoCurrency.decimals,
      );
    } else {
      amount = renderNumber(String(order.cryptoAmount));
    }
  }
  return amount;
}

export function stateHasOrder(state: RootState, order: FiatOrder) {
  const orders = getOrders(state);
  return orders.some((o) => o.id === order.id);
}

export function isBuyQuotes(
  buyOrSellQuotes:
    | (QuoteResponse | QuoteError)[]
    | (QuoteError | SellQuoteResponse)[],
  rampType: RampType,
): buyOrSellQuotes is QuoteResponse[] {
  return rampType === RampType.BUY;
}

export function isSellQuotes(
  buyOrSellQuotes:
    | (QuoteResponse | QuoteError)[]
    | (QuoteError | SellQuoteResponse)[],
  rampType: RampType,
): buyOrSellQuotes is SellQuoteResponse[] {
  return rampType === RampType.SELL;
}

export function isBuyQuote(
  quote: QuoteResponse | SellQuoteResponse,
  rampType: RampType,
): quote is QuoteResponse {
  return rampType === RampType.BUY;
}

export function isSellQuote(
  quote: QuoteResponse | SellQuoteResponse,
  rampType: RampType,
): quote is SellQuoteResponse {
  return rampType === RampType.SELL;
}

export function isSellOrder(order: Order): order is SellOrder {
  return order.orderType === OrderOrderTypeEnum.Sell;
}

export function isSellFiatOrder(order: FiatOrder): order is FiatOrder {
  return order.orderType === OrderOrderTypeEnum.Sell;
}

const NOTIFICATION_DURATION = 5000;

const baseNotificationDetails = {
  duration: NOTIFICATION_DURATION,
};

/**
 * @param {FiatOrder} fiatOrder
 */
export const getNotificationDetails = (fiatOrder: FiatOrder) => {
  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      if (fiatOrder.orderType === OrderOrderTypeEnum.Buy) {
        return {
          ...baseNotificationDetails,
          title: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_failed_title',
            {
              currency: fiatOrder.cryptocurrency,
            },
          ),
          description: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_failed_description',
          ),
          status: 'error',
        };
      }
      return {
        ...baseNotificationDetails,
        title: strings(
          'fiat_on_ramp_aggregator.notifications.sale_failed_title',
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.sale_failed_description',
        ),
        status: 'error',
      };
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      if (fiatOrder.orderType === OrderOrderTypeEnum.Buy) {
        return {
          ...baseNotificationDetails,
          title: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_cancelled_title',
          ),
          description: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_cancelled_description',
          ),
          status: 'cancelled',
        };
      }
      return {
        ...baseNotificationDetails,
        title: strings(
          'fiat_on_ramp_aggregator.notifications.sale_cancelled_title',
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.sale_cancelled_description',
        ),
        status: 'cancelled',
      };
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      if (fiatOrder.orderType === OrderOrderTypeEnum.Buy) {
        return {
          ...baseNotificationDetails,
          title: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_completed_title',
            {
              amount: renderNumber(String(fiatOrder.cryptoAmount)),
              currency: fiatOrder.cryptocurrency,
            },
          ),
          description: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_completed_description',
            {
              currency: fiatOrder.cryptocurrency,
            },
          ),
          status: 'success',
        };
      }
      return {
        ...baseNotificationDetails,
        title: strings(
          'fiat_on_ramp_aggregator.notifications.sale_completed_title',
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.sale_completed_description',
        ),
        status: 'success',
      };
    }
    case FIAT_ORDER_STATES.CREATED: {
      return null;
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      if (fiatOrder.orderType === OrderOrderTypeEnum.Buy) {
        return {
          ...baseNotificationDetails,
          title: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_pending_title',
            {
              currency: fiatOrder.cryptocurrency,
            },
          ),
          description: strings(
            'fiat_on_ramp_aggregator.notifications.purchase_pending_description',
          ),
          status: 'pending',
        };
      }
      return {
        ...baseNotificationDetails,
        title: strings(
          'fiat_on_ramp_aggregator.notifications.sale_pending_title',
          {
            currency: fiatOrder.cryptocurrency,
          },
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.sale_pending_description',
        ),
        status: 'pending',
      };
    }
  }
};
