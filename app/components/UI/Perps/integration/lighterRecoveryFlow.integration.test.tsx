/**
 * Real installed Core recovery list, Mobile hooks and acknowledgment storage.
 * Engine is app-shell glue; venue, signer, keyring and disk I/O are supplied by
 * the recovery harness. No recovery method, provider or hook is replaced.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { buildLighterRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-recovery';
import { usePerpsRecovery } from '../hooks/usePerpsRecovery';
import { usePerpsRecoveryActions } from '../hooks/usePerpsRecoveryActions';

describe('Lighter recovery Mobile consumer', () => {
  it('acknowledges a real resolved outcome whose optional flag is omitted', async () => {
    const perps = buildLighterRecoveryHarness();
    const ledgerKey = `lighterNonceLedger:testnet:${perps.accountIndex}:${perps.apiKeyIndex}`;
    const outcome = {
      recoveryId: '42:deadbeef',
      kind: 14,
      intent: 'order:BTC',
      txHash: 'deadbeef',
      outcome: 'succeeded',
      evidence: 'tx-status:2',
    };
    perps.disk.set(
      ledgerKey,
      JSON.stringify({
        version: 4,
        consumedFloor: 43,
        entries: [],
        recovered: [outcome],
      }),
    );
    const engine = perps.bindEngine();
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
    let unmount: (() => void) | undefined;
    try {
      await perps.controller.init();
      const rendered = renderHook(
        () => {
          const activity = usePerpsRecovery();
          return { activity, actions: usePerpsRecoveryActions(activity) };
        },
        { wrapper },
      );
      unmount = rendered.unmount;
      const { result } = rendered;
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
      expect(result.current.activity.dispatches).toHaveLength(1);
      const [entry] = result.current.activity.dispatches;
      expect(entry).not.toHaveProperty('acknowledgeable');
      expect(entry).toMatchObject({
        outcome: 'succeeded',
        providerId: 'lighter',
        network: 'testnet',
        walletAddress: perps.walletAddress,
      });
      await act(async () =>
        expect(await result.current.actions.reviewEntry(entry)).toBe(true),
      );

      await act(async () =>
        expect(await result.current.actions.acknowledge(entry)).toBe(true),
      );

      await waitFor(() =>
        expect(result.current.activity.dispatches).toEqual([]),
      );
      expect(await perps.controller.getRecoveredDispatches()).toEqual([]);
      expect(JSON.parse(perps.disk.get(ledgerKey) ?? '{}')).toMatchObject({
        version: 4,
        consumedFloor: 43,
        entries: [],
        recovered: [],
      });
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.mocks.execute.mock.calls.every(
          ([call]) => call.function === '_createAuthToken',
        ),
      ).toBe(true);
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      unmount?.();
      engine.restore();
      await perps.teardown();
    }
  });
});
