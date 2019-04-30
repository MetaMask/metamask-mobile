import React, { Component } from 'react';
import { View, SafeAreaView, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles, colors } from '../../../styles/common';
import ActionView from '../../UI/ActionView';
import AsyncStorage from '@react-native-community/async-storage';
import AntIcon from 'react-native-vector-icons/AntDesign';
import { getOptinMetricsNavbarOptions } from '../Navbar';

const styles = StyleSheet.create({
	root: {
		...baseStyles.flexGrow
	},
	checkIcon: {
		color: colors.green500
	},
	crossIcon: {
		color: colors.red
	},
	icon: {
		marginRight: 5
	},
	action: {
		flex: 0,
		flexDirection: 'row',
		paddingVertical: 10,
		alignItems: 'center'
	},
	title: {
		...fontStyles.bold,
		fontSize: 22
	},
	description: {
		...fontStyles.normal,
		flex: 1
	},
	content: {
		...fontStyles.normal,
		fontSize: 16,
		paddingVertical: 20
	},
	wrapper: {
		margin: 20
	}
});

/**
 * View that is displayed in the flow to agree to metrics
 */
export default class OptinMetrics extends Component {
	static navigationOptions = () => getOptinMetricsNavbarOptions();

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object
	};

	actionsList = [
		{
			action: 0,
			description: 'Always allow you to opt-out via Settings'
		},
		{
			action: 0,
			description: 'Send anonymied click & pageview events'
		},
		{
			action: 0,
			description: 'Maintain a public aggregate dashboard to educate the community'
		},
		{
			action: 1,
			description: 'Never collect keys, addresses, transactions, balances, hashes, or any personal information'
		},
		{
			action: 1,
			description: 'Never collect your IP address ??'
		},
		{
			action: 1,
			description: 'Never sell data for profit. Ever!'
		}
	];

	renderAction = ({ action, description }, i) => (
		<View style={styles.action} key={i}>
			{action === 0 ? (
				<AntIcon name="check" size={24} style={[styles.icon, styles.checkIcon]} />
			) : (
				<AntIcon name="close" size={24} style={[styles.icon, styles.crossIcon]} />
			)}
			<Text style={styles.description}>{description}</Text>
		</View>
	);

	onCancel = () => {
		const { navigation } = this.props;
		navigation.navigate('HomeNav');
	};

	onConfirm = async () => {
		const { navigation } = this.props;
		await AsyncStorage.setItem('@MetaMask:metricsAgreed', 'agreed');
		navigation.navigate('HomeNav');
	};

	render() {
		return (
			<SafeAreaView style={styles.root}>
				<ActionView
					cancelText={'No, Thanks'}
					confirmText={'I Agree'}
					onCancelPress={this.onCancel}
					onConfirmPress={this.onConfirm}
					confirmButtonMode={'confirm'}
				>
					<View style={styles.wrapper}>
						<Text style={styles.title}>Help us improve MetaMask</Text>
						<Text style={styles.content}>bla bla bla</Text>
						{this.actionsList.map((action, i) => this.renderAction(action, i))}
					</View>
				</ActionView>
			</SafeAreaView>
		);
	}
}
