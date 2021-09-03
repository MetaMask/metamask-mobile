import React, { PureComponent } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';

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
		right: 0,
	},
	image: {
		width: 100,
		height: 100,
	},
});

const foxImage = require('../../../images/fox.png'); // eslint-disable-line import/no-commonjs

/**
 * View component that displays the MetaMask fox
 * in the middle of the screen
 */
export default class FoxScreen extends PureComponent {
	render = () => (
		<View style={styles.wrapper} testID={'fox-screen'}>
			<Image source={foxImage} style={styles.image} resizeMethod={'auto'} />
		</View>
	);
}
