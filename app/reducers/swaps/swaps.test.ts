import reducer, {
  initialState,
  SWAPS_SET_LIVENESS,
  SWAPS_SET_HAS_ONBOARDED,
} from './index';

const emptyAction = { type: null };

describe('swaps reducer', () => {
  it('should return initial state', () => {
    const state = reducer(undefined, emptyAction);
    expect(state).toEqual(initialState);
  });

  it('should set liveness', () => {
    const initalState = reducer(undefined, emptyAction);
    const notLiveState = reducer(initalState, {
      type: SWAPS_SET_LIVENESS,
      payload: { live: false, chainId: 1 },
    });
    expect(notLiveState['1'].isLive).toBe(false);
    const liveState = reducer(initalState, {
      type: SWAPS_SET_LIVENESS,
      payload: { live: true, chainId: 1 },
    });
    expect(liveState['1'].isLive).toBe(true);
  });

  it('should set has onboarded', () => {
    const initalState = reducer(undefined, emptyAction);
    const notOnboardedState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: false,
    });
    expect(notOnboardedState.hasOnboarded).toBe(false);
    const liveState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: true,
    });
    expect(liveState.hasOnboarded).toBe(true);
  });
});
