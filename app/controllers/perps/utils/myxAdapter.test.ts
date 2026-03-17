import BigNumber from 'bignumber.js';

import {
  MYX_PRICE_DECIMALS,
  MYX_SIZE_DECIMALS,
  MYX_PRICE_DECIMALS as PRICE_DEC,
  MYX_COLLATERAL_DECIMALS,
} from '../constants/myxConfig';
import type { MarketDataFormatters } from '../types';
import type {
  MYXPoolSymbol,
  MYXTicker,
  MYXPositionType,
  MYXHistoryOrderItem,
  MYXTradeFlowItem,
  MYXKlineData,
  MYXKlineWsData,
} from '../types/myx-types';

import {
  adaptMarketFromMYX,
  adaptPriceFromMYX,
  adaptMarketDataFromMYX,
  filterMYXExclusiveMarkets,
  isOverlappingMarket,
  buildPoolSymbolMap,
  buildSymbolPoolsMap,
  extractSymbolFromPoolId,
  adaptPositionFromMYX,
  adaptOrderFromMYX,
  adaptAccountStateFromMYX,
  adaptOrderFillFromMYX,
  adaptFundingFromMYX,
  adaptUserHistoryFromMYX,
  adaptCandleFromMYX,
  adaptCandleFromMYXWebSocket,
  toMYXKlineResolution,
  assertMYXSuccess,
} from './myxAdapter';
import {
  MYXDirection,
  MYXDirectionEnum,
  MYXOperationEnum,
  MYXOrderStatusEnum,
  MYXOrderTypeEnum,
  MYXExecTypeEnum,
  MYXTradeFlowTypeEnum,
} from '../types/myx-types';

// Mock formatters matching the MarketDataFormatters interface
const mockFormatters: MarketDataFormatters = {
  formatVolume: (v: number) => `$${v.toFixed(0)}`,
  formatPerpsFiat: (v: number) => `$${v.toFixed(2)}`,
  formatPercentage: (p: number) => `${p.toFixed(2)}%`,
  priceRangesUniversal: [],
};

// Helper: create a minimal MYXPoolSymbol fixture
function makePool(overrides: Partial<MYXPoolSymbol> = {}): MYXPoolSymbol {
  return {
    chainId: 56,
    marketId: 'market-1',
    poolId: '0xpool1',
    baseSymbol: 'RHEA',
    quoteSymbol: 'USDT',
    baseTokenIcon: '',
    baseToken: '0xbase',
    quoteToken: '0xquote',
    ...overrides,
  };
}

// Helper: create a minimal MYXTicker fixture
function makeTicker(overrides: Partial<MYXTicker> = {}): MYXTicker {
  return {
    chainId: 56,
    poolId: '0xpool1',
    oracleId: 1,
    price: new BigNumber(1500)
      .times(new BigNumber(10).pow(MYX_PRICE_DECIMALS))
      .toFixed(0),
    change: '2.5',
    high: '0',
    low: '0',
    volume: '1000000',
    turnover: '0',
    ...overrides,
  };
}

