import { act } from '@testing-library/react-native';
import { buildPerpsFlowHarness } from '../../../../../tests/integration/harnesses/perps/perps-flow';
import {
  PERPS_ERROR_CODES,
  type Order,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import { usePerpsTrading } from '../hooks/usePerpsTrading';

const createPosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
  size: '0.1',
  entryPrice: '50000',
  positionValue: '5000',
  unrealizedPnl: '100',
  marginUsed: '500',
  leverage: { type: 'isolated', value: 10 },
  liquidationPrice: '45000',
  maxLeverage: 50,
  returnOnEquity: '0.2',
  cumulativeFunding: { allTime: '1', sinceOpen: '1', sinceChange: '1' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const createPositionState = (position: Position) => ({
  assetPositions: [
    {
      position: {
        coin: position.symbol,
        szi: position.size,
        entryPx: position.entryPrice,
      },
    },
  ],
});

const createProtectionOrder = (): Order => ({
  orderId: '456',
  symbol: 'BTC',
  side: 'sell',
  orderType: 'limit',
  size: '0',
  originalSize: '0',
  remainingSize: '0',
  filledSize: '0',
  price: '60000',
  status: 'open',
  timestamp: 1_700_000_000_000,
  detailedOrderType: 'Take Profit Limit',
  triggerOrderType: 'take_profit_limit',
  isTrigger: true,
  reduceOnly: true,
  isPositionTpsl: true,
  triggerPrice: '60000',
});

describe('Perps position protection through the Mobile trading hook', () => {
  it.each([
    {
      change: 'side',
      size: '-0.1',
      entryPrice: '50000',
      takeProfitPrice: '45000',
    },
    {
      change: 'size',
      size: '0.2',
      entryPrice: '50000',
      takeProfitPrice: '60000',
    },
    {
      change: 'entry price',
      size: '0.1',
      entryPrice: '51000',
      takeProfitPrice: '60000',
    },
  ])(
    'refuses a changed $change before any protection write',
    async ({ size, entryPrice, takeProfitPrice }) => {
      const perps = buildPerpsFlowHarness({ isTestnet: true });
      perps.harness.setupTradingReady();
      perps.harness.mocks.subscription.getCachedPositions.mockReturnValue([
        createPosition({ size, entryPrice }),
      ]);
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());
      const params = {
        symbol: 'BTC',
        takeProfitPrice,
        expectedPosition: { size: '0.1', entryPrice: '50000' },
      };

      let update: OrderResult | undefined;
      await act(async () => {
        update = await result.current.updatePositionTPSL(params);
      });

      expect(update).toMatchObject({
        success: false,
        error: PERPS_ERROR_CODES.TPSL_UPDATE_FAILED,
      });
      expect(perps.harness.mocks.exchangeClient.cancel).not.toHaveBeenCalled();
      expect(perps.harness.mocks.exchangeClient.order).not.toHaveBeenCalled();
    },
  );

  it.each([
    { side: 'long', size: '0.1', takeProfitPrice: '60000', isBuy: false },
    { side: 'short', size: '-0.1', takeProfitPrice: '40000', isBuy: true },
  ])(
    'returns the exact protection receipt for an unchanged $side position',
    async ({ size, takeProfitPrice, isBuy }) => {
      const perps = buildPerpsFlowHarness({ isTestnet: true });
      perps.harness.setupTradingReady();
      const position = createPosition({ size });
      const { exchangeClient, infoClient, subscription } = perps.harness.mocks;
      subscription.getCachedPositions.mockReturnValue([position]);
      infoClient.clearinghouseState.mockResolvedValue(
        createPositionState(position),
      );
      exchangeClient.order.mockResolvedValue({
        status: 'ok',
        response: { data: { statuses: [{ resting: { oid: 901 } }] } },
      });
      infoClient.orderStatus.mockImplementation(
        async ({ oid }: { oid: string }) => {
          const submitted = exchangeClient.order.mock.calls[0][0] as {
            orders: { c: string }[];
          };
          const child = submitted.orders[0];
          return oid === child.c
            ? {
                status: 'order',
                order: {
                  status: 'open',
                  order: { coin: 'BTC', cloid: child.c, oid: 901, sz: '0' },
                },
              }
            : { status: 'unknownOid' };
        },
      );
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      let update: OrderResult | undefined;
      await act(async () => {
        update = await result.current.updatePositionTPSL({
          symbol: 'BTC',
          takeProfitPrice,
          expectedPosition: { size, entryPrice: '50000.0' },
        });
      });

      expect(update).toMatchObject({ success: true, childOrderIds: ['901'] });
      expect(exchangeClient.order).toHaveBeenCalledTimes(1);
      expect(exchangeClient.order).toHaveBeenCalledWith(
        expect.objectContaining({
          grouping: 'positionTpsl',
          orders: [
            expect.objectContaining({
              a: 0,
              b: isBuy,
              r: true,
              s: '0',
              t: {
                trigger: {
                  isMarket: false,
                  triggerPx: takeProfitPrice,
                  tpsl: 'tp',
                },
              },
            }),
          ],
        }),
      );
      expect(infoClient.orderStatus).toHaveBeenCalledWith({
        user: '0x1234567890123456789012345678901234567890',
        oid: expect.stringMatching(/^0x[0-9a-f]{32}$/u),
      });
    },
  );

  it.each(['account', 'network'])(
    'refuses %s switching inside the dispatch guard before removing protection',
    async (change) => {
      const perps = buildPerpsFlowHarness({ isTestnet: true });
      perps.harness.setupTradingReady();
      const position = createPosition();
      const { subscription, infoClient, exchangeClient, wallet, client } =
        perps.harness.mocks;
      subscription.getCachedPositions.mockReturnValue([position]);
      subscription.getOrdersCacheIfInitialized.mockReturnValue([
        createProtectionOrder(),
      ]);
      infoClient.clearinghouseState.mockResolvedValue(
        createPositionState(position),
      );
      infoClient.userToMultiSigSigners.mockImplementation(async () => {
        if (change === 'account') {
          wallet.getUserAddressWithDefault.mockResolvedValue(
            '0x2222222222222222222222222222222222222222',
          );
        } else {
          client.isTestnetMode.mockReturnValue(false);
        }
        return null;
      });
      const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

      let update: OrderResult | undefined;
      await act(async () => {
        update = await result.current.updatePositionTPSL({
          symbol: 'BTC',
          expectedPosition: {
            size: position.size,
            entryPrice: position.entryPrice,
          },
        });
      });

      expect(infoClient.userToMultiSigSigners).toHaveBeenCalledTimes(1);
      expect(update).toMatchObject({
        success: false,
        error: PERPS_ERROR_CODES.PROVIDER_LIFECYCLE_STALE,
      });
      expect(exchangeClient.cancel).not.toHaveBeenCalled();
      expect(exchangeClient.order).not.toHaveBeenCalled();
    },
  );

  it('preserves existing protection when the position changes at cancellation dispatch', async () => {
    const perps = buildPerpsFlowHarness({ isTestnet: true });
    perps.harness.setupTradingReady();
    const position = createPosition();
    const { subscription, infoClient, exchangeClient } = perps.harness.mocks;
    subscription.getCachedPositions.mockReturnValue([position]);
    subscription.getOrdersCacheIfInitialized.mockReturnValue([
      createProtectionOrder(),
    ]);
    infoClient.clearinghouseState
      .mockResolvedValueOnce(createPositionState(position))
      .mockResolvedValue(
        createPositionState(createPosition({ entryPrice: '51000' })),
      );
    const { result } = perps.renderHookWithFlow(() => usePerpsTrading());

    let update: OrderResult | undefined;
    await act(async () => {
      update = await result.current.updatePositionTPSL({
        symbol: 'BTC',
        expectedPosition: {
          size: position.size,
          entryPrice: position.entryPrice,
        },
      });
    });

    expect(infoClient.clearinghouseState).toHaveBeenCalledTimes(2);
    expect(update).toMatchObject({
      success: false,
      error: PERPS_ERROR_CODES.TPSL_UPDATE_FAILED,
    });
    expect(exchangeClient.cancel).not.toHaveBeenCalled();
    expect(exchangeClient.order).not.toHaveBeenCalled();
  });
});
