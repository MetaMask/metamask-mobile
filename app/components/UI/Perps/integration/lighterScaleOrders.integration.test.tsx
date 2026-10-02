import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import {
  PERPS_ERROR_CODES,
  type GetScalePriceLadderParams,
  type OrderParams,
} from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { buildLighterRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-recovery';
import { usePerpsScalePriceLadder } from '../hooks/usePerpsScalePriceLadder';
import { usePerpsScaleOrderGroups } from '../hooks/usePerpsScaleOrderGroups';
import { usePerpsTrading } from '../hooks/usePerpsTrading';
import {
  readPerpsUiObservations,
  perpsUiInputDigest,
} from '../utils/perpsUiObservations';
import { getVenueScalePreview } from '../Views/PerpsProMarketView/components/PerpsProOrderForm/scalePreview';
import { buildPerpsOrderParams } from '../utils/orderParams';

type Harness = ReturnType<typeof buildLighterRecoveryHarness>;
const intent: GetScalePriceLadderParams = {
  symbol: 'BTC',
  providerId: 'lighter',
  minPrice: 90000,
  maxPrice: 95000,
  count: 3,
  sizing: { usdAmount: '100', skew: 2 },
};

async function withScale(
  perps: Harness,
  proof: (
    mounted: ReturnType<
      typeof renderHook<ReturnType<typeof useScale>, unknown>
    >,
  ) => Promise<void>,
  request: GetScalePriceLadderParams = intent,
) {
  const state = initialStatePerps()
    .withMinimalAccounts(perps.walletAddress)
    .withAccountTreeForSelectedAccount()
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: { activeProvider: 'lighter', isTestnet: true },
        },
      },
    })
    .build() as RootState;
  const store = configureStore({
    reducer: (current: RootState = state) => current,
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const engine = perps.bindEngine();
  let mounted:
    | ReturnType<typeof renderHook<ReturnType<typeof useScale>, unknown>>
    | undefined;
  try {
    await perps.controller.init();
    mounted = renderHook(() => useScale(request), { wrapper });
    await waitFor(() =>
      expect(mounted?.result.current.preview.isLoading).toBe(false),
    );
    await proof(mounted);
  } finally {
    mounted?.unmount();
    engine.restore();
    await perps.teardown();
  }
}
function useScale(request: GetScalePriceLadderParams = intent) {
  return {
    preview: usePerpsScalePriceLadder(request),
    inventory: usePerpsScaleOrderGroups(),
    trading: usePerpsTrading(),
  };
}
function orderForPreview(
  mounted: ReturnType<typeof renderHook<ReturnType<typeof useScale>, unknown>>,
  request: GetScalePriceLadderParams = intent,
): OrderParams {
  const preview = getVenueScalePreview(
    request,
    mounted.result.current.preview.result,
  );
  if (!preview)
    throw new Error(
      'Real provider failed to produce complete venue quantities',
    );
  return {
    ...buildPerpsOrderParams({
      asset: request.symbol,
      providerId: 'lighter',
      orderType: 'scale',
      isBuy: true,
      size: preview.totalSize,
      usdAmount: request.sizing?.usdAmount,
      effectivePrice: 100000,
      leverage: 5,
      maxSlippageBps: 100,
      reduceOnly: false,
      trackingData: { marginUsed: 20, marketPrice: 100000, totalFee: 0 },
    }),
    expectedScaleLadder: preview.expectedScaleLadder,
    scaleMinPrice: preview.minPrice,
    scaleMaxPrice: preview.maxPrice,
    scaleNumOrders: preview.orderCount,
    scaleSkew: preview.skew,
  };
}

describe('Mobile Scale consumers through the installed Lighter controller', () => {
  it('observes the mounted UI dispatch and exact provider result without read-side financial effects', async () => {
    const savedDev = __DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    try {
      await withScale(perps, async (mounted) => {
        const cursor = readPerpsUiObservations().submissionSequence;
        const order = orderForPreview(mounted);
        const { trackingData: _trackingData, ...publicOrder } = order;

        let receipt:
          | Awaited<ReturnType<typeof perps.controller.placeOrder>>
          | undefined;
        await act(async () => {
          receipt = await mounted.result.current.trading.placeOrder(order);
        });
        const observed = readPerpsUiObservations().submissions.filter(
          (item) => item.sequence > cursor,
        );

        expect(receipt?.success).toBe(true);
        expect(observed).toHaveLength(1);
        expect(observed[0]).toEqual(
          expect.objectContaining({
            scope: {
              account: perps.walletAddress.toLowerCase(),
              provider: 'lighter',
              network: 'testnet',
              market: 'BTC',
            },
            request: publicOrder,
            requestDigest: perpsUiInputDigest(publicOrder),
            state: 'settled',
            result: receipt,
          }),
        );
        expect(perps.submissions).toHaveLength(3);
        const before = {
          submissions: perps.submissions.length,
          execute: perps.mocks.execute.mock.calls.length,
          createClient: perps.mocks.createClient.mock.calls.length,
          register: perps.mocks.signPersonalMessage.mock.calls.length,
          requests: perps.requests.length,
          storage: perps.storageWrites.length,
        };
        observed[0].request.size = 'foreign';
        observed[0].result?.childOrderIds?.push('foreign');
        const reread = readPerpsUiObservations();
        expect(
          reread.submissions.find(
            (item) => item.requestId === observed[0].requestId,
          )?.request,
        ).toEqual(publicOrder);
        expect(
          reread.submissions.find(
            (item) => item.requestId === observed[0].requestId,
          )?.result,
        ).toEqual(receipt);
        expect({
          submissions: perps.submissions.length,
          execute: perps.mocks.execute.mock.calls.length,
          createClient: perps.mocks.createClient.mock.calls.length,
          register: perps.mocks.signPersonalMessage.mock.calls.length,
          requests: perps.requests.length,
          storage: perps.storageWrites.length,
        }).toEqual(before);
      });
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
    }
  });
  it.each([false, true])(
    'places the actual Pro builder payload with reduce-only %s',
    async (reduceOnly) => {
      const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
      await withScale(perps, async (mounted) => {
        const settled = orderForPreview(mounted);
        const order: OrderParams = {
          ...buildPerpsOrderParams({
            asset: 'BTC',
            isBuy: !reduceOnly,
            size: settled.size,
            usdAmount: settled.usdAmount,
            orderType: 'scale',
            effectivePrice: 100000,
            leverage: 5,
            maxSlippageBps: 100,
            reduceOnly,
            isFullClose: reduceOnly ? false : undefined,
            providerId: 'lighter',
            trackingData: { marginUsed: 20, marketPrice: 100000, totalFee: 0 },
          }),
          scaleMinPrice: settled.scaleMinPrice,
          scaleMaxPrice: settled.scaleMaxPrice,
          scaleNumOrders: settled.scaleNumOrders,
          scaleSkew: settled.scaleSkew,
          expectedScaleLadder: settled.expectedScaleLadder,
        };

        const receipt = await perps.controller.placeOrder(order);

        expect(receipt.error).toBeUndefined();
        expect(receipt.success).toBe(true);
        expect(receipt.acceptedChildren).toHaveLength(3);
        expect(receipt.acceptedSize).toBe('0.00107');
        expect(
          perps.venue.active.map((child) => child.initialBaseAmount),
        ).toEqual(order.expectedScaleLadder?.sizes);
        expect(perps.venue.active.map((child) => child.price)).toEqual(
          order.expectedScaleLadder?.prices,
        );
        expect(order).not.toHaveProperty('priceAtCalculation');
        expect(order).not.toHaveProperty('isFullClose');
      });
    },
  );

  it('rejects metadata drift from the approved Mobile preview before financial writes', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    await withScale(perps, async (mounted) => {
      const order = orderForPreview(mounted);
      const approved = structuredClone(order.expectedScaleLadder);
      perps.marketFixture.supportedSizeDecimals = 6;
      perps.mocks.execute.mockClear();
      perps.submissions.length = 0;

      const receipt = await perps.controller.placeOrder(order);

      expect(receipt.success).toBe(false);
      expect(receipt.error).toBe(PERPS_ERROR_CODES.ORDER_SCALE_PREVIEW_STALE);
      expect(receipt.orderId).toBeUndefined();
      expect(receipt.acceptedChildren).toBeUndefined();
      expect(perps.submissions).toEqual([]);
      expect(perps.venue.active).toEqual([]);
      expect(
        perps.mocks.execute.mock.calls.every(
          ([call]) => call.function === '_createAuthToken',
        ),
      ).toBe(true);
      expect(order.expectedScaleLadder).toEqual(approved);
    });
  });

  it('previews exact venue quantities without financial signing', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    await withScale(perps, async (mounted) => {
      const preview = mounted.result.current.preview.result;

      expect(preview).toEqual(
        expect.objectContaining({
          status: 'ready',
          providerId: 'lighter',
          prices: ['90000', '92500', '95000'],
          sizingPreview: expect.objectContaining({
            minimumBaseSize: '0.00020',
            minimumQuoteAmount: '10.000000',
            sizeDecimals: 5,
            sizes: ['0.00024', '0.00036', '0.00047'],
            totalSize: '0.00107',
          }),
        }),
      );
      expect(getVenueScalePreview(intent, preview)?.orderValue).toBe('99.55');
      expect(perps.submissions).toEqual([]);
      expect(
        perps.mocks.execute.mock.calls.every(
          ([call]) => call.function === '_createAuthToken',
        ),
      ).toBe(true);
    });
  });

  it('lists actual children and cancels the exact group while preserving an unrelated order', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    const unrelated = perps.seedTrigger('stop-loss', '80000');
    await withScale(perps, async (mounted) => {
      const receipt = await perps.controller.placeOrder(
        orderForPreview(mounted),
      );
      expect(receipt.success).toBe(true);
      expect(receipt.acceptedChildren).toHaveLength(3);
      expect(receipt.childOrderIds).toHaveLength(3);
      await act(async () => {
        await mounted.result.current.inventory.reload();
      });
      const group = mounted.result.current.inventory.groups[0];
      expect(group.groupId).toBe(receipt.orderId);
      expect(group.acceptedSize).toBe(receipt.acceptedSize);

      await act(async () => {
        await mounted.result.current.inventory.review(group);
      });
      const reviewed = mounted.result.current.inventory.groups[0];
      await act(async () => {
        await mounted.result.current.inventory.cancel(reviewed);
      });

      expect(mounted.result.current.inventory.error).toBeNull();
      expect(
        perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
      ).toEqual([unrelated]);
      expect(mounted.result.current.inventory.groups[0].state).toBe('terminal');
    });
  });

  it('preserves exact base intent through venue preview and placement', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    const request: GetScalePriceLadderParams = {
      ...intent,
      sizing: { size: '0.00107', skew: 2 },
    };
    await withScale(
      perps,
      async (mounted) => {
        const order = orderForPreview(mounted, request);

        const receipt = await perps.controller.placeOrder(order);

        expect(order.usdAmount).toBeUndefined();
        expect(order.size).toBe('0.00107');
        expect(receipt.success).toBe(true);
        expect(receipt.acceptedSize).toBe('0.00107');
        expect(receipt.acceptedChildren).toHaveLength(3);
        expect(
          perps.venue.active.map((child) => child.initialBaseAmount),
        ).toEqual(order.expectedScaleLadder?.sizes);
        expect(perps.venue.active.map((child) => child.price)).toEqual(
          order.expectedScaleLadder?.prices,
        );
      },
      request,
    );
  });

  it('retains unknown placement for explicit review without replaying child creation', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    perps.venue.submission = 'unknown';
    await withScale(perps, async (mounted) => {
      const receipt = await perps.controller.placeOrder(
        orderForPreview(mounted),
      );
      expect(receipt.success).toBe(false);
      await act(async () => {
        await mounted.result.current.inventory.reload();
      });
      const group = mounted.result.current.inventory.groups[0];
      expect(group.state).toBe('unknown');
      expect(group.acceptedSize).toBeUndefined();
      const signedBefore = perps.mocks.execute.mock.calls.filter(
        ([call]) => call.function === '_signCreateOrder',
      ).length;

      await act(async () => {
        await mounted.result.current.inventory.review(group);
      });

      expect(mounted.result.current.inventory.groups[0].state).toBe('unknown');
      expect(
        perps.mocks.execute.mock.calls.filter(
          ([call]) => call.function === '_signCreateOrder',
        ),
      ).toHaveLength(signedBefore);
      expect(perps.submissions).toHaveLength(1);
    });
  });
});
