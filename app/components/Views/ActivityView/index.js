import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useSelector } from 'react-redux';
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

function ActivityView() {
	const navigation = useNavigation();
	const hasOrders = useSelector((state) => getHasOrders(state)) || false;
	const { drawerRef } = useContext(DrawerContext);

	useEffect(() => {
		const title = hasOrders ?? false ? 'activity_view.title' : 'transactions_view.title';
		navigation.setOptions(getNavbarOptions(title, false, drawerRef));
	}, [navigation, hasOrders]);

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

ActivityView.propTypes = {
	hasOrders: PropTypes.bool,
};

export default ActivityView;
