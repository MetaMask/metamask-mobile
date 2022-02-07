import React from 'react';
import PropTypes from 'prop-types';
import { Text, View, StyleSheet } from 'react-native';
import StyledButton from '../../StyledButton';
import ScreenView from '../../FiatOrders/components/ScreenView';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	button: {
		flex: 1,
		width: 200,
	},
});

const AmountToBuy = ({ navigation }) => (
	<ScreenView center>
		<Text center>Amount to Buy</Text>
		<Text>You want to buy: ETH</Text>
		<Text>Amount: $100 USD</Text>

		<View style={styles.container}>
			<StyledButton type={'confirm'} style={styles.button} onPress={() => navigation.navigate('GetQuotes')}>
				{strings('fiat_on_ramp_aggregator.get_quotes')}
			</StyledButton>
		</View>
	</ScreenView>
);

AmountToBuy.navigationOptions = ({ navigation, route }) => ({
	title: strings('fiat_on_ramp_aggregator.amount_to_buy'),
});

AmountToBuy.propTypes = {
	navigation: PropTypes.object,
};

export default AmountToBuy;
