import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { updateBgState } from '../../../../core/redux/slices/engine';
import Engine from '../../../../core/Engine';
import { usePredictLegacyDeposit } from './usePredictLegacyDeposit';

jest.mock('../../../../core/Engine', () => ({
  state: {},
}));

const KALSHI_ONLY = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

const stateWith = (predictConfig?: typeof KALSHI_ONLY) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      RemoteFeatureFlagController: {
        ...backgroundState.RemoteFeatureFlagController,
        remoteFeatureFlags: {
          ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
          predictConfig,
        },
      },
    },
  },
});

describe('usePredictLegacyDeposit', () => {
  it('is available while Polymarket is active', () => {
    const { result } = renderHookWithProvider(() => usePredictLegacyDeposit(), {
      state: stateWith(undefined),
    });

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isAvailableNow()).toBe(true);
  });

  it('is unavailable while Kalshi is active', () => {
    const { result } = renderHookWithProvider(() => usePredictLegacyDeposit(), {
      state: stateWith(KALSHI_ONLY),
    });

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isAvailableNow()).toBe(false);
  });

  it('re-checks the store when called, not the render that returned it', () => {
    const { result, store } = renderHookWithProvider(
      () => usePredictLegacyDeposit(),
      { state: stateWith(undefined) },
    );
    const { isAvailableNow } = result.current;

    act(() => {
      (Engine as unknown as { state: Record<string, unknown> }).state = {
        RemoteFeatureFlagController:
          stateWith(KALSHI_ONLY).engine.backgroundState
            .RemoteFeatureFlagController,
      };
      store.dispatch(updateBgState({ key: 'RemoteFeatureFlagController' }));
    });

    expect(isAvailableNow()).toBe(false);
    expect(result.current.isAvailable).toBe(false);
  });
});
