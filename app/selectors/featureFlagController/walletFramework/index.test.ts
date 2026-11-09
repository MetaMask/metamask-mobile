import { selectIsRpcFailoverEnabled } from '.';

const createState = (remoteFeatureFlags: Record<string, unknown>) =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
      },
    },
  }) as unknown as Parameters<typeof selectIsRpcFailoverEnabled>[0];

describe('selectIsRpcFailoverEnabled', () => {
  it.each(['enabled', 'forced'])('returns true when the mode is %s', (mode) => {
    const state = createState({ corePlatformRpcFailoverMode: mode });

    expect(selectIsRpcFailoverEnabled(state)).toBe(true);
  });

  it('returns false when the mode is disabled', () => {
    const state = createState({ corePlatformRpcFailoverMode: 'disabled' });

    expect(selectIsRpcFailoverEnabled(state)).toBe(false);
  });

  it('returns true when the flag is absent', () => {
    const state = createState({});

    expect(selectIsRpcFailoverEnabled(state)).toBe(true);
  });

  it('ignores the legacy walletFrameworkRpcFailoverEnabled flag', () => {
    const state = createState({ walletFrameworkRpcFailoverEnabled: false });

    expect(selectIsRpcFailoverEnabled(state)).toBe(true);
  });
});
