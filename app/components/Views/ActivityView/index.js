import React, { useEffect, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { connect } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getHasOrders } from '../../../reducers/fiatOrders';
import getNavbarOptions from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import { strings } from '../../../../locales/i18n';
import FiatOrdersView from '../FiatOrdersView';
import ErrorBoundary from '../ErrorBoundary';
import { DrawerContext } from '../../Nav/Main/MainNavigator';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import { fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
	},
});

const createTabBarStyles = (colors) =>
	StyleSheet.create({
		tabUnderlineStyle: {
			height: 2,
			backgroundColor: colors.primary.default,
		},
		tabStyle: {
			paddingVertical: 8,
		},
		textStyle: {
			...fontStyles.normal,
			fontSize: 14,
		},
	});

function ActivityView({ hasOrders }) {
	const { drawerRef } = useContext(DrawerContext);
	const { colors } = useAppThemeFromContext() || mockTheme;
	const tabBarStyles = createTabBarStyles(colors);
	const navigation = useNavigation();

	useEffect(
		() => {
			const title = hasOrders ?? false ? 'activity_view.title' : 'transactions_view.title';
			navigation.setOptions(getNavbarOptions(title, false, drawerRef, colors));
		},
		/* eslint-disable-next-line */
		[navigation, hasOrders, colors]
	);

	const TabBar = useMemo(
		() => (props) =>
			(
				<DefaultTabBar
					underlineStyle={tabBarStyles.tabUnderlineStyle}
					activeTextColor={colors.primary.default}
					inactiveTextColor={colors.text.muted}
					backgroundColor={colors.background.default}
					tabStyle={tabBarStyles.tabStyle}
					textStyle={tabBarStyles.textStyle}
					{...props}
				/>
			),
		[colors, tabBarStyles]
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
