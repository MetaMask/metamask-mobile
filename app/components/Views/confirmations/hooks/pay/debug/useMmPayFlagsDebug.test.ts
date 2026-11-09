import type { Json } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { useMmPayFlagsDebug } from './useMmPayFlagsDebug';

function buildState(remoteFeatureFlags: Record<string, Json>) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
      },
    },
  };
}

describe('useMmPayFlagsDebug', () => {
  it('reports Solana Pay as enabled when the relay flag is on', () => {
    const { result } = renderHookWithProvider(() => useMmPayFlagsDebug(), {
      state: buildState({
        confirmations_pay: {
          payStrategies: { relay: { solana: { enabled: true } } },
        },
      }),
    });

    expect(result.current.solanaPayEnabled).toBe(true);
  });

  it('reports Solana Pay as disabled without the relay flag', () => {
    const { result } = renderHookWithProvider(() => useMmPayFlagsDebug(), {
      state: buildState({}),
    });

    expect(result.current.solanaPayEnabled).toBe(false);
  });
});
