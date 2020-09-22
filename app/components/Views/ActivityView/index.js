import React, { useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { connect } from 'react-redux';
import { NavigationContext } from 'react-navigation';
import { getHasOrders } from '../../../reducers/fiatOrders';

import getNavbarOptions from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import TabBar from '../../Base/TabBar';
import { strings } from '../../../../locales/i18n';
import FiatOrdersView from '../FiatOrdersView';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1
	}
});

function ActivityView({ hasOrders, ...props }) {
	const navigation = useContext(NavigationContext);

	useEffect(
		() => {
			navigation.setParams({ hasOrders });
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[hasOrders]
	);

	return (
		<View style={styles.wrapper}>
			<ScrollableTabView renderTabBar={hasOrders && TabBar} locked={!hasOrders} page={!hasOrders ? 0 : undefined}>
				<TransactionsView tabLabel={strings('transactions_view.title')} />
				{hasOrders && <FiatOrdersView tabLabel={strings('fiat_on_ramp.purchases')} />}
			</ScrollableTabView>
		</View>
	);
}

ActivityView.defaultProps = {
	hasOrders: false
};

ActivityView.propTypes = {
	hasOrders: PropTypes.bool
};

ActivityView.navigationOptions = ({ navigation }) => {
	const title = navigation.getParam('hasOrders', false) ? 'activity_view.title' : 'transactions_view.title';
	return getNavbarOptions(title, navigation);
};

const mapStateToProps = state => {
	const orders = state.fiatOrders.orders;
	const selectedAddress = state.engine.backgroundState.PreferencesController.selectedAddress;
	const network = state.engine.backgroundState.NetworkController.network;
	return {
		hasOrders: getHasOrders(orders, selectedAddress, network)
	};
};

export default connect(mapStateToProps)(ActivityView);
