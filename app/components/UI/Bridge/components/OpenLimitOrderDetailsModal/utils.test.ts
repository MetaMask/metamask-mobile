import { strings } from '../../../../../../locales/i18n';
import type { LimitOrderAsset } from '../../api/limitOrders/create/schema';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import { LimitOrderPriceComparisonDirection } from '../../constants/limitOrders';
import { formatLimitOrderFiatValue } from '../../utils/limitOrders/formatLimitOrderFiatValue';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { getTriggerPrice, getUsdTriggerPrice } from './utils';

const ETH = MOCK_LIMIT_OPEN_ORDER.src.asset;
const USDC = MOCK_LIMIT_OPEN_ORDER.dest.asset;

const LINK: LimitOrderAsset = {
  assetId: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca',
  symbol: 'LINK',
  decimals: 18,
  chainId: 1,
};

const USDT: LimitOrderAsset = {
  assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  decimals: 6,
  chainId: 1,
};

const BNB: LimitOrderAsset = {
  assetId: 'eip155:56/slip44:714',
  symbol: 'BNB',
  decimals: 18,
  chainId: 56,
};

const BSC_USDT: LimitOrderAsset = {
  assetId: 'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
  decimals: 18,
  chainId: 56,
};

function createOrder({
  srcAsset,
  srcAmount,
  destAsset,
  destAmount,
  kind,
  price,
  threshold = 'above',
}: {
  srcAsset: LimitOrderAsset;
  srcAmount: string;
  destAsset: LimitOrderAsset;
  destAmount: string;
  kind: LimitOrder['trigger']['kind'];
  price: string;
  threshold?: LimitOrder['trigger']['threshold'];
}): LimitOrder {
  return {
    ...MOCK_LIMIT_OPEN_ORDER,
    src: { asset: srcAsset, amount: srcAmount },
    dest: { asset: destAsset, amount: destAmount, minAmount: destAmount },
    trigger: { kind, threshold, price },
  };
}

function quote(amount: string, symbol: string): string {
  return strings('bridge.limit.quote_unit', { amount, symbol });
}

