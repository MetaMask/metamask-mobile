import React, {
	// useEffect,
	useCallback
} from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { connect } from 'react-redux';

import Text from './components/Text';

import { createPendingOrder, FIAT_ORDER_STATES, FIAT_ORDER_PROVIDERS } from '../../../reducers/fiatOrders';
import useInterval from './hooks/useInterval';
import processOrder from './orderProcessor';
import { colors } from '../../../styles/common';
import NotificationManager from '../../../core/NotificationManager';

const POLLING_TIME = 10000;
const NOTIFICATION_DURATION = 5000;
const SHOW_DEBUG = true;

const styles = StyleSheet.create({
	bottomView: {
		padding: 10,
		paddingBottom: 20,
		backgroundColor: colors.grey000
	}
});

/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

/**
 * @param {FiatOrder} fiatOrder
 */
const getNotificationDetails = fiatOrder => {
	switch (fiatOrder.state) {
		case FIAT_ORDER_STATES.FAILED: {
			return { title: 'Your purchase failed', description: 'Failed :(', status: 'error' };
		}
		case FIAT_ORDER_STATES.CANCELLED: {
			return { title: 'Your purchase was cancelled', description: 'Cancelled :(', status: 'cancelled' };
		}
		case FIAT_ORDER_STATES.COMPLETED: {
			return {
				title: `Your purchase of ${fiatOrder.cryptoAmount} ${fiatOrder.cryptocurrency} successful`,
				description: `Your ${fiatOrder.cryptocurrency} is now available`,
				status: 'success'
			};
		}
		case FIAT_ORDER_STATES.PENDING:
		default: {
			return {
				title: `Processing purchase of ${fiatOrder.currency}`,
				description: 'Your deposit is in progress',
				status: 'pending'
			};
		}
	}
};

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
					if (updatedOrder.state !== order.state) {
						// console.log(`Order updated:`, order.provider, order.id);
						dispatch({ type: 'FIAT_UPDATE_ORDER', payload: updatedOrder });
						InteractionManager.runAfterInteractions(() =>
							NotificationManager.showSimpleNotification({
								duration: NOTIFICATION_DURATION,
								...getNotificationDetails(updatedOrder)
							})
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
