import React, { Component } from 'react';
import Screen from '../Screen';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center'
	},
	image: {
		width: 100,
		height: 100
	}
});

/**
 * Main view component for the Lock screen
 */
export default class LockScreen extends Component {
	render() {
		return (
			<Screen>
				<View style={styles.wrapper} testID={'lock-screen'}>
					<Image source={require('../../images/fox.png')} style={styles.image} resizeMethod={'auto'} />
				</View>
			</Screen>
		);
	}
}
