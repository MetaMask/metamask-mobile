import reducer, { initialState, SWAPS_SET_LIVENESS } from './index';

const emptyAction = { type: null };

describe('swaps reducer', () => {
	it('sould return initial state', () => {
		const state = reducer(undefined, emptyAction);
		expect(state).toEqual(initialState);
	});

	it('sould set liveness', () => {
		const initalState = reducer(undefined, emptyAction);
		const notLiveState = reducer(initalState, { type: SWAPS_SET_LIVENESS, payload: false });
		expect(notLiveState.isLive).toBe(false);
		const liveState = reducer(initalState, { type: SWAPS_SET_LIVENESS, payload: true });
		expect(liveState.isLive).toBe(true);
	});
});
