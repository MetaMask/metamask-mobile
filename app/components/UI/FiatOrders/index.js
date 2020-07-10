import PropTypes from 'prop-types';
import { InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { renderNumber } from '../../../util/number';

import { FIAT_ORDER_STATES } from '../../../reducers/fiatOrders';
import useInterval from './hooks/useInterval';
import processOrder from './orderProcessor';

/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
const NOTIFICATION_DURATION = 5000;

export const allowedToBuy = network => network === '1' || (network === '42' && Device.isIos());

const baseNotificationDetails = {
	duration: NOTIFICATION_DURATION
};

/**
 * @param {FiatOrder} fiatOrder
 */
export const getNotificationDetails = fiatOrder => {
	switch (fiatOrder.state) {
		case FIAT_ORDER_STATES.FAILED: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_failed_title', {
					currency: fiatOrder.cryptocurrency
				}),
				status: 'error'
			};
		}
		case FIAT_ORDER_STATES.CANCELLED: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_cancelled_title'),
				status: 'cancelled'
			};
		}
		case FIAT_ORDER_STATES.COMPLETED: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_completed_title', {
					amount: renderNumber(String(fiatOrder.cryptoAmount)),
					currency: fiatOrder.cryptocurrency
				}),
				description: strings('fiat_on_ramp.notifications.purchase_completed_description', {
					currency: fiatOrder.cryptocurrency
				}),
				status: 'success'
			};
		}
		case FIAT_ORDER_STATES.PENDING:
		default: {
			return {
				...baseNotificationDetails,
				title: strings('fiat_on_ramp.notifications.purchase_pending_title', {
					currency: fiatOrder.cryptocurrency
				}),
				description: strings('fiat_on_ramp.notifications.purchase_pending_description'),
				status: 'pending'
			};
		}
	}
};

function FiatOrders({ orders, selectedAddress, network, dispatch }) {
	// Pending orders depend on selectedAddress and selectedNetworks

	const pendingOrders = orders.filter(
		order =>
			order.account === selectedAddress && order.network === network && order.state === FIAT_ORDER_STATES.PENDING
	);

	useInterval(
		async () => {
			await Promise.all(
				pendingOrders.map(async order => {
					const updatedOrder = await processOrder(order);
					dispatch({ type: 'FIAT_UPDATE_ORDER', payload: updatedOrder });
					if (updatedOrder.state !== order.state) {
						InteractionManager.runAfterInteractions(() =>
							NotificationManager.showSimpleNotification(getNotificationDetails(updatedOrder))
						);
					}
				})
			);
		},
		pendingOrders.length ? POLLING_FREQUENCY : null
	);

	return null;
}

FiatOrders.propTypes = {
	orders: PropTypes.array,
	selectedAddress: PropTypes.string,
	network: PropTypes.string,
	dispatch: PropTypes.func
};

const mapStateToProps = state => ({
	orders: state.fiatOrders.orders,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(FiatOrders);
