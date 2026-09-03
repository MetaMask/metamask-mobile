import type { Order } from '@metamask/perps-controller';
import I18n from '../../../../../locales/i18n';
import { mapPerpsTransaction } from '../../../../util/activity-adapters/adapters/perps-transaction';
import { resolvePerpsTriggerOrderTitle } from '../../ActivityListItemRow/titleLabels';
import { formatOrderLabel } from './orderUtils';
import { transformOrdersToTransactions } from './transactionTransforms';

const MOCK_ORDER: Order = {
  orderId: 'order1',
  symbol: 'BTC',
  side: 'buy',
  orderType: 'limit',
  size: '0.5',
  originalSize: '1',
  filledSize: '0.5',
  remainingSize: '0.5',
  price: '50000',
  status: 'filled',
  timestamp: 1640995200000,
};

const makeOrder = (overrides: Partial<Order>): Order => ({
  ...MOCK_ORDER,
  ...overrides,
});

describe('transformOrdersToTransactions trigger labels', () => {
  // Buy is fixed for TAT-3860 so this matrix isolates trigger type and
  // reduceOnly. Sell direction and Activity kinds are covered separately.
  it.each([
    [
      'Stop Limit',
      'stop_limit',
      'limit',
      false,
      'Stop limit long',
      'Stop limit long',
      'Stop limit long',
      'limitLong',
    ],
    [
      'Stop Limit',
      'stop_limit',
      'limit',
      true,
      'Stop limit close short',
      'Stop limit close short',
      'Stop limit — close short',
      'limitCloseShort',
    ],
    [
      'Stop Market',
      'stop_market',
      'market',
      false,
      'Stop market long',
      'Stop market long',
      'Stop market long',
      'marketLong',
    ],
    [
      'Stop Market',
      'stop_market',
      'market',
      true,
      'Stop market close short',
      'Stop market close short',
      'Stop market — close short',
      'stopMarketCloseShort',
    ],
    [
      'Take Profit Limit',
      'take_profit_limit',
      'limit',
      false,
      'Take limit long',
      'Take limit long',
      'Take limit long',
      'limitLong',
    ],
    [
      'Take Profit Limit',
      'take_profit_limit',
      'limit',
      true,
      'Take limit close short',
      'Take limit close short',
      'Take limit — close short',
      'limitCloseShort',
    ],
    [
      'Take Profit Market',
      'take_profit_market',
      'market',
      false,
      'Take market long',
      'Take market long',
      'Take market long',
      'marketLong',
    ],
    [
      'Take Profit Market',
      'take_profit_market',
      'market',
      true,
      'Take market close short',
      'Take market close short',
      'Take market — close short',
      'marketCloseShort',
    ],
  ] as const)(
    'pins %s (%s/%s) labels and Activity kind with reduceOnly=%s',
    (
      detailedOrderType,
      triggerOrderType,
      orderType,
      reduceOnly,
      liteTitle,
      historyTitle,
      activityTitle,
      activityKind,
    ) => {
      const order = makeOrder({
        detailedOrderType,
        triggerOrderType,
        orderType,
        reduceOnly,
        isTrigger: true,
      });
      const [transaction] = transformOrdersToTransactions([order]);
      const activityItem = mapPerpsTransaction({
        transaction,
        chainId: 'eip155:42161',
      });

      expect(formatOrderLabel(order)).toBe(liteTitle);
      expect(transaction.title).toBe(historyTitle);
      expect(activityItem?.type).toBe(activityKind);
      expect(activityItem?.data.perpsTriggerOrderType).toBe(triggerOrderType);
      expect(
        resolvePerpsTriggerOrderTitle(activityKind, triggerOrderType),
      ).toBe(activityTitle);
    },
  );

  it.each([
    [
      'Stop Market',
      'stop_market',
      'market',
      false,
      'ストップマーケット ロング',
      'ストップマーケット ロング',
      'ストップマーケット ロング',
      'marketLong',
    ],
    [
      'Take Profit Limit',
      'take_profit_limit',
      'limit',
      true,
      'テイクリミット ショートをクローズ',
      'テイクリミット ショートをクローズ',
      'テイクリミット — ショートをクローズ',
      'limitCloseShort',
    ],
  ] as const)(
    'localizes an opening and closing %s across trigger surfaces',
    (
      detailedOrderType,
      triggerOrderType,
      orderType,
      reduceOnly,
      liteTitle,
      historyTitle,
      activityTitle,
      activityKind,
    ) => {
      const originalLocale = I18n.locale;
      I18n.locale = 'ja';

      try {
        const order = makeOrder({
          detailedOrderType,
          triggerOrderType,
          orderType,
          reduceOnly,
          isTrigger: true,
        });
        const [transaction] = transformOrdersToTransactions([order]);
        const activityItem = mapPerpsTransaction({
          transaction,
          chainId: 'eip155:42161',
        });

        expect(formatOrderLabel(order)).toBe(liteTitle);
        expect(transaction.title).toBe(historyTitle);
        expect(activityItem?.type).toBe(activityKind);
        expect(activityItem?.data.perpsTriggerOrderType).toBe(triggerOrderType);
        expect(
          resolvePerpsTriggerOrderTitle(activityKind, triggerOrderType),
        ).toBe(activityTitle);
      } finally {
        I18n.locale = originalLocale;
      }
    },
  );

  it.each([
    ['Stop Market', 'limit', undefined, 'Stop market close short', 'market'],
    [
      'Take Profit Market',
      'limit',
      undefined,
      'Take market close short',
      'market',
    ],
    ['Stop Limit', 'market', undefined, 'Stop limit close short', 'limit'],
    [
      'Take Profit Limit',
      'limit',
      'take_profit_market',
      'Take market close short',
      'market',
    ],
  ] as const)(
    'resolves %s with raw type %s and normalized type %s as %s (%s)',
    (
      detailedOrderType,
      orderType,
      triggerOrderType,
      expectedTitle,
      expectedExecutionType,
    ) => {
      const [result] = transformOrdersToTransactions([
        makeOrder({
          orderType,
          triggerOrderType,
          isTrigger: true,
          detailedOrderType,
        }),
      ]);

      expect(result.title).toBe(expectedTitle);
      expect(result.order?.type).toBe(expectedExecutionType);
    },
  );
});
