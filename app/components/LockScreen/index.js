import React, { Component } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0
	},
	image: {
		width: 100,
		height: 100
	}
});

const foxImage = require('../../images/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * Main view component for the Lock screen
 */
export default class LockScreen extends Component {
	render() {
		return (
			<View style={styles.wrapper} testID={'lock-screen'}>
				<Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
			</View>
		);
	}
}
