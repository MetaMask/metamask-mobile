import reducer, { initialState } from './index';

const emptyAction = { type: null };

describe('swaps reducer', () => {
	it('sould return initial state', () => {
		const state = reducer(undefined, emptyAction);
		expect(state).toEqual(initialState);
	});
});