describe('getTriggerPrice', () => {
  describe('fiat price', () => {
    it('shows a source price in USD against the source token', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '220000000',
        kind: 'src_price',
        price: '2200.5',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: formatLimitOrderFiatValue('2200.5', 'usd'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('shows a destination price in USD against the destination token', () => {
      const order = createOrder({
        srcAsset: USDT,
        srcAmount: '2001300',
        destAsset: LINK,
        destAmount: '175980000000000000',
        kind: 'dest_price',
        price: '11.382233',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: formatLimitOrderFiatValue('11.382233', 'usd'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('condenses the leading zeros of a sub-cent price instead of showing <$0.01', () => {
      const order = createOrder({
        srcAsset: USDC,
        srcAmount: '1000000',
        destAsset: LINK,
        destAmount: '237000000000000000000000',
        kind: 'dest_price',
        price: '0.0000042123456',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result.triggerPrice).toBe('$0.0₅4212');
    });

    it('condenses the leading zeros of a sub-cent price in the display currency', () => {
      const order = createOrder({
        srcAsset: USDC,
        srcAmount: '1000000',
        destAsset: LINK,
        destAmount: '237000000000000000000000',
        kind: 'dest_price',
        price: '0.0000044',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(
        order,
        sourceToken,
        destinationToken,
        'EUR',
        1.1,
      );

      expect(result.triggerPrice).toBe('€0.0₅4');
    });

    it('converts a fiat price into the display currency', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '220000000',
        kind: 'src_price',
        price: '2200',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(
        order,
        sourceToken,
        destinationToken,
        'EUR',
        1.1,
      );

      expect(result).toStrictEqual({
        triggerPrice: formatLimitOrderFiatValue(2000, 'EUR'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('shows a fiat price in USD when the display currency has no USD rate', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '220000000',
        kind: 'src_price',
        price: '2160',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(
        order,
        sourceToken,
        destinationToken,
        'eur',
      );

      expect(result.triggerPrice).toBe(
        formatLimitOrderFiatValue('2160', 'usd'),
      );
    });

    it('shows a fiat price in USD when the currency code is USD', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '220000000',
        kind: 'src_price',
        price: '2160',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(
        order,
        sourceToken,
        destinationToken,
        'USD',
        1.1,
      );

      expect(result.triggerPrice).toBe(
        formatLimitOrderFiatValue('2160', 'usd'),
      );
    });

    it('shows a fiat price in USD when the converted price is zero', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '0',
        kind: 'dest_price',
        price: '0',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(
        order,
        sourceToken,
        destinationToken,
        'eur',
        1.1,
      );

      expect(result).toStrictEqual({
        triggerPrice: formatLimitOrderFiatValue('0', 'usd'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('shows a fiat price in USD when the USD rate is zero', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '220000000',
        kind: 'src_price',
        price: '100',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(
        order,
        sourceToken,
        destinationToken,
        'eur',
        0,
      );

      expect(result.triggerPrice).toBe(formatLimitOrderFiatValue('100', 'usd'));
    });
  });

  describe('ratio price', () => {
    it('quotes a sell at the reported price when it reads per source token', () => {
      const order = MOCK_LIMIT_OPEN_ORDER;
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('2200', 'USDC'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('quotes a sub-parity sell at the reported price', () => {
      const order = createOrder({
        srcAsset: BNB,
        srcAmount: '1000000000000000000',
        destAsset: BSC_USDT,
        destAmount: '500000000000000000',
        kind: 'ratio',
        price: '0.5',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('0.5', 'USDT'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('condenses the leading zeros of a tiny ratio price', () => {
      const order = createOrder({
        srcAsset: BNB,
        srcAmount: '1000000000000000000',
        destAsset: BSC_USDT,
        destAmount: '1746970000',
        kind: 'ratio',
        price: '0.00000000174697',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result.triggerPrice).toBe(quote('0.0₈1746', 'USDT'));
    });

    it('quotes a buy at the reported price when it reads per destination token', () => {
      const order = createOrder({
        srcAsset: USDT,
        srcAmount: '2000190',
        destAsset: LINK,
        destAmount: '175980000000000000',
        kind: 'ratio',
        price: '11.36567',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('11.36567', 'USDT'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('quotes a sell at the entered price when the API reports the reciprocal', () => {
      const order = createOrder({
        srcAsset: BNB,
        srcAmount: '100000000000000000',
        destAsset: BSC_USDT,
        destAmount: '81750176200000000000',
        kind: 'ratio',
        price: '0.00122323895370393098',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('817.501762', 'USDT'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('quotes a sell at the exact reciprocal of the reported price', () => {
      const order = createOrder({
        srcAsset: BNB,
        srcAmount: '100000000000000000',
        destAsset: BSC_USDT,
        destAmount: '250000000000000000000',
        kind: 'ratio',
        price: '0.0004',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('2500', 'USDT'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('quotes a one-digit sell price at a one-digit reciprocal', () => {
      const order = createOrder({
        srcAsset: BNB,
        srcAmount: '1000000000000000000',
        destAsset: BSC_USDT,
        destAmount: '1000000000000000000',
        kind: 'ratio',
        price: '3',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('0.3', 'USDT'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('quotes a buy at the reciprocal when the reported price reads per source token', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '1000000000000000000',
        destAsset: LINK,
        destAmount: '2000000000000000000',
        kind: 'ratio',
        price: '2',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('0.5', 'ETH'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('quotes a sub-parity buy at the reciprocal of the reported price', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '2000000000000000000',
        destAsset: LINK,
        destAmount: '1000000000000000000',
        kind: 'ratio',
        price: '0.5',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('2', 'ETH'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('quotes a parity sell as one of the counter token', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '1000000000000000000',
        destAsset: USDC,
        destAmount: '1000000',
        kind: 'ratio',
        price: '1',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('1', 'USDC'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('quotes a parity buy as one of the counter token', () => {
      const order = createOrder({
        srcAsset: USDT,
        srcAmount: '1000000',
        destAsset: LINK,
        destAmount: '1000000000000000000',
        kind: 'ratio',
        price: '1',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('1', 'USDT'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('inverts a sell whose destination amount is zero', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '1000000000000000000',
        destAsset: USDC,
        destAmount: '0',
        kind: 'ratio',
        price: '4',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('0.25', 'USDC'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('quotes a zero ratio as reported on a buy', () => {
      const order = createOrder({
        srcAsset: USDT,
        srcAmount: '2000000',
        destAsset: LINK,
        destAmount: '1000000000000000000',
        kind: 'ratio',
        price: '0',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('0', 'USDT'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('quotes a ratio as reported when the source amount is zero on a buy', () => {
      const order = createOrder({
        srcAsset: USDT,
        srcAmount: '0',
        destAsset: LINK,
        destAmount: '1000000000000000000',
        kind: 'ratio',
        price: '11',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('11', 'USDT'),
        triggerToken: destinationToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });
  });

  describe('trigger direction', () => {
    it('reads a below threshold as at or below', () => {
      const order = createOrder({
        srcAsset: USDT,
        srcAmount: '2001300',
        destAsset: LINK,
        destAmount: '175980000000000000',
        kind: 'dest_price',
        price: '11.382233',
        threshold: 'below',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result.triggerDirection).toBe(
        LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      );
    });

    it('reads a below threshold as at or above when the ratio shown is the reciprocal of the reported one', () => {
      // Selling BNB at or above 817.501762 USDT per BNB, which the API reports
      // as at or below 1 / 817.501762 BNB per USDT.
      const order = createOrder({
        srcAsset: BNB,
        srcAmount: '100000000000000000',
        destAsset: BSC_USDT,
        destAmount: '81750176200000000000',
        kind: 'ratio',
        price: '0.00122323895370393098',
        threshold: 'below',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('817.501762', 'USDT'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
      });
    });

    it('keeps a below threshold as at or below on a parity sell', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '1000000000000000000',
        destAsset: USDC,
        destAmount: '1000000',
        kind: 'ratio',
        price: '1',
        threshold: 'below',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result).toStrictEqual({
        triggerPrice: quote('1', 'USDC'),
        triggerToken: sourceToken,
        triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
      });
    });

    it('has no direction for a threshold it does not know', () => {
      const order = createOrder({
        srcAsset: ETH,
        srcAmount: '100000000000000000',
        destAsset: USDC,
        destAmount: '220000000',
        kind: 'src_price',
        price: '2200',
        // @ts-expect-error - this is a test
        threshold: 'crosses',
      });
      const { sourceToken, destinationToken } = getLimitOrderTokens(order);

      const result = getTriggerPrice(order, sourceToken, destinationToken);

      expect(result.triggerDirection).toBeUndefined();
    });
  });
});

describe('getUsdTriggerPrice', () => {
  it('shows a fiat trigger in USD', () => {
    const order = createOrder({
      srcAsset: ETH,
      srcAmount: '100000000000000000',
      destAsset: LINK,
      destAmount: '1000000000000000000',
      kind: 'src_price',
      price: '2160',
    });
    const { sourceToken, destinationToken } = getLimitOrderTokens(order);

    const result = getUsdTriggerPrice(order, sourceToken, destinationToken);

    expect(result).toStrictEqual({
      triggerPrice: formatLimitOrderFiatValue('2160', 'usd'),
      triggerToken: sourceToken,
      triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
    });
  });

  it('quotes a ratio trigger in the counter token', () => {
    const order = MOCK_LIMIT_OPEN_ORDER;
    const { sourceToken, destinationToken } = getLimitOrderTokens(order);

    const result = getUsdTriggerPrice(order, sourceToken, destinationToken);

    expect(result).toStrictEqual({
      triggerPrice: quote('2200', 'USDC'),
      triggerToken: sourceToken,
      triggerDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
    });
  });
});
