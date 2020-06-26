import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import Device from '../../../util/Device';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { renderNumber } from '../../../util/number';

import { createPendingOrder, FIAT_ORDER_STATES, FIAT_ORDER_PROVIDERS } from '../../../reducers/fiatOrders';
import useInterval from './hooks/useInterval';
import processOrder from './orderProcessor';

import Text from '../../Base/Text';
import { colors } from '../../../styles/common';

/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

const POLLING_TIME = 10000;
const NOTIFICATION_DURATION = 5000;
const SHOW_DEBUG = false;

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

const styles = StyleSheet.create({
	bottomView: {
		padding: 10,
		paddingBottom: 20,
		backgroundColor: colors.grey000
	}
});

function FiatOrders({ orders, selectedAddress, network, createFakeOrder, clearOrders, dispatch }) {
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
		pendingOrders.length ? POLLING_TIME : null
	);

	const onPressAdd = useCallback(() => createFakeOrder(selectedAddress, network), [
		createFakeOrder,
		selectedAddress,
		network
	]);

	if (!SHOW_DEBUG) {
		return null;
	}

	return (
		<View style={styles.bottomView}>
			<Text centered>
				<Text>Pending: {pendingOrders.length}</Text> <Text>Total: {orders.length}</Text>
			</Text>
			<Text centered>
				<Text onPress={onPressAdd}>Add</Text> <Text onPress={clearOrders}>Clear</Text>{' '}
				<Text>Network: {network}</Text>
			</Text>
		</View>
	);
}

FiatOrders.propTypes = {
	orders: PropTypes.array,
	selectedAddress: PropTypes.string,
	network: PropTypes.string,
	createFakeOrder: PropTypes.func,
	clearOrders: PropTypes.func,
	dispatch: PropTypes.func
};

const mapStateToProps = state => ({
	orders: state.fiatOrders.orders,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	network: state.engine.backgroundState.NetworkController.network
});

const mapDispatchToProps = (dispatch, ownProps) => ({
	createFakeOrder: (address, network) =>
		dispatch({
			type: 'FIAT_ADD_ORDER',
			payload: createPendingOrder(
				Math.random(),
				FIAT_ORDER_PROVIDERS.TRANSAK,
				0.3,
				1,
				'USD',
				address,
				network,
				{}
			)
		}),
	clearOrders: () => dispatch({ type: 'FIAT_RESET' }),
	dispatch
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(FiatOrders);
