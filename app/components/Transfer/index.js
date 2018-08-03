import React, { Component } from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';
import getNavbar from '../Navbar';

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

export default class Transfer extends Component {
	static navigationOptions = ({ navigation }) => getNavbar('Transfer', navigation);

	render() {
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<Text style={styles.text}>COMING SOON...</Text>
			</LinearGradient>
		);
	}
}
