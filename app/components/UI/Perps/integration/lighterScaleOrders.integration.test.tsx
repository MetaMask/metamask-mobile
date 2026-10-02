import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type {
  GetScalePriceLadderParams,
  OrderParams,
} from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { buildLighterRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-recovery';
import { usePerpsScalePriceLadder } from '../hooks/usePerpsScalePriceLadder';
import { usePerpsScaleOrderGroups } from '../hooks/usePerpsScaleOrderGroups';
import { getVenueScalePreview } from '../Views/PerpsProMarketView/components/PerpsProOrderForm/scalePreview';

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
    symbol: request.symbol,
    providerId: 'lighter',
    orderType: 'scale',
    isBuy: true,
    size: preview.totalSize,
    usdAmount: request.sizing?.usdAmount,
    scaleMinPrice: preview.minPrice,
    scaleMaxPrice: preview.maxPrice,
    scaleNumOrders: preview.orderCount,
    scaleSkew: preview.skew,
  };
}

describe('Mobile Scale consumers through the installed Lighter controller', () => {
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
