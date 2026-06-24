import initialRootState, {
  backgroundState,
} from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useDepositFeatureFlags from './useDepositFeatureFlags';

const mockedFeatures = {
  metamaskUsdEnabled: true,
  newFeatureFlag: false,
  anotherFeatureFlag: true,
};

function mockInitialState(
  features: Record<string, boolean | null> = mockedFeatures,
) {
  return {
    ...initialRootState,
    engine: {
      backgroundState: {
        ...backgroundState,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            depositConfig: {
              features,
            },
          },
        },
      },
    },
  };
}

describe('useDepositFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the feature flags from deposit config', () => {
    const { result } = renderHookWithProvider(() => useDepositFeatureFlags(), {
      state: mockInitialState(),
    });

    expect(result.current).toBe(mockedFeatures);
  });
});
