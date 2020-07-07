import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Switch, Alert, ActivityIndicator, Text, View, TextInput, SafeAreaView, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button from 'react-native-button';
import Engine from '../../../core/Engine';
import StyledButton from '../../UI/StyledButton';
import AnimatedFox from 'react-native-animated-fox';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStep from '../../../actions/wizard';
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 20
	},
	foxWrapper: {
		justifyContent: 'center',
		alignSelf: 'center',
		width: Device.isIos() ? 130 : 100,
		height: Device.isIos() ? 130 : 100,
		marginTop: 100
	},
	image: {
		alignSelf: 'center',
		width: Device.isIos() ? 130 : 100,
		height: Device.isIos() ? 130 : 100
	},
	title: {
		fontSize: Device.isAndroid() ? 30 : 35,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	field: {
		marginBottom: Device.isAndroid() ? 0 : 10
	},
	label: {
		fontSize: 16,
		marginBottom: Device.isAndroid() ? 0 : 10,
		marginTop: 10
	},
	input: {
		borderWidth: Device.isAndroid() ? 0 : 1,
		borderColor: colors.grey100,
		padding: 10,
		borderRadius: 4,
		fontSize: Device.isAndroid() ? 15 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20
	},
	footer: {
		marginVertical: 40
	},
	errorMsg: {
		color: colors.red,
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
class Login extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Number of tokens
		 */
		tokensLength: PropTypes.number,
		/**
		 * Number of accounts
		 */
		accountsLength: PropTypes.number,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string
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
		const passcodeDisabled = await AsyncStorage.getItem('@MetaMask:passcodeDisabled');
		if (passcodeDisabled !== 'true' && biometryType) {
			let enabled = true;
			const previouslyDisabled = await AsyncStorage.getItem('@MetaMask:biometryChoiceDisabled');
			if (previouslyDisabled && previouslyDisabled === 'true') {
				enabled = false;
			}
			this.setState({ biometryType, biometryChoice: enabled });
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
					await AsyncStorage.setItem('@MetaMask:biometryChoiceDisabled', 'true');
					await AsyncStorage.setItem('@MetaMask:passcodeDisabled', 'true');
				} else {
					await AsyncStorage.setItem('@MetaMask:biometryChoice', this.state.biometryType);
					await AsyncStorage.removeItem('@MetaMask:biometryChoiceDisabled');
					await AsyncStorage.removeItem('@MetaMask:passcodeDisabled');
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

			// Get onboarding wizard state
			const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
			// Check if user passed through metrics opt-in screen
			const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
			if (!metricsOptIn) {
				this.props.navigation.navigate('OptinMetrics');
			} else if (onboardingWizard) {
				this.props.navigation.navigate('HomeNav');
			} else {
				this.props.setOnboardingWizardStep(1);
				this.props.navigation.navigate('HomeNav', {}, NavigationActions.navigate({ routeName: 'WalletView' }));
			}
		} catch (error) {
			// Should we force people to enable passcode / biometrics?
			if (error.toString().toLowerCase() === WRONG_PASSWORD_ERROR.toLowerCase()) {
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
			const { tokensLength, accountsLength, networkType } = this.props;
			Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.AUTHENTICATION_INCORRECT_PASSWORD, {
				numberOfTokens: tokensLength,
				numberOfAccounts: accountsLength,
				network: networkType
			});
		}
	};

	onPressGoBack = () => {
		this.props.navigation.navigate(
			'OnboardingRootNav',
			{},
			NavigationActions.navigate({ routeName: 'Onboarding' })
		);
	};

	updateBiometryChoice = async biometryChoice => {
		if (!biometryChoice) {
			await AsyncStorage.setItem('@MetaMask:biometryChoiceDisabled', 'true');
		} else {
			await AsyncStorage.removeItem('@MetaMask:biometryChoiceDisabled');
		}
		this.setState({ biometryChoice });
	};

	renderSwitch = () => {
		if (this.state.biometryType) {
			return (
				<View style={styles.biometrics}>
					<Text style={styles.biometryLabel}>
						{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
					</Text>
					<Switch
						onValueChange={biometryChoice => this.updateBiometryChoice(biometryChoice)} // eslint-disable-line react/jsx-no-bind
						value={this.state.biometryChoice}
						style={styles.biometrySwitch}
						trackColor={Device.isIos() ? { true: colors.green300, false: colors.grey300 } : null}
						ios_backgroundColor={colors.grey300}
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
					trackColor={Device.isIos() ? { true: colors.green300, false: colors.grey300 } : null}
					ios_backgroundColor={colors.grey300}
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
						{Device.isAndroid() ? (
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
							testID={'login-password-input'}
							value={this.state.password}
							onChangeText={this.setPassword}
							secureTextEntry
							placeholder={''}
							placeholderTextColor={colors.grey100}
							underlineColorAndroid={colors.grey100}
							onSubmitEditing={this.onLogin}
							returnKeyType={'done'}
							autoCapitalize="none"
						/>
					</View>

					{this.renderSwitch()}

					{!!this.state.error && (
						<Text style={styles.errorMsg} testID={'invalid-password-error'}>
							{this.state.error}
						</Text>
					)}

					<View style={styles.ctaWrapper} testID={'log-in-button'}>
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
			<FadeOutOverlay />
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Login);
