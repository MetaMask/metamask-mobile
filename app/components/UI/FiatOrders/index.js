import React, {
	// useEffect,
	useCallback
} from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Text } from 'react-native';
import useInterval from './hooks/useInterval';

import { createPendingOrder, FIAT_ORDER_STATES, FIAT_ORDER_PROVIDERS } from '../../../reducers/fiatOrders';
import processOrder from './orderProcessor';

function FiatOrders({ orders, selectedAddress, network, createFakeOrder, clearOrders, dispatch }) {
	// console.log(orders);

	// Pending orders depend on selectedAddress and selectedNetworks
	const pendingOrders = orders.filter(
		order =>
			order.account === selectedAddress && order.network === network && order.state === FIAT_ORDER_STATES.PENDING
	); // selectedAddress

	// console.log(pendingOrders);

	// useEffect(() => {
	// 	console.log('cdM!');
	// 	console.log('orders', orders);
	// 	console.log('pending', pendingOrders);
	// 	return () => console.log('cWU!');
	// }, [selectedAddress, network, orders, pendingOrders]);

	useInterval(
		async () => {
			await Promise.all(
				pendingOrders.map(async order => {
					const proccesed = await processOrder(order);
					// Check if status has changed
					dispatch({ type: 'FIAT_UPDATE_ORDER', payload: proccesed });
					// dispatch(showTransactionNotification({}));
				})
			);
		},
		pendingOrders.length ? 2000 : null
	);

	const onPressAdd = useCallback(() => createFakeOrder(selectedAddress, network), [
		createFakeOrder,
		selectedAddress,
		network
	]);

	return (
		<Text>
			<Text onPress={onPressAdd}>Add</Text>;<Text onPress={clearOrders}>Clear</Text>;
			<Text>network:{network}</Text>
		</Text>
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
