import React, { useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { connect } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getHasOrders } from '../../../reducers/fiatOrders';
import getNavbarOptions from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import TabBar from '../../Base/TabBar';
import { strings } from '../../../../locales/i18n';
import FiatOrdersView from '../FiatOrdersView';
import ErrorBoundary from '../ErrorBoundary';
import { DrawerContext } from '../../Nav/Main/MainNavigator';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
});

function ActivityView({ hasOrders }) {
	const { drawerRef } = useContext(DrawerContext);
	const navigation = useNavigation();

	useEffect(
		() => {
			const title = hasOrders ?? false ? 'activity_view.title' : 'transactions_view.title';
			navigation.setOptions(getNavbarOptions(title, false, drawerRef));
		},
		/* eslint-disable-next-line */
		[navigation, hasOrders]
	);

	return (
		<ErrorBoundary view="ActivityView">
			<View style={styles.wrapper}>
				<ScrollableTabView
					renderTabBar={hasOrders && TabBar}
					locked={!hasOrders}
					page={!hasOrders ? 0 : undefined}
				>
					<TransactionsView tabLabel={strings('transactions_view.title')} />
					{hasOrders && <FiatOrdersView tabLabel={strings('fiat_on_ramp.purchases')} />}
				</ScrollableTabView>
			</View>
		</ErrorBoundary>
	);
}

ActivityView.defaultProps = {
	hasOrders: false,
};

ActivityView.propTypes = {
	hasOrders: PropTypes.bool,
};

const mapStateToProps = (state) => ({
	hasOrders: getHasOrders(state),
});

export default connect(mapStateToProps)(ActivityView);
