/**
 * Real Mobile recovery hooks → installed Core controller/provider → durable
 * selected protection successor. Only the reusable harness's venue/signer/
 * keyring/disk I/O and documented Engine shell are mocked. Native proof remains
 * outside this integration layer.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { buildLighterRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-recovery';
import { Provider } from 'react-redux';
import { usePerpsRecovery } from '../hooks/usePerpsRecovery';
import { usePerpsRecoveryActions } from '../hooks/usePerpsRecoveryActions';

type RecoveryHarness = ReturnType<typeof buildLighterRecoveryHarness>;
const OTHER_WALLET: `0x${string}` =
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const createState = (
  address: `0x${string}`,
  network: 'testnet' | 'mainnet' = 'testnet',
) =>
  initialStatePerps()
    .withMinimalAccounts(address)
    .withAccountTreeForSelectedAccount()
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'lighter',
            isTestnet: network === 'testnet',
          },
        },
      },
    })
    .build() as RootState;

async function mountRecovery(perps: RecoveryHarness) {
  const state = createState(perps.walletAddress);
  const store = configureStore({
    reducer: (
      current: RootState | undefined,
      action: { type: string; payload?: RootState },
    ) =>
      action.type === 'test/recovery-context' && action.payload
        ? action.payload
        : (current ?? state),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const engine = perps.bindEngine();
  try {
    await perps.controller.init();
    const rendered = renderHook(
      () => {
        const activity = usePerpsRecovery();
        return { activity, actions: usePerpsRecoveryActions(activity) };
      },
      { wrapper },
    );
    await waitFor(() =>
      expect(rendered.result.current.activity.hasLoaded).toBe(true),
    );
    return {
      ...rendered,
      selectAccount: (address: `0x${string}`) => {
        store.dispatch({
          type: 'test/recovery-context',
          payload: createState(address),
        });
        perps.selectAccount(address);
      },
      selectNetwork: async (network: 'testnet' | 'mainnet') => {
        await perps.controller.toggleTestnet();
        expect(perps.controller.state.isTestnet).toBe(network === 'testnet');
        store.dispatch({
          type: 'test/recovery-context',
          payload: createState(perps.walletAddress, network),
        });
      },
      cleanup: async () => {
        rendered.unmount();
        engine.restore();
        await perps.teardown();
      },
    };
  } catch (error) {
    engine.restore();
    await perps.teardown();
    throw error;
  }
}

type MountedRecovery = Awaited<ReturnType<typeof mountRecovery>>;

async function withRecovery(
  perps: RecoveryHarness,
  proof: (mounted: MountedRecovery) => Promise<void>,
) {
  const mounted = await mountRecovery(perps);
  try {
    await proof(mounted);
  } finally {
    await mounted.cleanup();
  }
}

async function reviewSource(
  mounted: MountedRecovery,
  source: ReturnType<RecoveryHarness['seedProtectionRecovery']>,
) {
  const entry = mounted.result.current.activity.protections.find(
    (candidate) => candidate.settlementKey === source.settlementKey,
  );
  expect(entry?.recoveryId).toEqual(expect.any(String));
  if (!entry) {
    throw new Error('Real installed producer did not list the parked source');
  }
  await act(async () =>
    expect(await mounted.result.current.actions.reviewEntry(entry)).toBe(true),
  );
  return entry;
}

const financialCalls = (perps: RecoveryHarness) =>
  perps.mocks.execute.mock.calls
    .map(([call]) => call)
    .filter((call) => call.function !== '_createAuthToken');

describe('Lighter selected protection through Mobile recovery hooks', () => {
  it('refuses financial signing in default read mode despite valid venue fixtures', async () => {
    const perps = buildLighterRecoveryHarness();
    perps.responses.set('/api/v1/orderBooks', {
      code: 200,
      orderBooks: [perps.marketFixture],
    });
    perps.responses.set('/api/v1/orderBookDetails', {
      code: 200,
      orderBookDetails: [perps.marketFixture],
    });
    const selectedOrder = perps.seedTrigger('stop-loss', '80000');
    const source = perps.seedProtectionRecovery({
      survivingOrderIds: [selectedOrder],
    });
    const sourceBytes = perps.disk.get(source.key);
    await withRecovery(perps, async (mounted) => {
      const entry = await reviewSource(mounted, source);
      await act(async () =>
        expect(
          await mounted.result.current.actions.removeProtection(entry),
        ).toEqual({ success: false }),
      );
      expect(
        financialCalls(perps).map(({ function: operation }) => operation),
      ).toEqual(['_signCancelOrder']);
      expect(perps.mocks.debugLog).toHaveBeenCalledWith(
        '[LighterProvider] updatePositionTPSL failed',
        expect.objectContaining({
          error: expect.stringContaining(
            'Recovery reads must not sign financial transactions',
          ),
        }),
      );
      expect(perps.submissions).toEqual([]);
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
      expect(
        perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
      ).toEqual([selectedOrder]);
      expect(perps.disk.get(source.key)).toBe(sourceBytes);
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
    });
  });

  it.each([
    {
      side: 'long',
      sign: 1,
      takeProfit: '130000',
      stopLoss: '85000',
      isAsk: 1,
    },
    {
      side: 'short',
      sign: -1,
      takeProfit: '85000',
      stopLoss: '130000',
      isAsk: 0,
    },
  ])(
    'settles exact $side replacement and preserves unrelated obligations after recreation',
    async ({ sign, takeProfit, stopLoss, isAsk }) => {
      const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
      perps.venue.positions[0].sign = sign;
      const oldOrder = perps.seedTrigger(
        'stop-loss',
        sign === 1 ? '80000' : '140000',
      );
      const unrelatedOrder = perps.seedTrigger(
        'take-profit',
        sign === 1 ? '150000' : '70000',
      );
      const source = perps.seedProtectionRecovery({
        survivingOrderIds: [oldOrder],
      });
      const unrelated = perps.seedProtectionRecovery({
        symbol: 'ETH',
        operationId: 'unrelated',
      });
      const unrelatedBytes = perps.disk.get(unrelated.key);
      let sourceId: string | undefined;
      await withRecovery(perps, async (mounted) => {
        const entry = await reviewSource(mounted, source);
        sourceId = entry.recoveryId;
        const edit =
          mounted.result.current.actions.prepareProtectionEdit(entry);
        expect(edit?.position).toMatchObject({
          size: sign === 1 ? '0.1' : '-0.1',
          entryPrice: '100000',
        });
        if (!edit) throw new Error('Missing exact reviewed recovery editor');
        act(() => expect(edit.onBeforeConfirm?.()).toBe(true));
        await act(async () =>
          expect(
            await edit.onConfirm(edit.position, takeProfit, stopLoss),
          ).toEqual({ success: true }),
        );

        const calls = financialCalls(perps);
        expect(calls.map((call) => call.function)).toEqual([
          '_signCreateGroupedOrders',
          '_signCancelOrder',
        ]);
        const create = calls[0];
        if (create.function !== '_signCreateGroupedOrders') {
          throw new Error('Expected the real paired protection signer path');
        }
        expect(create.params.slice(0, 3)).toEqual([perps.accountIndex, 2, 2]);
        const execution = (price: string) =>
          String(Math.round(Number(price) * (sign === 1 ? 0.95 : 1.05) * 10));
        expect(create.params.slice(5, 13)).toEqual([
          '10000',
          execution(takeProfit),
          isAsk,
          4,
          0,
          1,
          String(Number(takeProfit) * 10),
          -1,
        ]);
        expect(create.params.slice(15, 23)).toEqual([
          '10000',
          execution(stopLoss),
          isAsk,
          2,
          0,
          1,
          String(Number(stopLoss) * 10),
          -1,
        ]);
        expect(calls[1].params).toEqual([perps.accountIndex, 1, oldOrder, 1]);
        expect(perps.submissions.map(({ txType }) => txType)).toEqual([28, 15]);
        expect(
          perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
        ).toContain(unrelatedOrder);
        expect(
          perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
        ).not.toContain(oldOrder);
        expect(perps.disk.has(source.key)).toBe(false);
        expect(perps.disk.get(unrelated.key)).toBe(unrelatedBytes);
        expect(
          JSON.parse(perps.disk.get(source.successorKey) ?? '{}'),
        ).toMatchObject({
          sourceSettlementKey: source.settlementKey,
          sourceOperationId: source.operationId,
          successorSettlementKey: `${perps.walletAddress}:${perps.accountIndex}:${perps.apiKeyIndex}:BTC`,
          state: 'settled',
        });
        expect(
          perps.storageWrites
            .filter(({ key }) => key.startsWith('lighterTpslJournalOp:'))
            .some(({ value }) => {
              const record = JSON.parse(value) as {
                sourceRecoverySettlementKey?: string;
                sourceRecoveryOperationId?: string;
              };
              return (
                record.sourceRecoverySettlementKey === source.settlementKey &&
                record.sourceRecoveryOperationId === source.operationId
              );
            }),
        ).toBe(true);
        expect(
          mounted.result.current.activity.protections.map(
            ({ recoveryId }) => recoveryId,
          ),
        ).not.toContain(sourceId);
        expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      });

      const restarted = buildLighterRecoveryHarness({
        mode: 'isolated-write',
        disk: perps.disk,
        venue: perps.venue,
      });
      await withRecovery(restarted, async ({ result }) => {
        expect(
          result.current.activity.protections.map(
            ({ settlementKey }) => settlementKey,
          ),
        ).toEqual([unrelated.settlementKey]);
        expect(restarted.disk.get(unrelated.key)).toBe(unrelatedBytes);
        expect(financialCalls(restarted)).toEqual([]);
        expect(restarted.submissions).toEqual([]);
        expect(
          await restarted.controller.resolveRecoveryProtection({
            providerId: 'lighter',
            recoveryId: sourceId ?? '',
            symbol: 'BTC',
            takeProfitPrice: takeProfit,
            stopLossPrice: stopLoss,
          }),
        ).toMatchObject({ status: 'settled', success: true });
        expect(restarted.submissions).toEqual([]);
      });
    },
  );

  it('removes only the selected source protection and persists settlement', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    const selectedOrder = perps.seedTrigger('stop-loss', '80000');
    const unrelatedOrder = perps.seedTrigger('take-profit', '150000');
    const source = perps.seedProtectionRecovery({
      survivingOrderIds: [selectedOrder],
    });
    const unrelated = perps.seedProtectionRecovery({
      symbol: 'ETH',
      operationId: 'unrelated',
    });
    const unrelatedBytes = perps.disk.get(unrelated.key);
    await withRecovery(perps, async (mounted) => {
      const entry = await reviewSource(mounted, source);
      await act(async () =>
        expect(
          await mounted.result.current.actions.removeProtection(entry),
        ).toEqual({ success: true }),
      );
      expect(
        financialCalls(perps).map(({ function: operation }) => operation),
      ).toEqual(['_signCancelOrder']);
      expect(financialCalls(perps)[0].params).toEqual([
        perps.accountIndex,
        1,
        selectedOrder,
        0,
      ]);
      expect(perps.submissions.map(({ txType }) => txType)).toEqual([15]);
      expect(
        perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
      ).toEqual([unrelatedOrder]);
      expect(perps.disk.has(source.key)).toBe(false);
      expect(
        JSON.parse(perps.disk.get(source.successorKey) ?? '{}'),
      ).toMatchObject({
        state: 'settled',
        sourceOperationId: source.operationId,
      });
      expect(perps.disk.get(unrelated.key)).toBe(unrelatedBytes);
      expect(
        mounted.result.current.activity.protections.map(
          ({ settlementKey }) => settlementKey,
        ),
      ).toEqual([unrelated.settlementKey]);
    });
    const restarted = buildLighterRecoveryHarness({
      mode: 'isolated-write',
      disk: perps.disk,
      venue: perps.venue,
    });
    await withRecovery(restarted, async ({ result }) => {
      expect(
        result.current.activity.protections.map(
          ({ settlementKey }) => settlementKey,
        ),
      ).toEqual([unrelated.settlementKey]);
      expect(
        restarted.venue.active.map(({ orderIndex }) => String(orderIndex)),
      ).toEqual([unrelatedOrder]);
      expect(restarted.submissions).toEqual([]);
    });
  });

  it('retains an unresolved successor without replay on reload or controller recreation', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    const oldOrder = perps.seedTrigger('stop-loss', '80000');
    const source = perps.seedProtectionRecovery({
      survivingOrderIds: [oldOrder],
    });
    const sourceBytes = perps.disk.get(source.key);
    perps.venue.submission = 'unknown';
    await withRecovery(perps, async (mounted) => {
      const entry = await reviewSource(mounted, source);
      const edit = mounted.result.current.actions.prepareProtectionEdit(entry);
      if (!edit) throw new Error('Missing reviewed editor');
      act(() => expect(edit.onBeforeConfirm?.()).toBe(true));
      await act(async () =>
        expect(await edit.onConfirm(edit.position, '130000')).toEqual({
          success: false,
        }),
      );
      expect(mounted.result.current.actions.actionError).toBe('unresolved');
      expect(perps.submissions).toHaveLength(1);
      expect(
        financialCalls(perps).map(({ function: operation }) => operation),
      ).toEqual(['_signCreateOrder']);
      expect(perps.disk.get(source.key)).toBe(sourceBytes);
      expect(
        JSON.parse(perps.disk.get(source.successorKey) ?? '{}'),
      ).toMatchObject({
        state: 'pending',
        sourceOperationId: source.operationId,
      });
      await act(async () =>
        expect(await mounted.result.current.actions.reload()).toBe(true),
      );
      expect(
        mounted.result.current.activity.protections.some(
          ({ recoveryId }) => recoveryId === entry.recoveryId,
        ),
      ).toBe(true);
      expect(perps.submissions).toHaveLength(1);
      expect(financialCalls(perps)).toHaveLength(1);
      expect(
        perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
      ).toEqual([oldOrder]);
    });
    const restarted = buildLighterRecoveryHarness({
      mode: 'isolated-write',
      disk: perps.disk,
      venue: perps.venue,
    });
    await withRecovery(restarted, async ({ result }) => {
      expect(
        result.current.activity.protections.some(
          ({ settlementKey }) => settlementKey === source.settlementKey,
        ),
      ).toBe(true);
      expect(restarted.disk.get(source.key)).toBe(sourceBytes);
      expect(financialCalls(restarted)).toEqual([]);
      expect(restarted.submissions).toEqual([]);
    });
  });

  it.each(['side', 'size', 'entry'] as const)(
    'refuses position %s drift without signing, submission or source changes',
    async (change) => {
      const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
      const order = perps.seedTrigger('stop-loss', '80000');
      const source = perps.seedProtectionRecovery({
        survivingOrderIds: [order],
      });
      await withRecovery(perps, async (mounted) => {
        const entry = await reviewSource(mounted, source);
        const edit =
          mounted.result.current.actions.prepareProtectionEdit(entry);
        if (!edit) throw new Error('Missing reviewed editor');
        const diskBefore = [...perps.disk];
        const writesBefore = perps.storageWrites.length;
        if (change === 'side') perps.venue.positions[0].sign = -1;
        if (change === 'size') perps.venue.positions[0].position = '0.2';
        if (change === 'entry')
          perps.venue.positions[0].avgEntryPrice = '101000';
        act(() => expect(edit.onBeforeConfirm?.()).toBe(true));
        await act(async () =>
          expect(await edit.onConfirm(edit.position, '130000')).toEqual({
            success: false,
          }),
        );
        expect(financialCalls(perps)).toEqual([]);
        expect(perps.submissions).toEqual([]);
        expect([...perps.disk]).toEqual(diskBefore);
        expect(perps.storageWrites).toHaveLength(writesBefore);
        expect(
          perps.venue.active.map(({ orderIndex }) => String(orderIndex)),
        ).toEqual([order]);
      });
    },
  );

  it('refuses an opaque source after the durable operation changes without mutation', async () => {
    const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
    const source = perps.seedProtectionRecovery();
    await withRecovery(perps, async (mounted) => {
      const entry = await reviewSource(mounted, source);
      perps.seedProtectionRecovery({ operationId: 'newer-source' });
      const diskBefore = [...perps.disk];
      const writesBefore = perps.storageWrites.length;
      await act(async () =>
        expect(
          await mounted.result.current.actions.removeProtection(entry),
        ).toEqual({ success: false }),
      );
      expect(financialCalls(perps)).toEqual([]);
      expect(perps.submissions).toEqual([]);
      expect([...perps.disk]).toEqual(diskBefore);
      expect(perps.storageWrites).toHaveLength(writesBefore);
    });
  });

  it.each(['provider', 'source'] as const)(
    'refuses the wrong public %s identity before mutation',
    async (identity) => {
      const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
      const source = perps.seedProtectionRecovery();
      await withRecovery(perps, async (mounted) => {
        const entry = await reviewSource(mounted, source);
        const diskBefore = [...perps.disk];
        const writesBefore = perps.storageWrites.length;
        const params = {
          providerId:
            identity === 'provider'
              ? ('hyperliquid' as const)
              : ('lighter' as const),
          recoveryId:
            identity === 'source'
              ? `${entry.recoveryId}-invalid`
              : (entry.recoveryId ?? ''),
          symbol: 'BTC',
        };
        if (identity === 'provider') {
          await expect(
            perps.controller.resolveRecoveryProtection(params),
          ).rejects.toThrow(/provider.*context/u);
        } else {
          expect(
            await perps.controller.resolveRecoveryProtection(params),
          ).toMatchObject({ status: 'unresolved', success: false });
        }
        expect(financialCalls(perps)).toEqual([]);
        expect(perps.submissions).toEqual([]);
        expect([...perps.disk]).toEqual(diskBefore);
        expect(perps.storageWrites).toHaveLength(writesBefore);
      });
    },
  );

  it.each(['account', 'network'] as const)(
    'retires claimed editor authority after %s A-to-B-to-A before confirmation',
    async (transition) => {
      const perps = buildLighterRecoveryHarness({ mode: 'isolated-write' });
      const source = perps.seedProtectionRecovery();
      await withRecovery(perps, async (mounted) => {
        const entry = await reviewSource(mounted, source);
        const edit =
          mounted.result.current.actions.prepareProtectionEdit(entry);
        if (!edit?.position)
          throw new Error('Missing reviewed editor position');
        const diskBefore = [...perps.disk];
        const writesBefore = perps.storageWrites.length;
        act(() => expect(edit.onBeforeConfirm?.()).toBe(true));
        if (transition === 'account') {
          act(() => {
            mounted.selectAccount(OTHER_WALLET);
            mounted.selectAccount(perps.walletAddress);
          });
        } else {
          await act(async () => {
            await mounted.selectNetwork('mainnet');
            await mounted.selectNetwork('testnet');
          });
        }
        await act(async () =>
          expect(await edit.onConfirm(edit.position, '130000')).toEqual({
            success: false,
          }),
        );
        expect(edit.isPositionReviewCurrent?.(edit.position)).toBe(false);
        expect(financialCalls(perps)).toEqual([]);
        expect(perps.submissions).toEqual([]);
        expect([...perps.disk]).toEqual(diskBefore);
        expect(perps.storageWrites).toHaveLength(writesBefore);
      });
    },
  );
});
