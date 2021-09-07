import React, { useEffect } from 'react';
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

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
});

function ActivityView({ hasOrders, ...props }) {
	const navigation = useNavigation();

	useEffect(
		() => {
			navigation.setParams({ hasOrders });
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[hasOrders]
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

ActivityView.navigationOptions = ({ navigation, route }) => {
	const title = route.params?.hasOrders ?? false ? 'activity_view.title' : 'transactions_view.title';
	return getNavbarOptions(title, navigation);
};

const mapStateToProps = (state) => ({
	hasOrders: getHasOrders(state),
});

export default connect(mapStateToProps)(ActivityView);
