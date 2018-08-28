import React, { Component } from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fontStyles } from '../../styles/common';
import getNavbarOptions from '../Navbar';
import { strings } from '../../../locales/i18n';

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

/**
 * View that wraps the whole Transfer Tab.
 * Which includes send and receive
 */
export default class Transfer extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions(strings('transfer.title'), navigation);

	render() {
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<Text style={styles.text}>COMING SOON...</Text>
			</LinearGradient>
		);
	}
}
