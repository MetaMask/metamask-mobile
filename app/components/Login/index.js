import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, ScrollView, Text, View, TextInput, StyleSheet, Platform, Image } from 'react-native';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Button from 'react-native-button';
import StyledButton from '../StyledButton';

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.concrete,
		flex: 1,
		padding: 20
	},
	logoWrapper: {
		marginTop: 100,
		justifyContent: 'center',
		alignItems: 'center'
	},
	image: {
		width: 100,
		height: 100
	},
	title: {
		fontSize: Platform.OS === 'android' ? 30 : 35,
		marginTop: 20,
		marginBottom: 20,
		color: colors.title,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	field: {
		marginBottom: Platform.OS === 'android' ? 0 : 10
	},
	label: {
		fontSize: 16,
		marginBottom: Platform.OS === 'android' ? 0 : 10,
		marginTop: 10
	},
	input: {
		borderWidth: Platform.OS === 'android' ? 0 : 1,
		borderColor: colors.borderColor,
		padding: 10,
		borderRadius: 4,
		fontSize: Platform.OS === 'android' ? 15 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20
	},
	footer: {
		marginTop: 40
	},
	errorMsg: {
		color: colors.error,
		...fontStyles.normal
	},
	seed: {
		color: colors.fontSecondary,
		...fontStyles.normal
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where returning users can authenticate
 */
export default class Login extends Component {
	static propTypes = {
		/**
		 * Function that will be called once the form is submitted
		 */
		onLogin: PropTypes.func,
		/**
		 * Boolean that lets the view know if the parent is doing any processing
		 * and if that's the case, show a spinner
		 */
		loading: PropTypes.bool,
		/**
		 * String that contains any error message
		 */
		error: PropTypes.string,
		/**
		 * Function that will display the import from seed view
		 */
		toggleImportFromSeed: PropTypes.func
	};

	state = {
		password: '',
		confirmPassword: '',
		biometryType: null,
		biometryChoice: false
	};

	mounted = true;

	componentDidMount() {
		Keychain.getSupportedBiometryType().then(biometryType => {
			this.mounted && this.setState({ biometryType, biometryChoice: true });
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onLogin = async () => {
		try {
			const authOptions = {
				accessControl: this.state.biometryChoice
					? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
				accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
				authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
			};
			await Keychain.setGenericPassword('metamask-user', this.state.password, authOptions);
			this.props.onLogin(this.state.password);
		} catch (error) {
			if (error.toString() === PASSCODE_NOT_SET_ERROR) {
				// No keychain access
				this.props.onLogin(this.state.password);
			}
		}
	};

	onPressImport = () => this.props.toggleImportFromSeed();

	setPassword = val => this.setState({ password: val });

	render() {
		return (
			<Screen>
				<ScrollView style={styles.wrapper}>
					<View testID={'login'}>
						<View style={styles.logoWrapper}>
							<Image
								source={require('../../images/fox.png')}
								style={styles.image}
								resizeMethod={'auto'}
							/>
						</View>
						<Text style={styles.title}>{strings('login.title')}</Text>
						<View style={styles.field}>
							<Text style={styles.label}>{strings('login.password')}</Text>
							<TextInput
								style={styles.input}
								value={this.state.password}
								onChangeText={this.setPassword}
								secureTextEntry
								placeholder={''}
								underlineColorAndroid={colors.borderColor}
								onSubmitEditing={this.onLogin}
							/>
						</View>
						{this.props.error && <Text style={styles.errorMsg}>{this.props.error}</Text>}
						<View style={styles.ctaWrapper}>
							<StyledButton type={'orange'} onPress={this.onLogin}>
								{this.props.loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									strings('login.login_button')
								)}
							</StyledButton>
						</View>

						<View style={styles.footer}>
							<Button style={styles.seed} onPress={this.onPressImport}>
								{strings('login.import_with_seed_phrase')}
							</Button>
						</View>
					</View>
				</ScrollView>
			</Screen>
		);
	}
}
