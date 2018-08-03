import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { util } from 'gaba';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	}
});

export default class Settings extends Component {
	static propTypes = {
		/**
		 * Instance of a core engine object
		 */
		screenProps: PropTypes.object.isRequired
	};

	static navigationOptions = {
		title: 'Settings',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	componentDidMount() {
		// This is a brute-force way to refresh the wallet anytime the
		// datamodel changes for demonstration purposes. We should probably
		// link the datamodel to redux and go that route instead.
		this.props.screenProps.engine.datamodel.subscribe(() => {
			this.forceUpdate();
		});
	}

	changeNetwork(type) {
		this.props.screenProps.engine.api.network.setProviderType(type);
	}

	render() {
		const {
			engine: {
				datamodel: { state }
			}
		} = this.props.screenProps;

		return (
			<View style={styles.wrapper}>
				<Text>Wallet</Text>
				<Text>ETH: ${state.currencyRate.conversionRate}</Text>
				<Text>NETWORK CODE: {state.network.network}</Text>
				<Text>NETWORK NAME: {state.network.provider.type}</Text>
				<Text>STATUS: {state.networkStatus.networkStatus.infura[state.network.provider.type]}</Text>
				<Text>BLOCK: {parseInt(state.blockHistory.recentBlocks[0].number, 16)}</Text>
				<Text>GAS PRICE: {parseInt(util.getGasPrice(state.blockHistory.recentBlocks), 16)}</Text>
				<Button
					title="MAINNET"
					onPress={() => {
						this.changeNetwork('mainnet');
					}}
				/>
				<Button
					title="RINKEBY"
					onPress={() => {
						this.changeNetwork('rinkeby');
					}}
				/>
				<Button
					title="ROPSTEN"
					onPress={() => {
						this.changeNetwork('ropsten');
					}}
				/>
			</View>
		);
	}
}
