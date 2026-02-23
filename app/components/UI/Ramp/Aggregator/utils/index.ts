import {
  Order,
  QuoteError,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import {
  AggregatorNetwork,
  CryptoCurrency,
  OrderOrderTypeEnum,
  QuoteSortMetadata,
  SellOrder,
} from '@consensys/on-ramp-sdk/dist/API';
import {
  renderFromTokenMinimalUnit,
  renderNumber,
  toTokenMinimalUnit,
} from '../../../../../util/number';
import { RampType } from '../types';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getDecimalChainId } from '../../../../../util/networks';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import Logger from '../../../../../util/Logger';

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

export const renderDelayToken = (token: TimeDescriptions | string): string => {
  switch (token) {
    case TimeDescriptions.instant:
      return strings('fiat_on_ramp_aggregator.payment_method.instant');
    case TimeDescriptions.less_than:
      return strings('fiat_on_ramp_aggregator.payment_method.less_than');
    case TimeDescriptions.separator:
      return '-';
    case TimeDescriptions.minutes:
      return strings('fiat_on_ramp_aggregator.payment_method.minutes');
    case TimeDescriptions.minute:
      return strings('fiat_on_ramp_aggregator.payment_method.minute');
    case TimeDescriptions.hours:
      return strings('fiat_on_ramp_aggregator.payment_method.hours');
    case TimeDescriptions.hour:
      return strings('fiat_on_ramp_aggregator.payment_method.hour');
    case TimeDescriptions.business_days:
      return strings('fiat_on_ramp_aggregator.payment_method.business_days');
    case TimeDescriptions.business_day:
      return strings('fiat_on_ramp_aggregator.payment_method.business_day');
    default:
      return String(token);
  }
};

export const formatDelayFromArray = (delay: number[]): string =>
  timeToDescription(delay).map(renderDelayToken).join(' ');

export const formatId = (id: string) => {
  if (!id) {
    return id;
  }

  return id.startsWith('/') ? id : '/' + id;
};

export function formatAmount(amount: number, useParts = false) {
  try {
    if (useParts) {
      return getIntlNumberFormatter(I18n.locale)
        .formatToParts(amount)
        .map(({ type, value }) => (type === 'integer' ? value : ''))
        .join(' ');
    }
    return getIntlNumberFormatter(I18n.locale).format(amount);
  } catch (e) {
    return String(amount);
  }
}

export function isNetworkRampSupported(
  chainId: string,
  networks: AggregatorNetwork[],
) {
  return (
    networks?.find((network) => network.chainId === getDecimalChainId(chainId))
      ?.active ?? false
  );
}

export function isNetworkRampNativeTokenSupported(
  chainId: string,
  networks: AggregatorNetwork[],
) {
  const network = networks?.find(
    (_network) => _network.chainId === getDecimalChainId(chainId),
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
export function sortQuotes<
  T extends QuoteResponse | QuoteError | SellQuoteResponse,
>(
  quotes?: T[] | undefined,
  sortingArray?: QuoteSortMetadata[],
  quoteSortBy?: QuoteSortBy,
): T[] | undefined {
  if (!quotes || !sortingArray) {
    return quotes;
  }

  const sortOrder = sortingArray.find((s) => s.sortBy === quoteSortBy)?.ids;

  if (!sortOrder) {
    return quotes;
  }

  const sortOrderMap = new Map(sortOrder.map((id, index) => [id, index]));

  return [...quotes].sort(
    (a, b) =>
      (sortOrderMap.get(a.provider.id) ?? 0) -
      (sortOrderMap.get(b.provider.id) ?? 0),
  );
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

export function getCaipChainIdFromCryptoCurrency(
  cryptoCurrency: CryptoCurrency | null,
): CaipChainId | null {
  if (!cryptoCurrency?.network?.chainId) {
    return null;
  }

  if (isCaipChainId(cryptoCurrency.network.chainId)) {
    return cryptoCurrency.network.chainId;
  }

  try {
    return toEvmCaipChainId(toHex(cryptoCurrency.network.chainId));
  } catch (error) {
    Logger.error(
      new Error(
        `getCaipChainIdFromCryptoCurrency: Invalid chainId format: ${cryptoCurrency.network.chainId}`,
      ),
      {
        context: 'getCaipChainIdFromCryptoCurrency',
        cryptoCurrency,
      },
    );
    return null;
  }
}

export function getHexChainIdFromCryptoCurrency(
  cryptoCurrency: CryptoCurrency | null,
): Hex | undefined {
  if (!cryptoCurrency?.network?.chainId) {
    return;
  }

  let assetDecimalChainId = cryptoCurrency.network.chainId;

  if (isCaipChainId(cryptoCurrency.network.chainId)) {
    const { namespace, reference } = parseCaipChainId(
      cryptoCurrency.network.chainId,
    );

    if (namespace === KnownCaipNamespace.Eip155) {
      assetDecimalChainId = reference;
    }
  }

  try {
    return toHex(assetDecimalChainId);
  } catch (error) {
    Logger.error(
      new Error(
        `getHexChainIdFromCryptoCurrency: Invalid chainId format: ${assetDecimalChainId}`,
      ),
      assetDecimalChainId,
    );
    return;
  }
}
