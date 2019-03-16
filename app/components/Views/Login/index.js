import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	Switch,
	Alert,
	ActivityIndicator,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet,
	Platform,
	Image
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button from 'react-native-button';
import Engine from '../../../core/Engine';
import StyledButton from '../../UI/StyledButton';
import AnimatedFox from 'react-native-animated-fox';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 100
	},
	foxWrapper: {
		justifyContent: 'center',
		alignSelf: 'center',
		width: Platform.OS === 'ios' ? 130 : 100,
		height: Platform.OS === 'ios' ? 130 : 100
	},
	image: {
		alignSelf: 'center',
		width: Platform.OS === 'ios' ? 130 : 100,
		height: Platform.OS === 'ios' ? 130 : 100
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
		marginVertical: 40
	},
	errorMsg: {
		color: colors.error,
		...fontStyles.normal
	},
	goBack: {
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	biometrics: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 20,
		marginBottom: 30
	},
	biometryLabel: {
		flex: 1,
		fontSize: 16,
		...fontStyles.normal
	},
	biometrySwitch: {
		flex: 0
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';

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
		biometryType: null,
		rememberMe: false,
		biometryChoice: false,
		loading: false,
		error: null
	};

	mounted = true;

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			this.setState({ biometryType, biometryChoice: true });
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onLogin = async () => {
		if (this.state.loading) return;
		try {
			this.setState({ loading: true });
			const { KeyringController } = Engine.context;

			// Restore vault with user entered password
			await KeyringController.submitPassword(this.state.password);

			if (this.state.biometryType) {
				const authOptions = {
					accessControl: this.state.biometryChoice
						? SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
						: SecureKeychain.ACCESS_CONTROL.DEVICE_PASSCODE
				};

				await SecureKeychain.setGenericPassword('metamask-user', this.state.password, authOptions);

				if (!this.state.biometryChoice) {
					await AsyncStorage.removeItem('@MetaMask:biometryChoice');
				} else {
					await AsyncStorage.setItem('@MetaMask:biometryChoice', this.state.biometryType);
				}
			} else {
				if (this.state.rememberMe) {
					await SecureKeychain.setGenericPassword('metamask-user', this.state.password, {
						accessControl: SecureKeychain.ACCESS_CONTROL.WHEN_UNLOCKED_THIS_DEVICE_ONLY
					});
				} else {
					await SecureKeychain.resetGenericPassword();
				}
				await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			}

			this.setState({ loading: false });
			this.props.navigation.navigate('HomeNav');
		} catch (error) {
			// Should we force people to enable passcode / biometrics?
			if (error.toString() === WRONG_PASSWORD_ERROR) {
				this.setState({ loading: false, error: strings('login.invalid_password') });
			} else if (error.toString() === PASSCODE_NOT_SET_ERROR) {
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

	renderSwitch = () => {
		if (this.state.biometryType) {
			return (
				<View style={styles.biometrics}>
					<Text style={styles.biometryLabel}>
						{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
					</Text>
					<Switch
						onValueChange={biometryChoice => this.setState({ biometryChoice })} // eslint-disable-line react/jsx-no-bind
						value={this.state.biometryChoice}
						style={styles.biometrySwitch}
						trackColor={
							Platform.OS === 'ios' ? { true: colors.switchOnColor, false: colors.switchOffColor } : null
						}
						ios_backgroundColor={colors.switchOffColor}
					/>
				</View>
			);
		}

		return (
			<View style={styles.biometrics}>
				<Text style={styles.biometryLabel}>{strings(`choose_password.remember_me`)}</Text>
				<Switch
					onValueChange={rememberMe => this.setState({ rememberMe })} // eslint-disable-line react/jsx-no-bind
					value={this.state.rememberMe}
					style={styles.biometrySwitch}
					trackColor={
						Platform.OS === 'ios' ? { true: colors.switchOnColor, false: colors.switchOffColor } : null
					}
					ios_backgroundColor={colors.switchOffColor}
				/>
			</View>
		);
	};

	setPassword = val => this.setState({ password: val });

	render = () => (
		<SafeAreaView style={styles.mainWrapper}>
			<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
				<View testID={'login'}>
					<View style={styles.foxWrapper}>
						{Platform.OS === 'android' ? (
							<Image
								source={require('../../../images/fox.png')}
								style={styles.image}
								resizeMethod={'auto'}
							/>
						) : (
							<AnimatedFox />
						)}
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
							autoCapitalize="none"
						/>
					</View>

					{this.renderSwitch()}

					{this.state.error && <Text style={styles.errorMsg}>{this.state.error}</Text>}

					<View style={styles.ctaWrapper}>
						<StyledButton type={'confirm'} onPress={this.onLogin}>
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
		</SafeAreaView>
	);
}
