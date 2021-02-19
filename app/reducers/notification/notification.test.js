import reducer, { ACTIONS, initialState } from './index';
import notificationTypes from '../../util/notifications';
const { TRANSACTION, SIMPLE } = notificationTypes;

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

	it('should show simple notification', () => {
		const state = reducer(undefined, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(0) });
		expect(state.notifications.length).toEqual(1);
		expect(state.notifications[0].type).toEqual(SIMPLE);
		expect(state.notifications[0].id).toEqual(simpleNotification(0).id);

		const state2 = reducer(state, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(1) });
		expect(state2.notifications.length).toEqual(2);
		expect(state2.notifications[1].type).toEqual(SIMPLE);
		expect(state2.notifications[1].id).toEqual(simpleNotification(1).id);
	});

	it('should show transaction notification', () => {
		const state = reducer(undefined, { type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION, ...txNotification(0) });
		expect(state.notifications.length).toEqual(1);
		expect(state.notifications[0].type).toEqual(TRANSACTION);
		expect(state.notifications[0].id).toEqual(txNotification(0).transaction.id);

		const state2 = reducer(state, { type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION, ...txNotification(1) });
		expect(state2.notifications.length).toEqual(2);
		expect(state2.notifications[1].type).toEqual(TRANSACTION);
		expect(state2.notifications[1].id).toEqual(txNotification(1).transaction.id);
	});

	it('should show simple and transaction notifications', () => {
		const state = reducer(undefined, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(0) });
		expect(state.notifications.length).toEqual(1);
		expect(state.notifications[0].type).toEqual(SIMPLE);
		expect(state.notifications[0].id).toEqual(simpleNotification(0).id);

		const state2 = reducer(state, { type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION, ...txNotification(1) });
		expect(state2.notifications.length).toEqual(2);
		expect(state2.notifications[1].type).toEqual(TRANSACTION);
		expect(state2.notifications[1].id).toEqual(txNotification(1).transaction.id);
	});

	describe('actions', () => {
		let stateWithNotifications;

		beforeEach(() => {
			stateWithNotifications = [
				state => reducer(state, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(0) }),
				state => reducer(state, { type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION, ...txNotification(1) }),
				state => reducer(state, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(1) }),
				state => reducer(state, { type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION, ...txNotification(2) }),
				state => reducer(state, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(2) }),
				state => reducer(state, { type: ACTIONS.SHOW_SIMPLE_NOTIFICATION, ...simpleNotification(3) })
			].reduce((acc, current) => current(acc), undefined);
		});

		it('should hide current notification', () => {
			const state = reducer(stateWithNotifications, { type: ACTIONS.HIDE_CURRENT_NOTIFICATION });
			expect(state.notifications[0].isVisible).toBe(false);
		});

		it('should hide notification by id', () => {
			const id = txNotification(2).transaction.id;
			const state = reducer(stateWithNotifications, {
				type: ACTIONS.HIDE_NOTIFICATION_BY_ID,
				id
			});
			const notification = state.notifications.find(notification => notification.id === id);
			expect(notification.isVisible).toBe(false);
		});

		it.todo('MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION');
		it.todo('MODIFY_OR_SHOW_SIMPLE_NOTIFICATION');
		it.todo('REPLACE_NOTIFICATION_BY_ID');
		it.todo('REMOVE_NOTIFICATION_BY_ID');
		it.todo('REMOVE_CURRENT_NOTIFICATION');
	});
});
