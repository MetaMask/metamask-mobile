import React, { Component } from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	},
	text: {
		fontSize: 20,
		color: colors.fontSecondary,
		...fontStyles.normal
	}
});

export default class Settings extends Component {
	static navigationOptions = {
		title: 'Settings',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	render() {
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<Text style={styles.text}>COMING SOON...</Text>
			</LinearGradient>
		);
	}
}
