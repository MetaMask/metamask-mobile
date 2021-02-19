import reducer, { ACTIONS, initialState } from './index';

const emptyAction = { type: null };

const simpleNotification = number => ({
	id: `simple${number}`,
	status: `simple${number} status`,
	duration: 5000,
	title: `Simple Notification ${number}`,
	description: `Simple Notification ${number} description}`
});

const txNotification = number => ({
	transaction: { id: `tx${number}` },
	status: `tx${number} status`,
	duration: 5000,
	title: `Transaction Notification ${number}`,
	description: `Transaction Notification ${number} description}`
});

describe('notifications reducer', () => {
	it('should return initial state', () => {
		const state = reducer(undefined, emptyAction);
		expect(state).toEqual(initialState);
	});

	it('should not mutate current state', () => {
		expect(() => {
			'use strict';
			const state = reducer(undefined, emptyAction);
			Object.freeze(state.notifications);
			const state2 = reducer(state, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(1) });
			Object.freeze(state2.notifications);
			const state3 = reducer(state2, { type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION, ...txNotification(1) });
			Object.freeze(state3.notifications);
			reducer(state3, { type: ACTIONS.REMOVE_CURRENT_NOTIFICATION });
			// TODO: cover all actions
		}).not.toThrow();
	});
});
