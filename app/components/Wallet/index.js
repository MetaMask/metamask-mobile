import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	}
});

/**
 * Wallet component
 */
export default class Wallet extends Component {
	render() {
		return (
			<View style={styles.wrapper}>
				<Text>Wallet</Text>
			</View>
		);
	}
}
