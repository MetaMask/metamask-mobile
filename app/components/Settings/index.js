import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Button, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { util } from 'gaba';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	}
});

/**
 * View that contains all the different
 * app settings
 */
class Settings extends Component {
	static navigationOptions = {
		title: 'Settings',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		 * Object that contains the whole background state
		 */
		backgroundState: PropTypes.object
	};

	changeNetwork(type) {
		Engine.api.network.setProviderType(type);
	}

	render() {
		const { currencyRate, network, blockHistory, networkStatus } = this.props.backgroundState;

		return (
			<View style={styles.wrapper}>
				<Text>Wallet</Text>
				<Text>ETH: ${currencyRate.conversionRate}</Text>
				<Text>NETWORK CODE: {network.network}</Text>
				<Text>NETWORK NAME: {network.provider.type}</Text>
				<Text>STATUS: {networkStatus.networkStatus.infura[network.provider.type]}</Text>
				<Text>
					BLOCK:{' '}
					{blockHistory.recentBlocks &&
						blockHistory.recentBlocks.length &&
						parseInt(blockHistory.recentBlocks[0].number, 16)}
				</Text>
				<Text>GAS PRICE: {parseInt(util.getGasPrice(blockHistory.recentBlocks), 16)}</Text>
				<Button
					title="MAINNET"
					onPress={() => {
						// eslint-disable-line react/jsx-no-bind
						this.changeNetwork('mainnet');
					}}
				/>
				<Button
					title="RINKEBY"
					onPress={() => {
						// eslint-disable-line react/jsx-no-bind
						this.changeNetwork('rinkeby');
					}}
				/>
				<Button
					title="ROPSTEN"
					onPress={() => {
						// eslint-disable-line react/jsx-no-bind
						this.changeNetwork('ropsten');
					}}
				/>
			</View>
		);
	}
}

const mapStateToProps = state => ({ backgroundState: state.backgroundState });
export default connect(mapStateToProps)(Settings);
