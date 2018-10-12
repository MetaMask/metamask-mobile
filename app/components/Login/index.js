import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Alert, ActivityIndicator, Text, View, TextInput, StyleSheet, Platform, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Button from 'react-native-button';
import Engine from '../../core/Engine';
import StyledButton from '../StyledButton';

import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
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
	goBack: {
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
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	state = {
		password: '',
		confirmPassword: '',
		biometryType: null,
		biometryChoice: false,
		loading: false,
		error: null
	};

	mounted = true;

	componentWillUnmount() {
		this.mounted = false;
	}

	onLogin = async () => {
		try {
			const biometryType = await Keychain.getSupportedBiometryType();
			if (biometryType) {
				this.setState({ biometryType, biometryChoice: true });
			}
			const authOptions = {
				accessControl: this.state.biometryChoice
					? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
				accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
				authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
			};
			await Keychain.setGenericPassword('metamask-user', this.state.password, authOptions);
			const { KeyringController } = Engine.context;

			// Restore vault with user entered password
			await KeyringController.submitPassword(this.state.password);
			this.setState({ loading: false });
			this.props.navigation.navigate('HomeNav');
		} catch (error) {
			// Should we force people to enable passcode / biometrics?
			if (error.toString() === PASSCODE_NOT_SET_ERROR) {
				Alert.alert(
					'Security Alert',
					'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)'
				);
				this.setState({ loading: false });
			} else {
				this.setState({ loading: false, error: error.toString() });
			}
		}
	};

	onPressGoBack = () => {
		this.props.navigation.navigate('OnboardingRootNav');
	};

	setPassword = val => this.setState({ password: val });

	render() {
		return (
			<Screen>
				<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
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
								returnKeyType={'done'}
							/>
						</View>
						{this.state.error && <Text style={styles.errorMsg}>{this.state.error}</Text>}
						<View style={styles.ctaWrapper}>
							<StyledButton type={'orange'} onPress={this.onLogin}>
								{this.state.loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									strings('login.login_button')
								)}
							</StyledButton>
						</View>

						<View style={styles.footer}>
							<Button style={styles.goBack} onPress={this.onPressGoBack}>
								{strings('login.go_back')}
							</Button>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</Screen>
		);
	}
}
