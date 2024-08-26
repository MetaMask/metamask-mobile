import reducer, {
  getFeatureFlags,
  getFeatureFlagsSuccess,
  getFeatureFlagsError,
  initialState,
} from './index';

describe('featureFlags slice', () => {
  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle getFeatureFlags', () => {
    const nextState = reducer(initialState, getFeatureFlags());
    expect(nextState).toEqual({
      ...initialState,
      loading: true,
      error: null,
    });
  });

  it('should handle getFeatureFlagsSuccess', () => {
    const featureFlags = [{ id: 1, name: 'feature1' }];
    const nextState = reducer(
      initialState,
      getFeatureFlagsSuccess(featureFlags),
    );
    expect(nextState).toEqual({
      ...initialState,
      featureFlags,
      loading: false,
      error: null,
    });
  });

  it('should handle getFeatureFlagsError', () => {
    const error = 'Failed to fetch feature flags';
    const nextState = reducer(initialState, getFeatureFlagsError(error));
    expect(nextState).toEqual({
      ...initialState,
      loading: false,
      error,
    });
  });
});
