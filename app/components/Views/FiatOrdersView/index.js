import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, FlatList, TouchableHighlight } from 'react-native';
import Modal from 'react-native-modal';
import { connect } from 'react-redux';
import { getOrders } from '../../../reducers/fiatOrders';

import { colors } from '../../../styles/common';
import ModalHandler from '../../Base/ModalHandler';
import OrderListItem from './OrderListItem';
import OrderDetails from './OrderDetails';

/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */
const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
	row: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
	},
});

const keyExtractor = (item) => item.id;

/**
 *
 * @param {object} data
 * @param {FiatOrder} data.item
 */
const renderItem = ({ item }) => (
	<ModalHandler>
		{({ isVisible, toggleModal }) => (
			<>
				<TouchableHighlight
					style={styles.row}
					onPress={toggleModal}
					underlayColor={colors.grey000}
					activeOpacity={1}
				>
					<OrderListItem order={item} />
				</TouchableHighlight>

				<Modal
					isVisible={isVisible}
					onBackdropPress={toggleModal}
					onBackButtonPress={toggleModal}
					onSwipeComplete={toggleModal}
					swipeDirection="down"
				>
					<OrderDetails order={item} closeModal={toggleModal} />
				</Modal>
			</>
		)}
	</ModalHandler>
);

renderItem.propTypes = {
	item: PropTypes.object,
};

function FiatOrdersView({ orders, ...props }) {
	return (
		<View style={styles.wrapper}>
			<FlatList data={orders} renderItem={renderItem} keyExtractor={keyExtractor} />
		</View>
	);
}

FiatOrdersView.propTypes = {
	orders: PropTypes.array,
};

const mapStateToProps = (state) => ({
	orders: getOrders(state),
});

export default connect(mapStateToProps)(FiatOrdersView);
