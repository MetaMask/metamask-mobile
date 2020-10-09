import React, { Component } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, StyleSheet, Image, Linking, Alert } from 'react-native';
import PropTypes from 'prop-types';
import RevealPrivateCredential from '../../Views/RevealPrivateCredential';
import Logger from '../../../util/Logger';
import { colors, fontStyles } from '../../../styles/common';
import { ScrollView } from 'react-native-gesture-handler';
import Clipboard from '@react-native-community/clipboard';
import { strings } from '../../../../locales/i18n';

// eslint-disable-next-line import/no-commonjs
const metamaskErrorImage = require('../../../images/metamask-error.png');

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	content: {
		paddingHorizontal: 24,
		flex: 1
	},
	header: {
		alignItems: 'center'
	},
	errorImage: {
		width: 50,
		height: 50,
		marginTop: 24
	},
	title: {
		color: colors.black,
		fontSize: 24,
		lineHeight: 34,
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.grey500,
		marginTop: 8,
		...fontStyles.normal
	},
	errorContainer: {
		backgroundColor: colors.red000,
		borderRadius: 8,
		marginTop: 24
	},
	error: {
		color: colors.black,
		padding: 8,
		fontSize: 14,
		lineHeight: 20,
		...fontStyles.normal
	},
	button: {
		marginTop: 24,
		backgroundColor: colors.blue,
		borderRadius: 50,
		padding: 16
	},
	buttonText: {
		color: colors.white,
		textAlign: 'center',
		...fontStyles.normal,
		fontWeight: '500'
	},
	textContainer: {
		marginTop: 24
	},
	text: {
		color: colors.black,
		fontSize: 14,
		...fontStyles.normal,
		lineHeight: 20
	},
	link: {
		color: colors.blue
	}
});

const Fallback = props => (
	<SafeAreaView style={styles.container}>
		<ScrollView style={styles.content}>
			<View style={styles.header}>
				<Image source={metamaskErrorImage} style={styles.errorImage} />
				<Text style={styles.title}>{strings('error_screen.title')}</Text>
				<Text style={styles.subtitle}>{strings('error_screen.subtitle')}</Text>
			</View>
			<View style={styles.errorContainer}>
				<Text style={styles.error}>{props.errorMessage}</Text>
			</View>
			<TouchableOpacity style={styles.button} onPress={props.resetError}>
				<Text style={styles.buttonText}>{strings('error_screen.try_again_button')}</Text>
			</TouchableOpacity>
			<View style={styles.textContainer}>
				<Text style={styles.text}>
					<Text>{strings('error_screen.funds_safe')}</Text>
					{'\n'}
					{'\n'}
					<Text>{strings('error_screen.submit_ticket_1')}</Text>
					{'\n'}
					{'\n'}
					<Text>{strings('error_screen.submit_ticket_2')}</Text>
					{'\n'}
					<Text>
						{strings('error_screen.submit_ticket_3')}{' '}
						<Text onPress={props.copyErrorToClipboard} style={styles.link}>
							{strings('error_screen.submit_ticket_4')}
						</Text>{' '}
						{strings('error_screen.submit_ticket_5')}
					</Text>
					{'\n'}
					<Text>
						{strings('error_screen.submit_ticket_6')}{' '}
						<Text onPress={props.openTicket} style={styles.link}>
							{strings('error_screen.submit_ticket_7')}
						</Text>{' '}
						{strings('error_screen.submit_ticket_8')}
					</Text>
					{'\n'}
					{'\n'}
					<Text>
						{strings('error_screen.save_seedphrase_1')}{' '}
						<Text onPress={props.showExportSeedphrase} style={styles.link}>
							{strings('error_screen.save_seedphrase_2')}
						</Text>{' '}
						{strings('error_screen.save_seedphrase_3')}
					</Text>
				</Text>
			</View>
		</ScrollView>
	</SafeAreaView>
);

Fallback.propTypes = {
	errorMessage: PropTypes.string,
	resetError: PropTypes.func,
	showExportSeedphrase: PropTypes.func,
	copyErrorToClipboard: PropTypes.func,
	openTicket: PropTypes.func
};

class ErrorBoundary extends Component {
	state = { error: null };

	static propTypes = {
		children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
		view: PropTypes.string.isRequired
	};

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, errorInfo) {
		Logger.error(error, { ...errorInfo, view: this.props.view });
		console.log(error, { view: this.props.view, ...errorInfo });
	}

	resetError = () => {
		this.setState({ error: null });
	};

	showExportSeedphrase = () => {
		this.setState({ backupSeedphrase: true });
	};

	cancelExportSeedphrase = () => {
		this.setState({ backupSeedphrase: false });
	};

	getErrorMessage = () => `View: ${this.props.view}\n${this.state.error.toString()}`;

	copyErrorToClipboard = async () => {
		await Clipboard.setString(this.getErrorMessage());
		Alert.alert('Copied to clipboard', '', [{ text: 'OK' }], {
			cancelable: true
		});
	};

	openTicket = () => {
		const url = 'https://metamask.zendesk.com/hc/en-us/requests/new';
		Linking.openURL(url);
	};

	render() {
		return this.state.backupSeedphrase ? (
			<RevealPrivateCredential privateCredentialName={'seed_phrase'} cancel={this.cancelExportSeedphrase} />
		) : this.state.error ? (
			<Fallback
				errorMessage={this.getErrorMessage()}
				resetError={this.resetError}
				showExportSeedphrase={this.showExportSeedphrase}
				copyErrorToClipboard={this.copyErrorToClipboard}
				openTicket={this.openTicket}
			/>
		) : (
			this.props.children
		);
	}
}

export default ErrorBoundary;
