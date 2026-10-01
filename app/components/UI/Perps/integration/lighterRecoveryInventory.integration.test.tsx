/**
 * Real installed recovery inventory consumed by Mobile for expected absent and
 * Premium account states. Only documented harness I/O and Logger I/O are mocked.
 * Durable nonce fixtures match Core's unresolved-dispatch inventory shape;
 * these cases do not dispatch a withdrawal or claim live response-loss proof.
 */
import React from 'react';
import {
  act,
  renderHook,
  waitFor,
  type RenderHookResult,
} from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { RootState } from '../../../../reducers';
import Logger from '../../../../util/Logger';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { buildLighterRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-recovery';
import { usePerpsRecovery } from '../hooks/usePerpsRecovery';

type RecoveryHarness = ReturnType<typeof buildLighterRecoveryHarness>;
type AccountState = 'absent' | 'not-found' | 'premium';

function setVenueAccount(perps: RecoveryHarness, account: AccountState) {
  perps.responses.set(
    '/api/v1/accountsByL1Address',
    account === 'not-found'
      ? { code: 21100, message: 'account not found' }
      : {
          code: 200,
          l1Address: perps.walletAddress,
          subAccounts:
            account === 'premium'
              ? [{ ...perps.accountFixture, accountType: 1 }]
              : [],
        },
  );
}

function seedUnresolvedDispatch(perps: RecoveryHarness) {
  const key = `lighterNonceLedger:testnet:${perps.accountIndex}:7`;
  const bytes = JSON.stringify({
    version: 4,
    consumedFloor: 0,
    entries: [
      {
        nonce: 42,
        txHash: 'beef',
        expiresAt: 9999999999999,
        kind: 13,
        intent: 'withdraw:1',
        owner: null,
      },
    ],
    recovered: [],
  });
  perps.disk.set(key, bytes);
  return { key, bytes };
}

function seedResolvedDispatch(
  perps: RecoveryHarness,
  outcome: 'succeeded' | 'failed',
) {
  const key = `lighterNonceLedger:testnet:${perps.accountIndex}:7`;
  const recovered = {
    recoveryId: '42:beef',
    kind: 14,
    intent: 'order:BTC',
    txHash: 'beef',
    outcome,
    evidence: 'stored-venue-result',
  };
  const bytes = JSON.stringify({
    version: 4,
    consumedFloor: 43,
    entries: [],
    recovered: [recovered],
  });
  const rememberedKey = `lighterRecoveryAccounts:testnet:${perps.walletAddress}`;
  const rememberedBytes = JSON.stringify([perps.accountIndex]);
  perps.disk.set(key, bytes);
  perps.disk.set(rememberedKey, rememberedBytes);
  return { key, bytes, rememberedKey, rememberedBytes, recovered };
}

async function withInventory(
  perps: RecoveryHarness,
  proof: (
    rendered: RenderHookResult<ReturnType<typeof usePerpsRecovery>, unknown>,
    errors: jest.SpiedFunction<typeof Logger.error>,
  ) => Promise<void>,
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
  const errors = jest
    .spyOn(Logger, 'error')
    .mockImplementation(() => undefined);
  let unmount: (() => void) | undefined;
  try {
    await perps.controller.init();
    const rendered = renderHook(() => usePerpsRecovery(), { wrapper });
    unmount = rendered.unmount;
    await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
    await proof(rendered, errors);
  } finally {
    unmount?.();
    errors.mockRestore();
    engine.restore();
    await perps.teardown();
    expectNoFinancialIO(perps);
  }
}

function expectLoadedInventory(
  activity: ReturnType<typeof usePerpsRecovery>,
  errors: jest.SpiedFunction<typeof Logger.error>,
) {
  expect(errors).not.toHaveBeenCalled();
  expect(activity.hasLoaded).toBe(true);
  expect(activity.error).toBeUndefined();
  expect(activity.isLoading).toBe(false);
  expect(activity.captureActivity()).toBeDefined();
}

function expectNoFinancialIO(perps: RecoveryHarness) {
  expect(perps.mocks.execute).not.toHaveBeenCalled();
  expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
  expect(perps.submissions).toEqual([]);
  expect(
    perps.requests.some((url) =>
      ['/api/v1/sendTx', '/api/v1/nextNonce', '/api/v1/tx'].includes(
        url.pathname,
      ),
    ),
  ).toBe(false);
}

describe('Lighter recovery inventory through the real Mobile hook', () => {
  it.each(['absent', 'not-found', 'premium'] as const)(
    'loads and reloads recovery for a %s account with no local inventory',
    async (account) => {
      const perps = buildLighterRecoveryHarness();
      setVenueAccount(perps, account);
      await withInventory(perps, async ({ result }, errors) => {
        expectLoadedInventory(result.current, errors);
        expect(result.current.dispatches).toEqual([]);
        expect(result.current.protections).toEqual([]);
        await act(async () => expect(await result.current.reload()).toBe(true));
        expectLoadedInventory(result.current, errors);
        await act(async () =>
          expect(await result.current.checkStatus()).toBe(true),
        );
        expectLoadedInventory(result.current, errors);
        expect(result.current.dispatches).toEqual([]);
        expect(result.current.protections).toEqual([]);
        expectNoFinancialIO(perps);
      });
    },
  );

  it.each([
    ['absent', 'succeeded'],
    ['absent', 'failed'],
    ['premium', 'succeeded'],
    ['premium', 'failed'],
  ] as const)(
    "preserves a %s account's local-only %s outcome without acknowledgment authority",
    async (account, outcome) => {
      const perps = buildLighterRecoveryHarness();
      const dispatch = seedResolvedDispatch(perps, outcome);
      setVenueAccount(perps, account);
      await withInventory(perps, async ({ result }, errors) => {
        expectLoadedInventory(result.current, errors);
        expect(result.current.protections).toEqual([]);
        expect(result.current.dispatches).toHaveLength(1);
        expect(result.current.dispatches[0]).toMatchObject({
          apiKeyIndex: 7,
          acknowledgeable: false,
          kind: dispatch.recovered.kind,
          intent: dispatch.recovered.intent,
          txHash: dispatch.recovered.txHash,
          outcome,
          evidence: dispatch.recovered.evidence,
          providerId: 'lighter',
          walletAddress: perps.walletAddress,
          network: 'testnet',
        });
        const before = result.current.dispatches;

        await act(async () => expect(await result.current.reload()).toBe(true));
        await act(async () =>
          expect(await result.current.checkStatus()).toBe(true),
        );

        expectLoadedInventory(result.current, errors);
        expect(result.current.dispatches).toEqual(before);
        expect(perps.disk.get(dispatch.key)).toBe(dispatch.bytes);
        expect(perps.disk.get(dispatch.rememberedKey)).toBe(
          dispatch.rememberedBytes,
        );
        expect(perps.storageWrites).toEqual([]);
        expectNoFinancialIO(perps);
      });
    },
  );

  it.each(['absent', 'premium'] as const)(
    'preserves durable owned obligations when the current venue account is %s',
    async (account) => {
      const perps = buildLighterRecoveryHarness();
      const source = perps.seedProtectionRecovery({
        apiKeyIndex: 7,
        operationId: 'original',
        survivingOrderIds: ['7'],
      });
      const sourceBytes = perps.disk.get(source.key);
      const dispatch = seedUnresolvedDispatch(perps);
      setVenueAccount(perps, account);
      await withInventory(perps, async ({ result }, errors) => {
        expectLoadedInventory(result.current, errors);
        expect(result.current.protections).toHaveLength(1);
        expect(result.current.protections[0]).toMatchObject({
          settlementKey: source.settlementKey,
          survivingOrderIds: ['7'],
          providerId: 'lighter',
          walletAddress: perps.walletAddress,
          network: 'testnet',
        });
        expect(result.current.dispatches).toHaveLength(1);
        expect(result.current.dispatches[0]).toMatchObject({
          apiKeyIndex: 7,
          acknowledgeable: false,
          kind: 13,
          intent: 'withdraw:1',
          txHash: 'beef',
          outcome: 'unknown',
          evidence: 'unresolved-dispatch',
          providerId: 'lighter',
          walletAddress: perps.walletAddress,
          network: 'testnet',
        });
        const before = {
          dispatches: result.current.dispatches,
          protections: result.current.protections,
        };
        await act(async () => expect(await result.current.reload()).toBe(true));
        await act(async () =>
          expect(await result.current.checkStatus()).toBe(true),
        );
        expectLoadedInventory(result.current, errors);
        expect(result.current.dispatches).toEqual(before.dispatches);
        expect(result.current.protections).toEqual(before.protections);
        expect(perps.disk.get(source.key)).toBe(sourceBytes);
        expect(perps.disk.get(dispatch.key)).toBe(dispatch.bytes);
        expect(perps.storageWrites).toEqual([]);
        expectNoFinancialIO(perps);
      });
    },
  );

  it('retains nonce-only inventory for a remembered account during confirmed absence', async () => {
    const perps = buildLighterRecoveryHarness();
    const dispatch = seedUnresolvedDispatch(perps);
    const rememberedKey = `lighterRecoveryAccounts:testnet:${perps.walletAddress}`;
    const rememberedBytes = JSON.stringify([perps.accountIndex]);
    perps.disk.set(rememberedKey, rememberedBytes);
    setVenueAccount(perps, 'absent');
    await withInventory(perps, async ({ result }, errors) => {
      expectLoadedInventory(result.current, errors);
      expect(result.current.protections).toEqual([]);
      expect(result.current.dispatches).toHaveLength(1);
      expect(result.current.dispatches[0]).toMatchObject({
        acknowledgeable: false,
        txHash: 'beef',
        outcome: 'unknown',
      });
      const before = result.current.dispatches;
      await act(async () => expect(await result.current.reload()).toBe(true));
      await act(async () =>
        expect(await result.current.checkStatus()).toBe(true),
      );
      expectLoadedInventory(result.current, errors);
      expect(result.current.dispatches).toEqual(before);
      expect(perps.disk.get(dispatch.key)).toBe(dispatch.bytes);
      expect(perps.disk.get(rememberedKey)).toBe(rememberedBytes);
      expect(perps.storageWrites).toEqual([]);
      expectNoFinancialIO(perps);
    });
  });
});
