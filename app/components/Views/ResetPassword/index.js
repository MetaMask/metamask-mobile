import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	KeyboardAvoidingView,
	Switch,
	ActivityIndicator,
	Alert,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet,
	ScrollView,
	Image,
	InteractionManager
} from 'react-native';
// eslint-disable-next-line import/no-unresolved
import CheckBox from '@react-native-community/checkbox';
import AnimatedFox from 'react-native-animated-fox';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import { passwordSet, passwordUnset, seedphraseNotBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import Device from '../../../util/Device';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import SecureKeychain from '../../../core/SecureKeychain';
import Icon from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import zxcvbn from 'zxcvbn';
import Logger from '../../../util/Logger';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
	EXISTING_USER,
	NEXT_MAKER_REMINDER,
	BIOMETRY_CHOICE,
	BIOMETRY_CHOICE_DISABLED,
	PASSCODE_DISABLED,
	TRUE
} from '../../../constants/storage';
import { getPasswordStrengthWord, passwordRequirementsMet } from '../../../util/password';
import NotificationManager from '../../../core/NotificationManager';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flexGrow: 1
	},
	confirm_title: {
		fontSize: 32,
		marginTop: 10,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	confirm_input: {
		borderWidth: 2,
		borderRadius: 5,
		width: '100%',
		borderColor: colors.grey000,
		padding: 10,
		height: 40
	},
	confirm_label: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	wrapper: {
		flex: 1,
		marginBottom: 10
	},
	scrollableWrapper: {
		flex: 1,
		paddingHorizontal: 32
	},
	keyboardScrollableWrapper: {
		flexGrow: 1
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
	image: {
		alignSelf: 'center',
		width: 80,
		height: 80
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
		justifyContent: 'center',
		...fontStyles.normal
	},
	checkboxContainer: {
		marginTop: 10,
		marginHorizontal: 10,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row'
	},
	checkbox: {
		width: 18,
		height: 18,
		margin: 10,
		marginTop: -5
	},
	label: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black,
		paddingHorizontal: 10,
		lineHeight: 18
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
		flex: 1,
		marginTop: 20,
		paddingHorizontal: 10
	},
	errorMsg: {
		color: colors.red,
		...fontStyles.normal
	},
	biometrics: {
		position: 'relative',
		marginTop: 20,
		marginBottom: 30
	},
	biometryLabel: {
		fontSize: 14,
		color: colors.fontPrimary,
		position: 'absolute',
		top: 0,
		left: 0
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
		color: colors.grey450,
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
	},
	confirmPasswordWrapper: {
		flex: 1,
		padding: 30,
		paddingTop: 0
	},
	passwordRequiredContent: {
		marginBottom: 20
	},
	buttonWrapper: {
		flex: 1,
		marginTop: 20,
		justifyContent: 'flex-end'
	},
	warningMessageText: {
		paddingVertical: 10,
		color: colors.red,
		...fontStyles.normal
	},
	keyboardAvoidingView: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const RESET_PASSWORD = 'reset_password';
const CONFIRM_PASSWORD = 'confirm_password';

/**
 * View where users can set their password for the first time
 */
class ResetPassword extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('reset_password.title'), navigation);

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
		loading: false,
		error: null,
		inputWidth: { width: '99%' },
		view: RESET_PASSWORD,
		originalPassword: null,
		ready: true
	};

	mounted = true;

	confirmPasswordInput = React.createRef();
	// Flag to know if password in keyring was set or not
	keyringControllerPasswordSet = false;

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();

		this.setState({
			view: CONFIRM_PASSWORD,
			biometryType: biometryType || null,
			biometryChoice: (biometryType && true) || false
		});

		setTimeout(() => {
			this.setState({
				inputWidth: { width: '100%' }
			});
		}, 100);
	}

	componentDidUpdate(prevProps, prevState) {
		const prevLoading = prevState.loading;
		const { loading } = this.state;
		const { navigation } = this.props;
		if (!prevLoading && loading) {
			// update navigationOptions
			navigation.setParams({
				headerLeft: <View />
			});
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	setSelection = () => {
		const { isSelected } = this.state;
		this.setState(() => ({ isSelected: !isSelected }));
	};

	createNewVaultAndKeychain = async password => {
		const { KeyringController } = Engine.context;
		await Engine.resetState();
		await KeyringController.createNewVaultAndKeychain(password);
		this.keyringControllerPasswordSet = true;
	};

	onPressCreate = async () => {
		const { loading, isSelected, password, confirmPassword, originalPassword } = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const canSubmit = passwordsMatch && isSelected;

		if (!canSubmit) return;
		if (loading) return;
		if (!passwordRequirementsMet(password)) {
			Alert.alert('Error', strings('choose_password.password_length_error'));
			return;
		} else if (password !== confirmPassword) {
			Alert.alert('Error', strings('choose_password.password_dont_match'));
			return;
		}
		try {
			this.setState({ loading: true });

			await this.recreateVault(originalPassword);

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
				await AsyncStorage.setItem(BIOMETRY_CHOICE, this.state.biometryType);
				await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
				await AsyncStorage.removeItem(PASSCODE_DISABLED);
			} else {
				if (this.state.rememberMe) {
					await SecureKeychain.setGenericPassword('metamask-user', password, {
						accessControl: SecureKeychain.ACCESS_CONTROL.WHEN_UNLOCKED_THIS_DEVICE_ONLY
					});
				} else {
					await SecureKeychain.resetGenericPassword();
				}
				await AsyncStorage.removeItem(BIOMETRY_CHOICE);
				await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
				await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
			}
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			this.props.passwordSet();
			this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);

			this.setState({ loading: false });
			InteractionManager.runAfterInteractions(() => {
				this.props.navigation.navigate('SecuritySettings');
				NotificationManager.showSimpleNotification({
					status: 'success',
					duration: 5000,
					title: strings('reset_password.password_updated'),
					description: strings('reset_password.successfully_changed')
				});
			});
		} catch (error) {
			await this.recreateVault('');
			// Set state in app as it was with no password
			await SecureKeychain.setGenericPassword('metamask-user', '');
			await AsyncStorage.removeItem(BIOMETRY_CHOICE);
			await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
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
		const { originalPassword, password: newPassword } = this.state;
		const { KeyringController, PreferencesController } = Engine.context;
		const seedPhrase = await this.getSeedPhrase();

		let importedAccounts = [];
		try {
			const keychainPassword = this.keyringControllerPasswordSet ? originalPassword : '';
			// Get imported accounts
			const simpleKeyrings = KeyringController.state.keyrings.filter(
				keyring => keyring.type === 'Simple Key Pair'
			);
			for (let i = 0; i < simpleKeyrings.length; i++) {
				const simpleKeyring = simpleKeyrings[i];
				const simpleKeyringAccounts = await Promise.all(
					simpleKeyring.accounts.map(account => KeyringController.exportAccount(keychainPassword, account))
				);
				importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
			}
		} catch (e) {
			Logger.error(e, 'error while trying to get imported accounts on recreate vault');
		}

		// Recreate keyring with password given to this method
		await KeyringController.createNewVaultAndRestore(newPassword, seedPhrase);
		// Keyring is set with empty password or not
		this.keyringControllerPasswordSet = newPassword !== '';

		// Get props to restore vault
		const hdKeyring = KeyringController.state.keyrings[0];
		const existingAccountCount = hdKeyring.accounts.length;
		const selectedAddress = this.props.selectedAddress;
		let preferencesControllerState = PreferencesController.state;

		// Create previous accounts again
		for (let i = 0; i < existingAccountCount - 1; i++) {
			await KeyringController.addNewAccount();
		}

		try {
			// Import imported accounts again
			for (let i = 0; i < importedAccounts.length; i++) {
				await KeyringController.importAccountWithStrategy('privateKey', [importedAccounts[i]]);
			}
		} catch (e) {
			Logger.error(e, 'error while trying to import accounts on recreate vault');
		}

		// Reset preferencesControllerState
		preferencesControllerState = PreferencesController.state;

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
		const { originalPassword } = this.state;
		const keychainPassword = originalPassword;
		const mnemonic = await KeyringController.exportSeedPhrase(keychainPassword);
		return JSON.stringify(mnemonic).replace(/"/g, '');
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
	};

	renderSwitch = () => {
		const { biometryType, rememberMe, biometryChoice } = this.state;
		return (
			<View style={styles.biometrics}>
				{biometryType ? (
					<>
						<Text style={styles.biometryLabel}>
							{strings(`biometrics.enable_${biometryType.toLowerCase()}`)}
						</Text>
						<View>
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

	tryExportSeedPhrase = async password => {
		// const { originalPassword } = this.state;
		const { KeyringController } = Engine.context;
		await KeyringController.exportSeedPhrase(password);
	};

	tryUnlockWithPassword = async password => {
		this.setState({ ready: false });
		try {
			// Just try
			await this.tryExportSeedPhrase(password);
			this.setState({
				password: null,
				originalPassword: password,
				ready: true,
				view: RESET_PASSWORD
			});
		} catch (e) {
			const msg = strings('reveal_credential.warning_incorrect_password');
			this.setState({
				warningIncorrectPassword: msg,
				ready: true
			});
		}
	};

	tryUnlock = () => {
		const { password } = this.state;
		this.tryUnlockWithPassword(password);
	};

	onPasswordChange = val => {
		const passInfo = zxcvbn(val);

		this.setState({ password: val, passwordStrength: passInfo.score });
	};

	toggleShowHide = () => {
		this.setState(state => ({ secureTextEntry: !state.secureTextEntry }));
	};

	learnMore = () => {
		this.props.navigation.push('Webview', {
			url: 'https://metamask.zendesk.com/hc/en-us/articles/360039616872-How-can-I-reset-my-password-',
			title: 'metamask.zendesk.com'
		});
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	setConfirmPassword = val => this.setState({ confirmPassword: val });

	renderConfirmPassword() {
		const { warningIncorrectPassword } = this.state;
		return (
			<KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={'padding'}>
				<KeyboardAwareScrollView style={baseStyles.flexGrow} enableOnAndroid>
					<View style={styles.confirmPasswordWrapper}>
						<View style={[styles.content, styles.passwordRequiredContent]}>
							<Text style={styles.confirm_title}>{strings('manual_backup_step_1.confirm_password')}</Text>
							<View style={styles.text}>
								<Text style={styles.confirm_label}>
									{strings('manual_backup_step_1.before_continiuing')}
								</Text>
							</View>
							<TextInput
								style={styles.confirm_input}
								placeholder={'Password'}
								placeholderTextColor={colors.grey100}
								onChangeText={this.onPasswordChange}
								secureTextEntry
								onSubmitEditing={this.tryUnlock}
								testID={'private-credential-password-text-input'}
							/>
							{warningIncorrectPassword && (
								<Text style={styles.warningMessageText}>{warningIncorrectPassword}</Text>
							)}
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.tryUnlock}
								testID={'submit-button'}
							>
								{strings('manual_backup_step_1.confirm')}
							</StyledButton>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</KeyboardAvoidingView>
		);
	}

	renderResetPassword() {
		const {
			isSelected,
			inputWidth,
			password,
			passwordStrength,
			confirmPassword,
			secureTextEntry,
			error,
			loading
		} = this.state;
		const passwordsMatch = password !== '' && password === confirmPassword;
		const canSubmit = passwordsMatch && isSelected;
		const previousScreen = this.props.navigation.getParam(PREVIOUS_SCREEN);
		const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);

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
						<Text style={styles.title}>
							{strings(
								previousScreen === ONBOARDING
									? 'create_wallet.title'
									: 'secure_your_wallet.creating_password'
							)}
						</Text>
						<Text style={styles.subtitle}>{strings('create_wallet.subtitle')}</Text>
					</View>
				) : (
					<View style={styles.wrapper} testID={'choose-password-screen'}>
						<KeyboardAwareScrollView
							style={styles.scrollableWrapper}
							contentContainerStyle={styles.keyboardScrollableWrapper}
							resetScrollToCoords={{ x: 0, y: 0 }}
						>
							<View testID={'create-password-screen'}>
								<View style={styles.content}>
									<Text style={styles.title}>{strings('reset_password.title')}</Text>
									<View style={styles.text}>
										<Text style={styles.subtitle}>{strings('reset_password.subtitle')}</Text>
									</View>
								</View>
								<View style={styles.field}>
									<Text style={styles.hintLabel}>{strings('reset_password.password')}</Text>
									<Text onPress={this.toggleShowHide} style={[styles.hintLabel, styles.showPassword]}>
										{strings(`reset_password.${secureTextEntry ? 'show' : 'hide'}`)}
									</Text>
									<TextInput
										style={[styles.input, inputWidth]}
										value={password}
										onChangeText={this.onPasswordChange}
										secureTextEntry={secureTextEntry}
										placeholder=""
										testID="input-password"
										onSubmitEditing={this.jumpToConfirmPassword}
										returnKeyType="next"
										autoCapitalize="none"
									/>
									{(password !== '' && (
										<Text style={styles.hintLabel}>
											{strings('reset_password.password_strength')}
											<Text style={styles[`strength_${passwordStrengthWord}`]}>
												{' '}
												{strings(`reset_password.strength_${passwordStrengthWord}`)}
											</Text>
										</Text>
									)) || <Text style={styles.hintLabel} />}
								</View>
								<View style={styles.field}>
									<Text style={styles.hintLabel}>{strings('reset_password.confirm_password')}</Text>
									<TextInput
										ref={this.confirmPasswordInput}
										style={[styles.input, inputWidth]}
										value={confirmPassword}
										onChangeText={this.setConfirmPassword}
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
										{strings('reset_password.must_be_at_least', { number: 8 })}
									</Text>
								</View>
								<View>{this.renderSwitch()}</View>
								<View style={styles.checkboxContainer}>
									<CheckBox
										value={isSelected}
										onValueChange={this.setSelection}
										style={styles.checkbox}
										tintColors={{ true: colors.blue }}
										boxType="square"
										testID={'password-understand-box'}
									/>
									<Text style={styles.label} onPress={this.setSelection} testID={'i-understand-text'}>
										{strings('reset_password.i_understand')}{' '}
										<Text onPress={this.learnMore} style={styles.learnMore}>
											{strings('reset_password.learn_more')}
										</Text>
									</Text>
								</View>

								{!!error && <Text style={styles.errorMsg}>{error}</Text>}
							</View>

							<View style={styles.ctaWrapper}>
								<StyledButton
									type={'blue'}
									onPress={this.onPressCreate}
									testID={'submit-button'}
									disabled={!canSubmit}
								>
									{strings('reset_password.reset_button')}
								</StyledButton>
							</View>
						</KeyboardAwareScrollView>
					</View>
				)}
			</SafeAreaView>
		);
	}

	render() {
		const { view, ready } = this.state;
		if (!ready) return this.renderLoader();
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'account-backup-step-4-screen'}
				>
					{view === RESET_PASSWORD ? this.renderResetPassword() : this.renderConfirmPassword()}
				</ScrollView>
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
	setLockTime: time => dispatch(setLockTime(time)),
	seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ResetPassword);
