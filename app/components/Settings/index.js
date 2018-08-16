import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Button, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
import { persistor } from '../../store';

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
		const { NetworkController } = Engine.context;
		NetworkController.setProviderType(type);
	}

	mainnet = () => {
		this.changeNetwork('mainnet');
	};

	rinkeby = () => {
		this.changeNetwork('rinkeby');
	};

	ropsten = () => {
		this.changeNetwork('ropsten');
	};

	logout = () => {
		persistor.purge();
	};

	render() {
		const { CurrencyRateController, NetworkController, NetworkStatusController } = this.props.backgroundState;

		return (
			<View style={styles.wrapper}>
				<Text>Wallet</Text>
				<Text>ETH: ${CurrencyRateController.conversionRate}</Text>
				<Text>NETWORK CODE: {NetworkController.network}</Text>
				<Text>NETWORK NAME: {NetworkController.provider.type}</Text>
				<Text>STATUS: {NetworkStatusController.networkStatus.infura[NetworkController.provider.type]}</Text>
				<Button title="MAINNET" onPress={this.mainnet} />
				<Button title="RINKEBY" onPress={this.rinkeby} />
				<Button title="ROPSTEN" onPress={this.ropsten} />

				<Button title="Logout" onPress={this.logout} />
			</View>
		);
	}
}

const mapStateToProps = state => ({ backgroundState: state.backgroundState });
export default connect(mapStateToProps)(Settings);
