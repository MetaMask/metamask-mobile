import React, { Component } from 'react';
import initBackground from 'metamask-core';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	}
});

export default class Wallet extends Component {
	state = {
		rate: null
	};

	async componentDidMount() {
		this.controller = await initBackground();
		this.init();
	}

	init() {
		// Example of how to interact with the MM controller
		const API = this.controller.getApi();
		API.setCurrentCurrency('usd', (error, rate) => {
			this.setState({ rate: rate.conversionRate });
		});
	}

	renderRate() {
		if (this.state.rate) {
			return <Text>ETH RATE: ${this.state.rate}</Text>;
		}
		return <ActivityIndicator size="small" />;
	}

	render() {
		return <View style={styles.wrapper}>{this.renderRate()}</View>;
	}
}
