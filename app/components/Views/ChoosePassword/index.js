import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	CheckBox,
	Switch,
	ActivityIndicator,
	Alert,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet,
	Linking,
	Image
} from 'react-native';
import AnimatedFox from 'react-native-animated-fox';
import Logger from '../../../util/Logger';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import { passwordSet, passwordUnset } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import Device from '../../../util/Device';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import SecureKeychain from '../../../core/SecureKeychain';
import Icon from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import OnboardingProgress from '../../UI/OnboardingProgress';
import zxcvbn from 'zxcvbn';

const steps = [strings('choose_password.title'), strings('choose_password.secure'), strings('choose_password.confirm')];

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 20,
		paddingBottom: 20
	},
	loadingWrapper: {
		paddingHorizontal: 40,
		paddingBottom: 30,
		alignItems: 'center',
		flex: 1
	},
	foxWrapper: {
		width: Device.isIos() ? 90 : 80,
		height: Device.isIos() ? 90 : 80,
		marginTop: 30,
		marginBottom: 30
	},
	content: {
		textAlign: 'center',
		alignItems: 'center'
	},
	title: {
		fontSize: 24,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.normal
	},
	subtitle: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
		justifyContent: 'center'
	},
	checkboxContainer: {
		marginTop: 10,
		marginHorizontal: 10,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row'
	},
	label: {
		fontSize: 14,
		color: colors.black,
		paddingHorizontal: 10
	},
	learnMore: {
		color: colors.blue,
		textDecorationLine: 'underline',
		textDecorationColor: colors.blue
	},
	field: {
		position: 'relative'
	},
	input: {
		borderWidth: 1,
		borderColor: colors.grey500,
		padding: 10,
		borderRadius: 6,
		fontSize: Device.isAndroid() ? 14 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20,
		paddingHorizontal: 10
	},
	errorMsg: {
		color: colors.red,
		...fontStyles.normal
	},
	biometrics: {
		position: 'relative',
		marginVertical: 20
	},
	biometryLabel: {
		fontSize: 14,
		color: colors.fontPrimary
	},
	biometricsContainer: {
		display: 'none',
		borderWidth: 10,
		borderColor: colors.red
	},
	biometrySwitch: {
		position: 'absolute',
		top: 0,
		right: 0
	},
	hintLabel: {
		height: 20,
		marginTop: 14,
		fontSize: 12,
		color: colors.grey700,
		textAlign: 'left',
		...fontStyles.normal
	},
	showPassword: {
		position: 'absolute',
		top: 0,
		right: 0
	},
	// eslint-disable-next-line react-native/no-unused-styles
	strength_weak: {
		color: colors.red
	},
	// eslint-disable-next-line react-native/no-unused-styles
	strength_good: {
		color: colors.blue
	},
	// eslint-disable-next-line react-native/no-unused-styles
	strength_strong: {
		color: colors.green300
	},
	showMatchingPasswords: {
		position: 'absolute',
		top: 50,
		right: 17,
		alignSelf: 'flex-end'
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set their password for the first time
 */
class ChoosePassword extends PureComponent {
	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * The action to update the password set flag
		 * in the redux store
		 */
		passwordSet: PropTypes.func,
		/**
		 * The action to update the password set flag
		 * in the redux store to false
		 */
		passwordUnset: PropTypes.func,
		/**
		 * The action to update the lock time
		 * in the redux store
		 */
		setLockTime: PropTypes.func,
		/**
		 * A string representing the selected address => account
		 */
		selectedAddress: PropTypes.string
	};

	state = {
		isSelected: false,
		password: '',
		confirmPassword: '',
		secureTextEntry: true,
		biometryType: null,
		biometryChoice: false,
		rememberMe: false,
		labelsScaleNew: new Animated.Value(1),
		labelsScaleConfirm: new Animated.Value(1),
		loading: false,
		error: null
	};

	mounted = true;

	confirmPasswordInput = React.createRef();
	// Flag to know if password in keyring was set or not
	keyringControllerPasswordSet = false;

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			this.setState({ biometryType, biometryChoice: true });
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	setSelection = () => {
		const { isSelected } = this.state;
		this.setState(() => ({ isSelected: !isSelected }));
	};

	onPressCreate = async () => {
		const { loading, isSelected, password, confirmPassword } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const canSubmit = passwordsMatch && isSelected;

		if (!canSubmit) return;
		if (loading) return;
		if (password.length < 8) {
			Alert.alert('Error', strings('choose_password.password_length_error'));
			return;
		} else if (password !== confirmPassword) {
			Alert.alert('Error', strings('choose_password.password_dont_match'));
			return;
		}
		try {
			this.setState({ loading: true });

			const existing = await AsyncStorage.getItem('@MetaMask:existingUser');
			if (!existing) {
				// if user does not exist createNewVaultAndKeychain with password
				const { KeyringController } = Engine.context;
				await Engine.resetState();
				await KeyringController.createNewVaultAndKeychain(password);
				this.keyringControllerPasswordSet = true;
				await SecureKeychain.setGenericPassword('metamask-user', password);
				await AsyncStorage.removeItem('@MetaMask:biometryChoice');
				await AsyncStorage.removeItem('@MetaMask:nextMakerReminder');
				await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			} else {
				// else recreateVault with password like we did previously
				await this.recreateVault(password);
			}

			// Set state in app as it was with password
			if (this.state.biometryType && this.state.biometryChoice) {
				const authOptions = {
					accessControl: SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
				};
				await SecureKeychain.setGenericPassword('metamask-user', password, authOptions);
				// If the user enables biometrics, we're trying to read the password
				// immediately so we get the permission prompt
				if (Device.isIos()) {
					await SecureKeychain.getGenericPassword();
				}
				await AsyncStorage.setItem('@MetaMask:biometryChoice', this.state.biometryType);
				await AsyncStorage.removeItem('@MetaMask:biometryChoiceDisabled');
				await AsyncStorage.removeItem('@MetaMask:passcodeDisabled');
			} else {
				if (this.state.rememberMe) {
					await SecureKeychain.setGenericPassword('metamask-user', password, {
						accessControl: SecureKeychain.ACCESS_CONTROL.WHEN_UNLOCKED_THIS_DEVICE_ONLY
					});
				} else {
					await SecureKeychain.resetGenericPassword();
				}
				await AsyncStorage.removeItem('@MetaMask:biometryChoice');
				await AsyncStorage.setItem('@MetaMask:biometryChoiceDisabled', 'true');
				await AsyncStorage.setItem('@MetaMask:passcodeDisabled', 'true');
			}
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			this.props.passwordSet();
			this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);

			this.setState({ loading: false });
			const seed = await this.getSeedPhrase();
			this.props.navigation.navigate('AccountBackupStep1', { words: seed.split(' ') });
		} catch (error) {
			await this.recreateVault('');
			// Set state in app as it was with no password
			await SecureKeychain.setGenericPassword('metamask-user', '');
			await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			await AsyncStorage.removeItem('@MetaMask:nextMakerReminder');
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			this.props.passwordUnset();
			this.props.setLockTime(-1);
			// Should we force people to enable passcode / biometrics?
			if (error.toString() === PASSCODE_NOT_SET_ERROR) {
				Alert.alert(
					strings('choose_password.security_alert_title'),
					strings('choose_password.security_alert_message')
				);
				this.setState({ loading: false });
			} else {
				this.setState({ loading: false, error: error.toString() });
			}
		}
	};

	/**
	 * Recreates a vault
	 *
	 * @param password - Password to recreate and set the vault with
	 */
	recreateVault = async password => {
		const { KeyringController, PreferencesController } = Engine.context;
		const seedPhrase = await this.getSeedPhrase();
		// Recreate keyring with password given to this method
		await KeyringController.createNewVaultAndRestore(password, seedPhrase);
		// Keyring is set with empty password or not
		this.keyringControllerPasswordSet = password !== '';

		// Get props to restore vault
		const hdKeyring = KeyringController.state.keyrings[0];
		const existingAccountCount = hdKeyring.accounts.length;
		const preferencesControllerState = PreferencesController.state;
		const selectedAddress = this.props.selectedAddress;

		// Create previous accounts again
		for (let i = 0; i < existingAccountCount - 1; i++) {
			await KeyringController.addNewAccount();
		}
		// Set preferencesControllerState again
		await PreferencesController.update(preferencesControllerState);
		// Reselect previous selected account if still available
		if (hdKeyring.accounts.includes(selectedAddress)) {
			PreferencesController.setSelectedAddress(selectedAddress);
		} else {
			PreferencesController.setSelectedAddress(hdKeyring[0]);
		}
	};

	/**
	 * Returns current vault seed phrase
	 * It does it using an empty password or a password set by the user
	 * depending on the state the app is currently in
	 */
	getSeedPhrase = async () => {
		const { KeyringController } = Engine.context;
		const { password } = this.state;
		const keychainPassword = this.keyringControllerPasswordSet ? password : '';
		const mnemonic = await KeyringController.exportSeedPhrase(keychainPassword);
		return JSON.stringify(mnemonic).replace(/"/g, '');
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	getPasswordStrengthWord() {
		// this.state.passwordStrength is calculated by zxcvbn
		// which returns a score based on "entropy to crack time"
		// 0 is the weakest, 4 the strongest
		switch (this.state.passwordStrength) {
			case 0:
				return 'weak';
			case 1:
				return 'weak';
			case 2:
				return 'weak';
			case 3:
				return 'good';
			case 4:
				return 'strong';
		}
	}

	renderSwitch = () => {
		const { biometryType, rememberMe, biometryChoice } = this.state;
		return (
			<View style={styles.biometrics}>
				{biometryType ? (
					<>
						<Text style={styles.biometryLabel}>
							{strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
						</Text>
						<View style={styles.biometricsContainer}>
							<Switch
								onValueChange={biometryChoice => this.setState({ biometryChoice })} // eslint-disable-line react/jsx-no-bind
								value={biometryChoice}
								style={styles.biometrySwitch}
								trackColor={Device.isIos() ? { true: colors.green300, false: colors.grey300 } : null}
								ios_backgroundColor={colors.grey300}
							/>
						</View>
					</>
				) : (
					<>
						<Text style={styles.biometryLabel}>{strings(`choose_password.remember_me`)}</Text>
						<Switch
							onValueChange={rememberMe => this.setState({ rememberMe })} // eslint-disable-line react/jsx-no-bind
							value={rememberMe}
							style={styles.biometrySwitch}
							trackColor={Device.isIos() ? { true: colors.green300, false: colors.grey300 } : null}
							ios_backgroundColor={colors.grey300}
						/>
					</>
				)}
			</View>
		);
	};

	onPasswordChange = val => {
		const passInfo = zxcvbn(val);

		this.setState({ password: val, passwordStrength: passInfo.score });
	};

	toggleShowHide = () => {
		this.setState(state => ({ secureTextEntry: !state.secureTextEntry }));
	};

	learnMore = () => {
		const URL = 'https://metamask.zendesk.com/hc/en-us/articles/360039616872-How-can-I-reset-my-password-';
		return Linking.openURL(URL).catch(error => {
			Logger.log('Error while trying to open external link: ${url}', error);
		});
	};

	render() {
		const { isSelected, password, confirmPassword, secureTextEntry, error, loading } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const canSubmit = passwordsMatch && isSelected;

		return (
			<SafeAreaView style={styles.mainWrapper}>
				{loading ? (
					<View style={styles.loadingWrapper}>
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
						<ActivityIndicator size="large" color={Device.isAndroid() ? colors.blue : colors.grey} />
						<Text style={styles.title}>{strings('create_wallet.title')}</Text>
						<Text style={styles.subtitle}>{strings('create_wallet.subtitle')}</Text>
					</View>
				) : (
					<View style={styles.wrapper} testID={'choose-password-screen'}>
						<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
							<OnboardingProgress steps={steps} />
							<View testID={'create-password-screen'}>
								<View style={styles.content}>
									<Text style={styles.title}>{strings('choose_password.title')}</Text>
									<View style={styles.text}>
										<Text style={styles.subtitle}>{strings('choose_password.subtitle')}</Text>
									</View>
								</View>
								<View style={styles.field}>
									<Text style={styles.hintLabel}>{strings('choose_password.password')}</Text>
									<Text onPress={this.toggleShowHide} style={[styles.hintLabel, styles.showPassword]}>
										{strings(`choose_password.${secureTextEntry ? 'show' : 'hide'}`)}
									</Text>
									<TextInput
										style={styles.input}
										value={password}
										onChangeText={this.onPasswordChange} // eslint-disable-line  react/jsx-no-bind
										secureTextEntry={secureTextEntry}
										placeholder=""
										testID="input-password"
										onSubmitEditing={this.jumpToConfirmPassword}
										returnKeyType="next"
										autoCapitalize="none"
									/>
									{(password !== '' && (
										<Text style={styles.hintLabel}>
											{strings('choose_password.password_strength')}
											<Text style={styles[`strength_${this.getPasswordStrengthWord()}`]}>
												{' '}
												{strings(`choose_password.strength_${this.getPasswordStrengthWord()}`)}
											</Text>
										</Text>
									)) || <Text style={styles.hintLabel} />}
								</View>
								<View style={styles.field}>
									<Text style={styles.hintLabel}>{strings('choose_password.confirm_password')}</Text>
									<TextInput
										ref={this.confirmPasswordInput}
										style={styles.input}
										value={confirmPassword}
										onChangeText={val => this.setState({ confirmPassword: val })} // eslint-disable-line  react/jsx-no-bind
										secureTextEntry={secureTextEntry}
										placeholder={''}
										placeholderTextColor={colors.grey100}
										testID={'input-password-confirm'}
										onSubmitEditing={this.onPressCreate}
										returnKeyType={'done'}
										autoCapitalize="none"
									/>
									<View style={styles.showMatchingPasswords}>
										{passwordsMatch ? (
											<Icon name="check" size={16} color={colors.green300} />
										) : null}
									</View>
									<Text style={styles.hintLabel}>
										{strings('choose_password.must_be_at_least', { number: 8 })}
									</Text>
								</View>
								<View>{this.renderSwitch()}</View>
								<View style={styles.checkboxContainer}>
									<CheckBox
										value={isSelected}
										onValueChange={this.setSelection}
										style={styles.checkbox}
									/>
									<Text style={styles.label}>
										{strings('choose_password.i_understand')}{' '}
										<Text onPress={this.learnMore} style={styles.learnMore}>
											{strings('choose_password.learn_more')}
										</Text>
									</Text>
								</View>

								{!!error && <Text style={styles.errorMsg}>{error}</Text>}
							</View>
						</KeyboardAwareScrollView>
						<View style={styles.ctaWrapper}>
							<StyledButton
								type={'blue'}
								onPress={this.onPressCreate}
								testID={'submit-button'}
								disabled={!canSubmit}
							>
								{strings('choose_password.create_button')}
							</StyledButton>
						</View>
					</View>
				)}
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

const mapDispatchToProps = dispatch => ({
	passwordSet: () => dispatch(passwordSet()),
	passwordUnset: () => dispatch(passwordUnset()),
	setLockTime: time => dispatch(setLockTime(time))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ChoosePassword);
