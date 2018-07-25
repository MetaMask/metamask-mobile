import React, { Component } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import initBackground from 'metamask-core';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.slate
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
