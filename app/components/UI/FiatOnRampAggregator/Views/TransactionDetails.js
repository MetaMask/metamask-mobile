import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import StyledButton from '../../StyledButton';
import { useNavigation } from '@react-navigation/native';
import TransactionDetail from '../components/TransactionDetails';
import PropTypes from 'prop-types';
import Account from '../components/Account';
import { strings } from '../../../../../locales/i18n';
import { makeOrderIdSelector } from '../../../../reducers/fiatOrders';
import { useSelector, connect } from 'react-redux';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';

const styles = StyleSheet.create({
	screenLayout: {
		paddingTop: 0,
	},
});

const TransactionDetails = ({ route, provider, frequentRpcList }) => {
	const orderById = useSelector(makeOrderIdSelector(route.params.orderId));
	const order = orderById;

	const { colors } = useTheme();
	const navigation = useNavigation();

	useEffect(() => {
		navigation.setOptions(
			getFiatOnRampAggNavbar(
				navigation,
				{ title: strings('fiat_on_ramp_aggregator.transaction.details_main'), showBack: false },
				colors
			)
		);
	}, [colors, navigation]);

	const handleMakeAnotherPurchase = useCallback(() => {
		navigation.navigate('PaymentMethod');
	}, [navigation]);

	return (
		<ScreenLayout>
			<ScreenLayout.Header>
				<Account />
			</ScreenLayout.Header>
			<ScreenLayout.Body>
				<ScreenLayout.Content style={styles.screenLayout}>
					<TransactionDetail order={order} provider={provider} frequentRpcList={frequentRpcList} />
				</ScreenLayout.Content>
			</ScreenLayout.Body>
			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<View>
						<StyledButton type="confirm" onPress={handleMakeAnotherPurchase}>
							{strings('fiat_on_ramp_aggregator.transaction.another_purchase')}
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

TransactionDetails.propTypes = {
	/**
	 * Object that represents the current route info like params passed to it
	 */
	route: PropTypes.object,
	/**
	 * Current Network provider
	 */
	provider: PropTypes.object,
	/**
	 * Frequent RPC list from PreferencesController
	 */
	frequentRpcList: PropTypes.array,
};

const mapStateToProps = (state) => ({
	provider: state.engine.backgroundState.NetworkController.provider,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
});
export default connect(mapStateToProps)(TransactionDetails);
