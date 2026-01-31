import migrate, { migrationVersion } from './115';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockCaptureException = captureException as jest.MockedFunction<
  typeof captureException
>;

const createValidState = (
  remoteFeatureFlagControllerState: Record<string, unknown> = {},
) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        cacheTimestamp: 1234567890000,
        remoteFeatureFlags: {},
        rawRemoteFeatureFlags: {},
        localOverrides: {},
        ...remoteFeatureFlagControllerState,
      },
    },
  },
});

describe(`Migration ${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns state unchanged if state is invalid', async () => {
    const invalidState = null;
    const result = await migrate(invalidState);
    expect(result).toBe(invalidState);
  });

  it('returns state unchanged if engine is missing', async () => {
    const invalidState = { foo: 'bar' };
    const result = await migrate(invalidState);
    expect(result).toStrictEqual(invalidState);
  });

  it('returns state unchanged if RemoteFeatureFlagController is missing', async () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const result = await migrate(state);
    expect(result).toStrictEqual(state);
    // Should not capture exception - this is expected for old versions
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged and captures exception if RemoteFeatureFlagController is not an object', async () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: 'invalid-string',
        },
      },
    };
    const result = await migrate(state);
    expect(result).toStrictEqual(state);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Invalid RemoteFeatureFlagController state: 'string'",
        ),
      }),
    );
  });

  it('resets cacheTimestamp to 0', async () => {
    const originalTimestamp = 1234567890000;
    const state = createValidState({
      cacheTimestamp: originalTimestamp,
    });

    const result = await migrate(state);

    expect(
      (result as typeof state).engine.backgroundState
        .RemoteFeatureFlagController.cacheTimestamp,
    ).toBe(0);
  });

  it('preserves other RemoteFeatureFlagController state properties', async () => {
    const remoteFeatureFlags = {
      trendingTokens: { enabled: true, minimumVersion: '7.64.0' },
      someOtherFlag: true,
    };
    const rawRemoteFeatureFlags = { raw: 'data' };
    const localOverrides = { overrideFlag: true };

    const state = createValidState({
      cacheTimestamp: 1234567890000,
      remoteFeatureFlags,
      rawRemoteFeatureFlags,
      localOverrides,
    });

    const result = await migrate(state);

    const resultController = (result as typeof state).engine.backgroundState
      .RemoteFeatureFlagController;
    expect(resultController.cacheTimestamp).toBe(0);
    expect(resultController.remoteFeatureFlags).toStrictEqual(
      remoteFeatureFlags,
    );
    expect(resultController.rawRemoteFeatureFlags).toStrictEqual(
      rawRemoteFeatureFlags,
    );
    expect(resultController.localOverrides).toStrictEqual(localOverrides);
  });

  it('handles missing cacheTimestamp gracefully', async () => {
    const state = createValidState({
      cacheTimestamp: undefined,
    });

    const result = await migrate(state);

    // Should set it to 0 even if it was undefined
    expect(
      (result as typeof state).engine.backgroundState
        .RemoteFeatureFlagController.cacheTimestamp,
    ).toBe(0);
  });

  it('handles cacheTimestamp of 0 (already reset)', async () => {
    const state = createValidState({
      cacheTimestamp: 0,
    });

    const result = await migrate(state);

    expect(
      (result as typeof state).engine.backgroundState
        .RemoteFeatureFlagController.cacheTimestamp,
    ).toBe(0);
  });

  it('handles empty RemoteFeatureFlagController object', async () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {} as { cacheTimestamp?: number },
        },
      },
    };

    const result = await migrate(state);

    expect(
      (result as typeof state).engine.backgroundState
        .RemoteFeatureFlagController.cacheTimestamp,
    ).toBe(0);
  });

  it('does not modify other backgroundState controllers', async () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            cacheTimestamp: 1234567890000,
            remoteFeatureFlags: {},
          },
          NetworkController: {
            providerConfig: { chainId: '0x1' },
          },
          PreferencesController: {
            selectedAddress: '0x123',
          },
        },
      },
    };

    const result = await migrate(state);

    expect(
      (result as typeof state).engine.backgroundState.NetworkController,
    ).toStrictEqual({
      providerConfig: { chainId: '0x1' },
    });
    expect(
      (result as typeof state).engine.backgroundState.PreferencesController,
    ).toStrictEqual({
      selectedAddress: '0x123',
    });
  });
});