describe('myxAdapter', () => {
  describe('adaptMarketFromMYX', () => {
    it('returns correct MarketInfo from a pool with baseSymbol', () => {
      const pool = makePool({ baseSymbol: 'PARTI' });
      const market = adaptMarketFromMYX(pool);

      expect(market.name).toBe('PARTI');
      expect(market.szDecimals).toBe(18);
      expect(market.maxLeverage).toBe(100);
      expect(market.providerId).toBe('myx');
      expect(market.marginTableId).toBe(0);
      expect(market.minimumOrderSize).toBe(10);
    });

    it('falls back to poolId when baseSymbol is missing', () => {
      const pool = makePool({ baseSymbol: '', poolId: '0xfallback' });
      const market = adaptMarketFromMYX(pool);

      expect(market.name).toBe('0xfallback');
    });
  });

  describe('adaptPriceFromMYX', () => {
    it('returns correct price and change24h from valid ticker', () => {
      const ticker = makeTicker({ change: '3.14' });
      const result = adaptPriceFromMYX(ticker);

      expect(Number.parseFloat(result.price)).toBe(1500);
      expect(result.change24h).toBe(3.14);
    });

    it('defaults change24h to 0 when change is falsy', () => {
      const ticker = makeTicker({ change: '' });
      const result = adaptPriceFromMYX(ticker);

      expect(result.change24h).toBe(0);
    });

    it('returns "0" price for zero-value ticker', () => {
      const ticker = makeTicker({ price: '0' });
      const result = adaptPriceFromMYX(ticker);

      expect(result.price).toBe('0');
    });
  });

  describe('adaptMarketDataFromMYX', () => {
    it('returns full data when ticker is provided', () => {
      const pool = makePool({ baseSymbol: 'RHEA' });
      const ticker = makeTicker();
      const data = adaptMarketDataFromMYX(pool, ticker, mockFormatters);

      expect(data.symbol).toBe('RHEA');
      expect(data.providerId).toBe('myx');
      expect(data.maxLeverage).toBe('100x');
      // Price should be formatted (non-zero)
      expect(data.price).toBeDefined();
      expect(data.volume).toBeDefined();
    });

    it('returns zeroed prices when ticker is omitted', () => {
      const pool = makePool({ baseSymbol: 'SKYAI' });
      const data = adaptMarketDataFromMYX(pool, undefined, mockFormatters);

      expect(data.symbol).toBe('SKYAI');
      expect(data.providerId).toBe('myx');
      expect(data.maxLeverage).toBe('100x');
    });
  });

  describe('filterMYXExclusiveMarkets', () => {
    it('filters out overlapping markets (BTC, ETH, BNB, PUMP, WLFI)', () => {
      const pools = [
        makePool({ baseSymbol: 'BTC' }),
        makePool({ baseSymbol: 'ETH' }),
        makePool({ baseSymbol: 'BNB' }),
        makePool({ baseSymbol: 'PUMP' }),
        makePool({ baseSymbol: 'WLFI' }),
        makePool({ baseSymbol: 'RHEA' }),
        makePool({ baseSymbol: 'PARTI' }),
      ];

      const result = filterMYXExclusiveMarkets(pools);
      const symbols = result.map((p) => p.baseSymbol);

      expect(symbols).toEqual(['RHEA', 'PARTI']);
    });

    it('returns all pools when none overlap', () => {
      const pools = [
        makePool({ baseSymbol: 'RHEA' }),
        makePool({ baseSymbol: 'SKYAI' }),
      ];

      expect(filterMYXExclusiveMarkets(pools)).toHaveLength(2);
    });
  });

  describe('isOverlappingMarket', () => {
    it('returns true for BTC', () => {
      expect(isOverlappingMarket('BTC')).toBe(true);
    });

    it('returns true for ETH', () => {
      expect(isOverlappingMarket('ETH')).toBe(true);
    });

    it('returns false for MYX-exclusive symbol', () => {
      expect(isOverlappingMarket('RHEA')).toBe(false);
    });
  });

  describe('buildPoolSymbolMap', () => {
    it('builds a map from poolId to symbol', () => {
      const pools = [
        makePool({ poolId: '0xA', baseSymbol: 'RHEA' }),
        makePool({ poolId: '0xB', baseSymbol: 'PARTI' }),
      ];

      const map = buildPoolSymbolMap(pools);

      expect(map.get('0xA')).toBe('RHEA');
      expect(map.get('0xB')).toBe('PARTI');
      expect(map.size).toBe(2);
    });

    it('returns an empty map for empty input', () => {
      expect(buildPoolSymbolMap([]).size).toBe(0);
    });
  });

  describe('buildSymbolPoolsMap', () => {
    it('groups poolIds by symbol', () => {
      const pools = [
        makePool({ poolId: '0xA', baseSymbol: 'RHEA' }),
        makePool({ poolId: '0xB', baseSymbol: 'RHEA' }),
        makePool({ poolId: '0xC', baseSymbol: 'PARTI' }),
      ];

      const map = buildSymbolPoolsMap(pools);

      expect(map.get('RHEA')).toEqual(['0xA', '0xB']);
      expect(map.get('PARTI')).toEqual(['0xC']);
    });

    it('returns empty map for empty input', () => {
      expect(buildSymbolPoolsMap([]).size).toBe(0);
    });
  });

  describe('extractSymbolFromPoolId', () => {
    it('returns poolId as fallback', () => {
      expect(extractSymbolFromPoolId('0xSomePool')).toBe('0xSomePool');
    });
  });

  // ============================================================================
  // Position Adapter
  // ============================================================================

  describe('adaptPositionFromMYX', () => {
    function makePosition(
      overrides: Partial<MYXPositionType> = {},
    ): MYXPositionType {
      return {
        poolId: '0xpool1',
        positionId: 'pos-1',
        direction: MYXDirection.LONG,
        entryPrice: new BigNumber(50000)
          .times(new BigNumber(10).pow(PRICE_DEC))
          .toFixed(0),
        fundingRateIndex: '0',
        size: new BigNumber(1)
          .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
          .toFixed(0),
        riskTier: 0,
        collateralAmount: new BigNumber(5000)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
        txTime: 1700000000,
        ...overrides,
      };
    }

    const poolSymbolMap = new Map([['0xpool1', 'BTC']]);

    it('adapts a long position with correct symbol, size, and leverage', () => {
      const result = adaptPositionFromMYX(makePosition(), poolSymbolMap);

      expect(result.symbol).toBe('BTC');
      expect(Number(result.size)).toBeGreaterThan(0); // Long = positive
      expect(Number(result.entryPrice)).toBe(50000);
      expect(result.leverage.type).toBe('isolated');
      expect(result.leverage.value).toBe(10); // 50000 * 1 / 5000 = 10x
      expect(result.providerId).toBe('myx');
    });

    it('adapts a short position with negative size', () => {
      const result = adaptPositionFromMYX(
        makePosition({ direction: MYXDirection.SHORT }),
        poolSymbolMap,
      );

      expect(Number(result.size)).toBeLessThan(0);
    });

    it('falls back to poolId when symbol not in map', () => {
      const emptyMap = new Map<string, string>();
      const result = adaptPositionFromMYX(makePosition(), emptyMap);

      expect(result.symbol).toBe('0xpool1');
    });

    it('uses leverage 1 when collateral is zero', () => {
      const result = adaptPositionFromMYX(
        makePosition({ collateralAmount: '0' }),
        poolSymbolMap,
      );

      expect(result.leverage.value).toBe(1);
    });
  });

  // ============================================================================
  // Order Adapter
  // ============================================================================

  describe('adaptOrderFromMYX', () => {
    function makeHistoryOrder(
      overrides: Partial<MYXHistoryOrderItem> = {},
    ): MYXHistoryOrderItem {
      return {
        chainId: 56,
        poolId: '0xpool1',
        orderId: 42,
        txTime: 1700000000,
        txHash: 0xabc as unknown as number,
        orderType: MYXOrderTypeEnum.Market,
        operation: MYXOperationEnum.Increase,
        triggerType: 0 as MYXHistoryOrderItem['triggerType'],
        direction: MYXDirectionEnum.Long,
        size: new BigNumber(2)
          .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
          .toFixed(0),
        filledSize: new BigNumber(2)
          .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
          .toFixed(0),
        filledAmount: '0',
        price: new BigNumber(60000)
          .times(new BigNumber(10).pow(PRICE_DEC))
          .toFixed(0),
        lastPrice: '0',
        orderStatus: MYXOrderStatusEnum.Successful,
        execType: MYXExecTypeEnum.Market,
        slippagePct: 0,
        executionFeeToken: '0x0' as MYXHistoryOrderItem['executionFeeToken'],
        executionFeeAmount: '0',
        tradingFee: '0',
        fundingFee: '0',
        realizedPnl: '0',
        baseSymbol: 'BTC',
        quoteSymbol: 'USDT',
        userLeverage: 10,
        ...overrides,
      };
    }

    const poolSymbolMap = new Map([['0xpool1', 'BTC']]);

    it('maps a filled long market order correctly', () => {
      const result = adaptOrderFromMYX(makeHistoryOrder(), poolSymbolMap);

      expect(result.orderId).toBe('42');
      expect(result.symbol).toBe('BTC');
      expect(result.side).toBe('buy');
      expect(result.orderType).toBe('market');
      expect(result.status).toBe('filled');
      expect(result.isTrigger).toBe(false);
      expect(result.providerId).toBe('myx');
    });

    it('maps a short limit order as sell', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({
          direction: MYXDirectionEnum.Short,
          orderType: MYXOrderTypeEnum.Limit,
          orderStatus: MYXOrderStatusEnum.Cancelled,
        }),
        poolSymbolMap,
      );

      expect(result.side).toBe('sell');
      expect(result.orderType).toBe('limit');
      expect(result.status).toBe('canceled');
    });

    it('maps expired status to canceled', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ orderStatus: MYXOrderStatusEnum.Expired }),
        poolSymbolMap,
      );

      expect(result.status).toBe('canceled');
    });

    it('maps unknown status to open', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ orderStatus: 99 as MYXOrderStatusEnum }),
        poolSymbolMap,
      );

      expect(result.status).toBe('open');
    });

    it('detects TP trigger order', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ execType: MYXExecTypeEnum.TP }),
        poolSymbolMap,
      );

      expect(result.isTrigger).toBe(true);
      expect(result.detailedOrderType).toBe('Take Profit');
    });

    it('detects SL trigger order', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ execType: MYXExecTypeEnum.SL }),
        poolSymbolMap,
      );

      expect(result.isTrigger).toBe(true);
      expect(result.detailedOrderType).toBe('Stop Loss');
    });

    it('detects liquidation order', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ execType: MYXExecTypeEnum.Liquidation }),
        poolSymbolMap,
      );

      expect(result.detailedOrderType).toBe('Liquidation');
    });

    it('sets reduceOnly for decrease operations', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ operation: MYXOperationEnum.Decrease }),
        poolSymbolMap,
      );

      expect(result.reduceOnly).toBe(true);
    });

    it('falls back to poolSymbolMap then poolId for symbol', () => {
      const result = adaptOrderFromMYX(
        makeHistoryOrder({ baseSymbol: undefined as unknown as string }),
        poolSymbolMap,
      );
      expect(result.symbol).toBe('BTC');

      const emptyMap = new Map<string, string>();
      const result2 = adaptOrderFromMYX(
        makeHistoryOrder({ baseSymbol: undefined as unknown as string }),
        emptyMap,
      );
      expect(result2.symbol).toBe('0xpool1');
    });
  });

  // ============================================================================
  // Account State Adapter
  // ============================================================================

  describe('adaptAccountStateFromMYX', () => {
    it('computes balances from account info and wallet balance', () => {
      const accountInfo = {
        totalCollateral: new BigNumber(1000)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
        unrealizedPnl: new BigNumber(50)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
      };
      const walletBalance = new BigNumber(500)
        .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
        .toFixed(0);

      const result = adaptAccountStateFromMYX(accountInfo, walletBalance);

      expect(Number(result.marginUsed)).toBe(1000);
      expect(Number(result.unrealizedPnl)).toBe(50);
      expect(Number(result.availableBalance)).toBe(500);
      // totalBalance = balance + marginUsed + unrealizedPnl = 500 + 1000 + 50
      expect(Number(result.totalBalance)).toBe(1550);
    });

    it('returns zeros when accountInfo is undefined', () => {
      const result = adaptAccountStateFromMYX(undefined);

      expect(Number(result.marginUsed)).toBe(0);
      expect(Number(result.unrealizedPnl)).toBe(0);
      expect(Number(result.totalBalance)).toBe(0);
      expect(Number(result.availableBalance)).toBe(0);
    });

    it('returns zeros when walletBalance is undefined', () => {
      const result = adaptAccountStateFromMYX(undefined, undefined);

      expect(Number(result.availableBalance)).toBe(0);
    });
  });

  // ============================================================================
  // Order Fill Adapter
  // ============================================================================

  describe('adaptOrderFillFromMYX', () => {
    function makeHistoryOrder(
      overrides: Partial<MYXHistoryOrderItem> = {},
    ): MYXHistoryOrderItem {
      return {
        chainId: 56,
        poolId: '0xpool1',
        orderId: 99,
        txTime: 1700000000,
        txHash: 0xdef as unknown as number,
        orderType: MYXOrderTypeEnum.Market,
        operation: MYXOperationEnum.Increase,
        triggerType: 0 as MYXHistoryOrderItem['triggerType'],
        direction: MYXDirectionEnum.Long,
        size: new BigNumber(3)
          .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
          .toFixed(0),
        filledSize: new BigNumber(3)
          .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
          .toFixed(0),
        filledAmount: '0',
        price: new BigNumber(45000)
          .times(new BigNumber(10).pow(PRICE_DEC))
          .toFixed(0),
        lastPrice: new BigNumber(45100)
          .times(new BigNumber(10).pow(PRICE_DEC))
          .toFixed(0),
        orderStatus: MYXOrderStatusEnum.Successful,
        execType: MYXExecTypeEnum.Market,
        slippagePct: 0,
        executionFeeToken: '0x0' as MYXHistoryOrderItem['executionFeeToken'],
        executionFeeAmount: '0',
        tradingFee: new BigNumber(5)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
        fundingFee: '0',
        realizedPnl: new BigNumber(100)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
        baseSymbol: 'BTC',
        quoteSymbol: 'USDT',
        userLeverage: 10,
        ...overrides,
      };
    }

    const poolSymbolMap = new Map([['0xpool1', 'BTC']]);

    it('adapts a filled order to OrderFill with correct fields', () => {
      const result = adaptOrderFillFromMYX(makeHistoryOrder(), poolSymbolMap);

      expect(result.orderId).toBe('99');
      expect(result.symbol).toBe('BTC');
      expect(result.side).toBe('buy');
      expect(Number(result.size)).toBe(3);
      expect(Number(result.price)).toBe(45100); // Uses lastPrice
      expect(Number(result.fee)).toBe(5);
      expect(Number(result.pnl)).toBe(100);
      expect(result.feeToken).toBe('USDT');
      expect(result.success).toBe(true);
      expect(result.orderType).toBe('regular');
      expect(result.providerId).toBe('myx');
    });

    it('uses size as fallback when filledSize is empty', () => {
      const result = adaptOrderFillFromMYX(
        makeHistoryOrder({ filledSize: '' }),
        poolSymbolMap,
      );

      expect(Number(result.size)).toBe(3); // Falls back to size
    });

    it('uses price as fallback when lastPrice is empty', () => {
      const result = adaptOrderFillFromMYX(
        makeHistoryOrder({ lastPrice: '' }),
        poolSymbolMap,
      );

      expect(Number(result.price)).toBe(45000); // Falls back to price
    });

    it('maps TP exec type to take_profit', () => {
      const result = adaptOrderFillFromMYX(
        makeHistoryOrder({ execType: MYXExecTypeEnum.TP }),
        poolSymbolMap,
      );

      expect(result.orderType).toBe('take_profit');
    });

    it('maps SL exec type to stop_loss', () => {
      const result = adaptOrderFillFromMYX(
        makeHistoryOrder({ execType: MYXExecTypeEnum.SL }),
        poolSymbolMap,
      );

      expect(result.orderType).toBe('stop_loss');
    });

    it('maps Liquidation exec type', () => {
      const result = adaptOrderFillFromMYX(
        makeHistoryOrder({ execType: MYXExecTypeEnum.Liquidation }),
        poolSymbolMap,
      );

      expect(result.orderType).toBe('liquidation');
    });

    it('marks unsuccessful orders', () => {
      const result = adaptOrderFillFromMYX(
        makeHistoryOrder({ orderStatus: MYXOrderStatusEnum.Cancelled }),
        poolSymbolMap,
      );

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Funding Adapter
  // ============================================================================

  describe('adaptFundingFromMYX', () => {
    function makeFlowItem(
      overrides: Partial<MYXTradeFlowItem> = {},
    ): MYXTradeFlowItem {
      return {
        chainId: 56,
        orderId: 1,
        user: '0xuser' as MYXTradeFlowItem['user'],
        poolId: '0xpool1',
        fundingFee: new BigNumber(10)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
        tradingFee: '0',
        charge: '0',
        collateralAmount: '0',
        collateralBase: '0',
        txHash: '0xhash',
        txTime: 1700000000,
        type: MYXTradeFlowTypeEnum.Increase,
        accountType: 1 as MYXTradeFlowItem['accountType'],
        executionFee: '0',
        seamlessFee: '0',
        seamlessFeeSymbol: '',
        basePnl: '0',
        quotePnl: '0',
        referrerRebate: '0',
        referralRebate: '0',
        rebateClaimedAmount: '0',
        ...overrides,
      };
    }

    const poolSymbolMap = new Map([['0xpool1', 'BTC']]);

    it('adapts flows with non-zero funding fees', () => {
      const result = adaptFundingFromMYX([makeFlowItem()], poolSymbolMap);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
      expect(Number(result[0].amountUsd)).toBe(10);
      expect(result[0].transactionHash).toBe('0xhash');
    });

    it('filters out flows with zero or empty funding fees', () => {
      const flows = [
        makeFlowItem({ fundingFee: '0' }),
        makeFlowItem({ fundingFee: '' }),
      ];

      const result = adaptFundingFromMYX(flows, poolSymbolMap);

      expect(result).toHaveLength(0);
    });

    it('falls back to poolId when symbol not in map', () => {
      const emptyMap = new Map<string, string>();
      const result = adaptFundingFromMYX([makeFlowItem()], emptyMap);

      expect(result[0].symbol).toBe('0xpool1');
    });
  });

  // ============================================================================
  // User History Adapter
  // ============================================================================

  describe('adaptUserHistoryFromMYX', () => {
    function makeFlowItem(
      overrides: Partial<MYXTradeFlowItem> = {},
    ): MYXTradeFlowItem {
      return {
        chainId: 56,
        orderId: 1,
        user: '0xuser' as MYXTradeFlowItem['user'],
        poolId: '0xpool1',
        fundingFee: '0',
        tradingFee: '0',
        charge: '0',
        collateralAmount: new BigNumber(200)
          .times(new BigNumber(10).pow(MYX_COLLATERAL_DECIMALS))
          .toFixed(0),
        collateralBase: '0',
        txHash: '0xhash',
        txTime: 1700000000,
        type: MYXTradeFlowTypeEnum.MarginAccountDeposit,
        accountType: 1 as MYXTradeFlowItem['accountType'],
        executionFee: '0',
        seamlessFee: '0',
        seamlessFeeSymbol: '',
        basePnl: '0',
        quotePnl: '0',
        referrerRebate: '0',
        referralRebate: '0',
        rebateClaimedAmount: '0',
        ...overrides,
      };
    }

    it('adapts deposit flows', () => {
      const result = adaptUserHistoryFromMYX([makeFlowItem()]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('deposit');
      expect(Number(result[0].amount)).toBe(200);
      expect(result[0].asset).toBe('USDT');
      expect(result[0].status).toBe('completed');
    });

    it('adapts withdrawal flows', () => {
      const result = adaptUserHistoryFromMYX([
        makeFlowItem({ type: MYXTradeFlowTypeEnum.TransferToWallet }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('withdrawal');
    });

    it('filters out non-deposit/withdrawal flow types', () => {
      const result = adaptUserHistoryFromMYX([
        makeFlowItem({ type: MYXTradeFlowTypeEnum.Increase }),
        makeFlowItem({ type: MYXTradeFlowTypeEnum.Decrease }),
        makeFlowItem({ type: MYXTradeFlowTypeEnum.Liquidation }),
      ]);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // Candle Adapters
  // ============================================================================

  describe('adaptCandleFromMYX', () => {
    it('maps REST kline fields to CandleStick', () => {
      const kline: MYXKlineData = {
        time: 1700000000,
        open: '50000',
        close: '51000',
        high: '52000',
        low: '49000',
      };

      const result = adaptCandleFromMYX(kline);

      expect(result.time).toBe(1700000000);
      expect(result.open).toBe('50000');
      expect(result.close).toBe('51000');
      expect(result.high).toBe('52000');
      expect(result.low).toBe('49000');
      expect(result.volume).toBe('0');
    });
  });

  describe('adaptCandleFromMYXWebSocket', () => {
    it('maps WS single-letter fields to CandleStick', () => {
      const wsData: MYXKlineWsData = {
        E: 1700000000,
        T: '100',
        t: 1700000000,
        o: '50000',
        h: '52000',
        l: '49000',
        c: '51000',
        v: '1500',
      };

      const result = adaptCandleFromMYXWebSocket(wsData);

      expect(result.time).toBe(1700000000);
      expect(result.open).toBe('50000');
      expect(result.high).toBe('52000');
      expect(result.low).toBe('49000');
      expect(result.close).toBe('51000');
      expect(result.volume).toBe('1500');
    });
  });

  // ============================================================================
  // Resolution Mapper
  // ============================================================================

  describe('toMYXKlineResolution', () => {
    it.each([
      ['1m', '1m'],
      ['5m', '5m'],
      ['15m', '15m'],
      ['1h', '1h'],
      ['4h', '4h'],
      ['1d', '1d'],
      ['1w', '1w'],
      ['1M', '1M'],
    ] as const)('maps %s to %s', (input, expected) => {
      expect(toMYXKlineResolution(input)).toBe(expected);
    });

    it.each([
      ['3m', '5m'],
      ['2h', '4h'],
      ['8h', '4h'],
      ['12h', '1d'],
      ['3d', '1w'],
    ] as const)('maps unsupported %s to nearest %s', (input, expected) => {
      expect(toMYXKlineResolution(input)).toBe(expected);
    });

    it('defaults unknown periods to 1h', () => {
      expect(toMYXKlineResolution('99x')).toBe('1h');
    });
  });

  // ============================================================================
  // Response Validation
  // ============================================================================

  describe('assertMYXSuccess', () => {
    it('does not throw for code 9200', () => {
      expect(() => assertMYXSuccess({ code: 9200 }, 'test')).not.toThrow();
    });

    it('does not throw for code 0', () => {
      expect(() => assertMYXSuccess({ code: 0 }, 'test')).not.toThrow();
    });

    it('throws for non-success code', () => {
      expect(() =>
        assertMYXSuccess({ code: 500, message: 'Server Error' }, 'fetch'),
      ).toThrow('MYX fetch failed: code=500 message=Server Error');
    });

    it('includes "unknown" when message is null', () => {
      expect(() =>
        assertMYXSuccess({ code: 400, message: null }, 'auth'),
      ).toThrow('MYX auth failed: code=400 message=unknown');
    });
  });
});
