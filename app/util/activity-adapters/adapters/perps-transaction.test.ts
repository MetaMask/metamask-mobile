import type { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import {
  FillType,
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  type PerpsTransaction,
} from '../../../components/UI/Perps/types/transactionHistory';
// eslint-disable-next-line import-x/no-restricted-paths -- exercise the real perps order transform output
import { transformOrdersToTransactions } from '../../../components/UI/Perps/utils/transactionTransforms';
import { mapPerpsTransaction } from './perps-transaction';

const ARBITRUM: CaipChainId = 'eip155:42161';

/** The real Perps order shape accepted by the transform. */
type Order = Parameters<typeof transformOrdersToTransactions>[0][number];

const base: Pick<
  PerpsTransaction,
  'id' | 'title' | 'subtitle' | 'timestamp' | 'asset' | 'category'
> = {
  id: 'tx-1',
  title: 'ETH-USD',
  subtitle: '2.01 ETH',
  timestamp: 1_700_000_000_000,
  asset: 'ETH',
  category: 'position_open',
};

function fillTx(
  shortTitle: string,
  fillType: FillType,
  amountNumber = 100,
  isPositive = true,
): PerpsTransaction {
  return {
    ...base,
    type: 'trade',
    fill: {
      shortTitle,
      amount: isPositive ? '+$100' : '-$100',
      amountNumber,
      isPositive,
      size: '2.01',
      entryPrice: '$2,000',
      points: '0',
      pnl: '$0',
      fee: '$0.10',
      action: shortTitle,
      feeToken: 'USDC',
      fillType,
    },
  };
}

const fundingTx = (
  isPositive: boolean,
  feeNumber = 1.23,
): PerpsTransaction => ({
  ...base,
  type: 'funding',
  category: 'funding_fee',
  fundingAmount: {
    isPositive,
    fee: `${isPositive ? '+' : '-'}$${feeNumber}`,
    feeNumber,
    rate: '0.0001',
  },
});

const depositTx = (
  status: 'completed' | 'failed' | 'pending' | 'bridging',
): PerpsTransaction => ({
  ...base,
  type: 'deposit',
  category: 'deposit',
  depositWithdrawal: {
    amount: '+$500',
    amountNumber: 500,
    isPositive: true,
    asset: 'USDC',
    txHash: '0xdeadbeef',
    status,
    type: 'deposit',
  },
});

const withdrawalTx: PerpsTransaction = {
  ...base,
  type: 'withdrawal',
  category: 'withdrawal',
  depositWithdrawal: {
    amount: '-$250',
    amountNumber: 250,
    isPositive: false,
    asset: 'USDC',
    txHash: '0xfeedface',
    status: 'completed',
    type: 'withdrawal',
  },
};

const orderTx = (
  order: Partial<NonNullable<PerpsTransaction['order']>> = {},
  overrides: Partial<PerpsTransaction> = {},
): PerpsTransaction => ({
  ...base,
  id: 'order-1',
  title: 'Order',
  type: 'order',
  category: 'limit_order',
  order: {
    text: PerpsOrderTransactionStatus.Filled,
    statusType: PerpsOrderTransactionStatusType.Filled,
    type: 'market',
    size: '10.23',
    limitPrice: '92023',
    filled: '100%',
    side: 'sell',
    reduceOnly: false,
    isTrigger: false,
    ...order,
  },
  ...overrides,
});

// `token` lives only on some ActivityListItem arms, so narrow via `'token' in`
// before reading it (the swap/bridge arms have no `token`).
const tokenOf = (item: ReturnType<typeof mapPerpsTransaction>) =>
  item && 'token' in item.data ? item.data.token : undefined;

describe('mapPerpsTransaction', () => {
  describe('trades', () => {
    it('maps Opened long → perpsOpenLong with fee-cost direction and position leg', () => {
      const transaction = fillTx(
        'Opened long',
        FillType.Standard,
        43.99,
        false,
      );
      const result = mapPerpsTransaction({
        transaction,
        chainId: ARBITRUM,
      });
      expect(result).toEqual({
        type: 'perpsOpenLong',
        chainId: ARBITRUM,
        status: 'success',
        timestamp: base.timestamp,
        hash: 'tx-1',
        raw: { type: 'perpsTransaction', data: transaction },
        data: {
          token: {
            amount: '43.99',
            symbol: 'USD',
            assetId: undefined,
            direction: 'out',
          },
          sourceToken: {
            amount: '2.01',
            symbol: 'ETH',
            direction: 'in',
          },
        },
      });
    });

    it('maps Opened short → perpsOpenShort, sign following the displayed amount', () => {
      const result = mapPerpsTransaction({
        transaction: fillTx('Opened short', FillType.Standard, 100, false),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe('perpsOpenShort');
      expect(tokenOf(result)?.direction).toBe('out');
    });

    it.each([
      [FillType.Standard, 'perpsCloseLong'],
      [FillType.Liquidation, 'perpsCloseLongLiquidated'],
      [FillType.StopLoss, 'perpsCloseLongStopLoss'],
      [FillType.TakeProfit, 'perpsCloseLongTakeProfit'],
    ])('maps Closed long + %s → %s', (fillType, expectedKind) => {
      const result = mapPerpsTransaction({
        transaction: fillTx('Closed long', fillType),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe(expectedKind);
    });

    it.each([
      [FillType.Standard, 'perpsCloseShort'],
      [FillType.Liquidation, 'perpsCloseShortLiquidated'],
      [FillType.StopLoss, 'perpsCloseShortStopLoss'],
      [FillType.TakeProfit, 'perpsCloseShortTakeProfit'],
    ])('maps Closed short + %s → %s', (fillType, expectedKind) => {
      const result = mapPerpsTransaction({
        transaction: fillTx('Closed short', fillType),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe(expectedKind);
    });

    it('maps a losing liquidation close with out-direction (negative PnL)', () => {
      const result = mapPerpsTransaction({
        transaction: fillTx('Closed long', FillType.Liquidation, 300, false),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe('perpsCloseLongLiquidated');
      expect(tokenOf(result)?.direction).toBe('out');
    });

    it('treats AutoDeleveraging as a standard close', () => {
      const result = mapPerpsTransaction({
        transaction: fillTx('Closed long', FillType.AutoDeleveraging),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe('perpsCloseLong');
    });

    it('returns null for unknown fill shortTitle', () => {
      const result = mapPerpsTransaction({
        transaction: fillTx('Whatever', FillType.Standard),
        chainId: ARBITRUM,
      });
      expect(result).toBeNull();
    });
  });

  describe('funding', () => {
    it('maps positive funding → perpsReceivedFundingFees with in-direction', () => {
      const result = mapPerpsTransaction({
        transaction: fundingTx(true, 1.23),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe('perpsReceivedFundingFees');
      expect(tokenOf(result)).toEqual({
        amount: '1.23',
        symbol: 'USD',
        assetId: undefined,
        direction: 'in',
      });
    });

    it('maps negative funding → perpsPaidFundingFees with out-direction', () => {
      const result = mapPerpsTransaction({
        transaction: fundingTx(false, 0.5),
        chainId: ARBITRUM,
      });
      expect(result?.type).toBe('perpsPaidFundingFees');
      expect(tokenOf(result)?.direction).toBe('out');
    });

    it('carries the funding market as the position leg', () => {
      const result = mapPerpsTransaction({
        transaction: fundingTx(true, 1.23),
        chainId: ARBITRUM,
      });
      expect(
        result && 'sourceToken' in result.data
          ? result.data.sourceToken
          : undefined,
      ).toEqual({ symbol: 'ETH', direction: 'in' });
    });
  });

  describe('deposits & withdrawals', () => {
    it.each([
      ['completed', 'success'],
      ['failed', 'failed'],
      ['pending', 'pending'],
      ['bridging', 'pending'],
    ] as const)(
      'maps deposit with status=%s → perpsAddFunds (status=%s)',
      (sourceStatus, expectedStatus) => {
        const result = mapPerpsTransaction({
          transaction: depositTx(sourceStatus),
          chainId: ARBITRUM,
        });
        expect(result?.type).toBe('perpsAddFunds');
        expect(result?.status).toBe(expectedStatus);
        expect(result?.hash).toBe('0xdeadbeef'); // prefers on-chain hash
        expect(tokenOf(result)).toEqual({
          amount: '500',
          symbol: 'USDC',
          assetId: undefined,
          direction: 'in',
        });
      },
    );

    it('maps withdrawal → perpsWithdraw with out-direction USDC', () => {
      const result = mapPerpsTransaction({
        transaction: withdrawalTx,
        chainId: ARBITRUM,
      });
      expect(result).toEqual({
        type: 'perpsWithdraw',
        chainId: ARBITRUM,
        status: 'success',
        timestamp: base.timestamp,
        hash: '0xfeedface',
        raw: { type: 'perpsTransaction', data: withdrawalTx },
        data: {
          token: {
            amount: '250',
            symbol: 'USDC',
            assetId: undefined,
            direction: 'out',
          },
        },
      });
    });

    it('applies the caller-supplied collateral assetId to deposit tokens', () => {
      const result = mapPerpsTransaction({
        transaction: depositTx('completed'),
        chainId: ARBITRUM,
        collateralAssetId: 'eip155:42161/erc20:0xusdc',
      });
      expect(tokenOf(result)?.assetId).toBe('eip155:42161/erc20:0xusdc');
    });

    it('falls back to the source id when depositWithdrawal.txHash is empty', () => {
      const completed = depositTx('completed');
      const dw = completed.depositWithdrawal;
      if (!dw) {
        throw new Error('test fixture missing depositWithdrawal');
      }
      const tx: PerpsTransaction = {
        ...completed,
        depositWithdrawal: { ...dw, txHash: '' },
      };
      const result = mapPerpsTransaction({
        transaction: tx,
        chainId: ARBITRUM,
      });
      expect(result?.hash).toBe('tx-1');
    });
  });

  describe('orders', () => {
    it('maps a filled short market order → marketShort (success + position leg)', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx({ side: 'sell', type: 'market' }),
        chainId: ARBITRUM,
      });

      expect(result?.type).toBe('marketShort');
      expect(result?.status).toBe('success');
      expect(result?.hash).toBe('order-1');
      expect(tokenOf(result)).toEqual({
        amount: '10.23',
        symbol: 'USD',
        assetId: undefined,
        direction: 'out',
      });
    });

    it('maps canceled historical orders as cancelled Activity rows', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx({
          side: 'sell',
          text: PerpsOrderTransactionStatus.Canceled,
          statusType: PerpsOrderTransactionStatusType.Canceled,
        }),
        chainId: ARBITRUM,
      });

      expect(result?.type).toBe('marketShort');
      expect(result?.status).toBe('cancelled');
    });

    it('maps rejected historical orders as failed Activity rows', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx({
          side: 'sell',
          text: PerpsOrderTransactionStatus.Rejected,
          statusType: PerpsOrderTransactionStatusType.Canceled,
        }),
        chainId: ARBITRUM,
      });

      expect(result?.type).toBe('marketShort');
      expect(result?.status).toBe('failed');
    });

    it('returns null for pending/open orders', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx({
          side: 'sell',
          text: PerpsOrderTransactionStatus.Open,
          statusType: PerpsOrderTransactionStatusType.Pending,
        }),
        chainId: ARBITRUM,
      });

      expect(result).toBeNull();
    });

    it('returns null when the order has no structured side (skip, not misclassify)', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx({ side: undefined }),
        chainId: ARBITRUM,
      });

      expect(result).toBeNull();
    });

    it('includes the position size (asset units) in sourceToken for the row subtitle', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx({ side: 'sell' }),
        chainId: ARBITRUM,
      });

      const sourceToken =
        result && 'sourceToken' in result.data
          ? result.data.sourceToken
          : undefined;
      // The asset quantity comes from the perps subtitle ("2.01 ETH").
      expect(sourceToken).toEqual({
        amount: '2.01',
        symbol: 'ETH',
        direction: 'out',
      });
    });

    it('reads the size from the subtitle even when the order has no limit price', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx(
          {
            side: 'sell',
            text: PerpsOrderTransactionStatus.Canceled,
            statusType: PerpsOrderTransactionStatusType.Canceled,
            size: '0',
            limitPrice: '0',
            filled: '0%',
          },
          { id: 'order-no-price', subtitle: '5 BTC', asset: 'BTC' },
        ),
        chainId: ARBITRUM,
      });

      const sourceToken =
        result && 'sourceToken' in result.data
          ? result.data.sourceToken
          : undefined;
      expect(sourceToken).toEqual({
        amount: '5',
        symbol: 'BTC',
        direction: 'out',
      });
    });

    it('omits the size leg when the subtitle does not start with a number', () => {
      const result = mapPerpsTransaction({
        transaction: orderTx(
          { side: 'sell', size: '10', limitPrice: '5' },
          { id: 'order-bad-subtitle', subtitle: 'Limit short', asset: 'ETH' },
        ),
        chainId: ARBITRUM,
      });

      const sourceToken =
        result && 'sourceToken' in result.data
          ? result.data.sourceToken
          : undefined;
      // No leading numeric token → size omitted (symbol only), not garbage.
      expect(sourceToken).toEqual({ symbol: 'ETH', direction: 'out' });
    });
  });

  describe('orders (real transformOrdersToTransactions output)', () => {
    const makeOrder = (overrides: Partial<Order> = {}): Order => ({
      orderId: 'order-1',
      symbol: 'ETH',
      side: 'sell',
      orderType: 'limit',
      size: '0',
      originalSize: '2.01',
      price: '2000',
      filledSize: '2.01',
      remainingSize: '0',
      status: 'filled',
      timestamp: 1_700_000_000_000,
      ...overrides,
    });

    const mapFromOrder = (order: Order) => {
      const [transaction] = transformOrdersToTransactions([order]);
      return mapPerpsTransaction({ transaction, chainId: ARBITRUM });
    };

    it.each([
      // Short side (direction derived from side + reduceOnly, not the title).
      [
        'Limit short (open)',
        { orderType: 'limit', side: 'sell' },
        'limitShort',
      ],
      [
        'Limit close short',
        { orderType: 'limit', side: 'buy', reduceOnly: true },
        'limitCloseShort',
      ],
      [
        'Market short (open)',
        { orderType: 'market', side: 'sell' },
        'marketShort',
      ],
      [
        'Market close short',
        { orderType: 'market', side: 'buy', reduceOnly: true },
        'marketCloseShort',
      ],
      // Long side (TMCU-1070: previously dropped entirely).
      ['Limit long (open)', { orderType: 'limit', side: 'buy' }, 'limitLong'],
      [
        'Limit close long',
        { orderType: 'limit', side: 'sell', reduceOnly: true },
        'limitCloseLong',
      ],
      [
        'Market long (open)',
        { orderType: 'market', side: 'buy' },
        'marketLong',
      ],
      [
        'Market close long',
        { orderType: 'market', side: 'sell', reduceOnly: true },
        'marketCloseLong',
      ],
      // Stop (trigger) closes: direction from side, market/limit collapses to
      // the dedicated stop kind.
      [
        'Stop market close short',
        {
          orderType: 'market',
          side: 'buy',
          isTrigger: true,
          detailedOrderType: 'Stop Market',
        },
        'stopMarketCloseShort',
      ],
      [
        'Stop market close long',
        {
          orderType: 'market',
          side: 'sell',
          isTrigger: true,
          detailedOrderType: 'Stop Market',
        },
        'stopMarketCloseLong',
      ],
    ] as const)(
      'maps a real %s order to the matching Activity kind',
      (_label, overrides, expectedKind) => {
        const result = mapFromOrder(makeOrder(overrides));
        expect(result?.type).toBe(expectedKind);
      },
    );

    it('carries the transform subtitle position size into sourceToken.amount', () => {
      const result = mapFromOrder(
        makeOrder({ orderType: 'limit', side: 'sell', originalSize: '2.01' }),
      );
      const sourceToken =
        result && 'sourceToken' in result.data
          ? result.data.sourceToken
          : undefined;
      // transform subtitle is "2.01 ETH" -> asset quantity is reused verbatim.
      expect(sourceToken).toEqual({
        amount: '2.01',
        symbol: 'ETH',
        direction: 'out',
      });
    });
  });

  describe('skipped entries', () => {
    it("returns null for orders that don't map to a known Activity kind", () => {
      const result = mapPerpsTransaction({
        transaction: {
          ...base,
          type: 'order',
          category: 'limit_order',
          order: {
            text: 'Filled' as never,
            statusType: 'filled' as never,
            type: 'limit',
            size: '1 ETH',
            limitPrice: '$2000',
            filled: '1 ETH',
          },
        },
        chainId: ARBITRUM,
      });
      expect(result).toBeNull();
    });

    it('returns null when trade has no fill payload', () => {
      const result = mapPerpsTransaction({
        transaction: { ...base, type: 'trade' },
        chainId: ARBITRUM,
      });
      expect(result).toBeNull();
    });

    it('returns null when deposit has no depositWithdrawal payload', () => {
      const result = mapPerpsTransaction({
        transaction: { ...base, type: 'deposit' },
        chainId: ARBITRUM,
      });
      expect(result).toBeNull();
    });
  });

  it('passes the caller-supplied chainId through unchanged', () => {
    const customChain: CaipChainId = 'eip155:8453';
    const result = mapPerpsTransaction({
      transaction: fundingTx(true),
      chainId: customChain,
    });
    expect(result?.chainId).toBe(customChain);
  });

  it('uses caller-supplied quoteAsset for trade/funding amounts', () => {
    const result = mapPerpsTransaction({
      transaction: fundingTx(true, 2),
      chainId: ARBITRUM,
      quoteAsset: { symbol: 'USDC', assetId: 'eip155:42161/erc20:0xabc' },
    });
    expect(tokenOf(result)).toEqual({
      amount: '2',
      symbol: 'USDC',
      assetId: 'eip155:42161/erc20:0xabc',
      direction: 'in',
    });
  });
});
