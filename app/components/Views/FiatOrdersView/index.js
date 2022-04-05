/* eslint-disable react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, FlatList, TouchableHighlight } from 'react-native';
import Modal from 'react-native-modal';
import { connect } from 'react-redux';
import { getOrders } from '../../../reducers/fiatOrders';
import ModalHandler from '../../Base/ModalHandler';
import OrderListItem from './OrderListItem';
import OrderDetails from './OrderDetails';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import TransactionDetails from '../../UI/FiatOnRampAggregator/Views/TransactionDetails';
/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */
const createStyles = (colors) =>
	StyleSheet.create({
		modal: {
			margin: 0,
		},
		wrapper: {
			flex: 1,
			backgroundColor: colors.background.default,
		},
		row: {
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderColor: colors.border.muted,
		},
	});
function FiatOrdersView({ orders, ...props }) {
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);

	const keyExtractor = (item) => item.id;

	/* eslint-disable-next-line */
	const renderItem = ({ item }) => {
		return (
			<ModalHandler>
				{({ isVisible, toggleModal }) => (
					<>
						<TouchableHighlight
							style={styles.row}
							onPress={() => {
								toggleModal();
							}}
							underlayColor={colors.background.alternative}
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
							backdropColor={colors.overlay.default}
							backdropOpacity={1}
							style={item.provider === 'AGGREGATOR' && styles.modal}
						>
							{item.provider === 'AGGREGATOR' ? (
								<TransactionDetails orderId={item.id} />
							) : (
								<OrderDetails order={item} closeModal={toggleModal} />
							)}
						</Modal>
					</>
				)}
			</ModalHandler>
		);
	};

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
