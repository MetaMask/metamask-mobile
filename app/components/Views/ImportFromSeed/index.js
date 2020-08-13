import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	Switch,
	ActivityIndicator,
	Alert,
	TouchableOpacity,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { connect } from 'react-redux';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import SecureKeychain from '../../../core/SecureKeychain';
import AppConstants from '../../../core/AppConstants';
import setOnboardingWizardStep from '../../../actions/wizard';
// eslint-disable-next-line import/named
import { NavigationActions } from 'react-navigation';
import TermsAndConditions from '../TermsAndConditions';
import zxcvbn from 'zxcvbn';
import Icon from 'react-native-vector-icons/FontAwesome';
import Device from '../../../util/Device';
import { OutlinedTextField } from 'react-native-material-textfield';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 32
	},
	title: {
		fontSize: Device.isAndroid() ? 20 : 25,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	field: {
		marginTop: 20,
		marginBottom: 10
	},
	label: {
		fontSize: 14,
		marginBottom: 12,
		...fontStyles.normal
	},
	input: {
		fontSize: Device.isAndroid() ? 14 : 20,
		...fontStyles.normal
	},
	ctaWrapper: {
		marginTop: 20
	},
	errorMsg: {
		color: colors.red,
		textAlign: 'center',
		...fontStyles.normal
	},
	seedPhrase: {
		marginTop: 10,
		marginBottom: 10,
		backgroundColor: colors.white,
		paddingTop: 20,
		paddingBottom: 20,
		paddingLeft: 20,
		paddingRight: 20,
		fontSize: 20,
		borderRadius: 10,
		minHeight: 110,
		height: 'auto',
		borderWidth: 1,
		borderColor: colors.grey500,
		...fontStyles.normal
	},
	biometrics: {
		alignItems: 'flex-start',
		marginTop: 30,
		marginBottom: 30
	},
	biometryLabel: {
		flex: 1,
		fontSize: 16,
		...fontStyles.normal
	},
	biometrySwitch: {
		marginTop: 10,
		flex: 0
	},
	termsAndConditions: {
		paddingVertical: 30
	},
	passwordStrengthLabel: {
		height: 20,
		marginLeft: 5,
		marginTop: 10,
		fontSize: 12,
		color: colors.fontSecondary,
		textAlign: 'left',
		...fontStyles.normal
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
	showHideToggle: {
		backgroundColor: colors.white,
		marginTop: 8,
		alignSelf: 'flex-end'
	},
	showMatchingPasswords: {
		position: 'absolute',
		marginTop: 8,
		alignSelf: 'flex-end'
	},
	qrCode: {
		marginTop: -50,
		marginBottom: 30,
		alignSelf: 'flex-end',
		marginRight: 10,
		borderWidth: 1,
		borderRadius: 6,
		borderColor: colors.grey100,
		paddingVertical: 4,
		paddingHorizontal: 6
	}
});

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set restore their account
 * using a seed phrase
 */
class ImportFromSeed extends PureComponent {
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
		 * The action to set the locktime
		 * in the redux store
		 */
		setLockTime: PropTypes.func,
		/**
		 * The action to update the seedphrase backed up flag
		 * in the redux store
		 */
		seedphraseBackedUp: PropTypes.func,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func
	};

	state = {
		password: '',
		confirmPassword: '',
		seed: '',
		biometryType: null,
		rememberMe: false,
		labelsScaleNew: new Animated.Value(1),
		labelsScaleConfirm: new Animated.Value(1),
		secureTextEntry: true,
		biometryChoice: false,
		loading: false,
		error: null,
		inputWidth: Device.isAndroid() ? '99%' : undefined
	};

	passwordInput = React.createRef();
	confirmPasswordInput = React.createRef();

	async componentDidMount() {
		const biometryType = await SecureKeychain.getSupportedBiometryType();
		if (biometryType) {
			let enabled = true;
			const previouslyDisabled = await AsyncStorage.removeItem('@MetaMask:biometryChoiceDisabled');
			if (previouslyDisabled && previouslyDisabled === 'true') {
				enabled = false;
			}
			this.setState({ biometryType, biometryChoice: enabled });
		}
		this.mounted = true;
		// Workaround https://github.com/facebook/react-native/issues/9958
		this.state.inputWidth &&
			setTimeout(() => {
				this.mounted && this.setState({ inputWidth: '100%' });
			}, 100);
	}

	componentWillUnmount = () => {
		this.mounted = false;
	};

	onPressImport = async () => {
		if (this.state.loading) return;
		let error = null;
		if (this.state.password.length < 8) {
			error = strings('import_from_seed.password_length_error');
		} else if (this.state.password !== this.state.confirmPassword) {
			error = strings('import_from_seed.password_dont_match');
		}

		if (this.state.seed.split(' ').length !== 12) {
			error = strings('import_from_seed.seed_word_count_error');
		}

		if (error) {
			Alert.alert(strings('import_from_seed.error'), error);
		} else {
			try {
				this.setState({ loading: true });

				const { KeyringController } = Engine.context;
				await Engine.resetState();
				await AsyncStorage.removeItem('@MetaMask:nextMakerReminder');
				await KeyringController.createNewVaultAndRestore(this.state.password, this.state.seed);

				if (this.state.biometryType && this.state.biometryChoice) {
					const authOptions = {
						accessControl: SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					};

					await SecureKeychain.setGenericPassword('metamask-user', this.state.password, authOptions);

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
						await SecureKeychain.setGenericPassword('metamask-user', this.state.password, {
							accessControl: SecureKeychain.ACCESS_CONTROL.WHEN_UNLOCKED_THIS_DEVICE_ONLY
						});
					} else {
						await SecureKeychain.resetGenericPassword();
					}
					await AsyncStorage.removeItem('@MetaMask:biometryChoice');
					await AsyncStorage.setItem('@MetaMask:biometryChoiceDisabled', 'true');
					await AsyncStorage.setItem('@MetaMask:passcodeDisabled', 'true');
				}
				// Get onboarding wizard state
				const onboardingWizard = await AsyncStorage.getItem('@MetaMask:onboardingWizard');
				// Check if user passed through metrics opt-in screen
				const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
				// mark the user as existing so it doesn't see the create password screen again
				await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
				this.setState({ loading: false });
				this.props.passwordSet();
				this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
				this.props.seedphraseBackedUp();
				if (!metricsOptIn) {
					this.props.navigation.navigate('OptinMetrics');
				} else if (onboardingWizard) {
					this.props.navigation.navigate('HomeNav');
				} else {
					this.props.setOnboardingWizardStep(1);
					this.props.navigation.navigate(
						'HomeNav',
						{},
						NavigationActions.navigate({ routeName: 'WalletView' })
					);
				}
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
		}
	};

	onBiometryChoiceChange = value => {
		this.setState({ biometryChoice: value });
	};

	onSeedWordsChange = value => {
		this.setState({ seed: value.toLowerCase() });
	};

	onPasswordChange = val => {
		const passInfo = zxcvbn(val);

		this.setState({ password: val, passwordStrength: passInfo.score });
	};

	onPasswordConfirmChange = val => {
		this.setState({ confirmPassword: val });
	};

	jumpToPassword = () => {
		const { current } = this.passwordInput;
		current && current.focus();
	};

	jumpToConfirmPassword = () => {
		const { current } = this.confirmPasswordInput;
		current && current.focus();
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
						onValueChange={biometryChoice => this.setState({ biometryChoice })} // eslint-disable-line react/jsx-no-bind
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

	toggleShowHide = () => {
		this.setState({ secureTextEntry: !this.state.secureTextEntry });
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

	onQrCodePress = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta && meta.seed) {
					this.setState({ seed: meta.seed });
				} else {
					Alert.alert(
						strings('import_from_seed.invalid_qr_code_title'),
						strings('import_from_seed.invalid_qr_code_message')
					);
				}
			}
		});
	};

	render() {
		const { password, confirmPassword, seed } = this.state;

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
					<View testID={'import-from-seed-screen'}>
						<Text style={styles.title}>{strings('import_from_seed.title')}</Text>
						<TextInput
							value={this.state.seed}
							numberOfLines={3}
							multiline
							style={[styles.seedPhrase, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							placeholder={strings('import_from_seed.seed_phrase_placeholder')}
							placeholderTextColor={colors.grey100}
							onChangeText={this.onSeedWordsChange}
							testID={'input-seed-phrase'}
							blurOnSubmit
							onSubmitEditing={this.jumpToPassword}
							returnKeyType={'next'}
							keyboardType={Device.isAndroid() ? 'visible-password' : 'default'}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<TouchableOpacity style={styles.qrCode} onPress={this.onQrCodePress}>
							<Icon name="qrcode" size={20} color={colors.fontSecondary} />
						</TouchableOpacity>
						<View style={styles.field}>
							<Text style={styles.label}>{strings('login.password')}</Text>
							<OutlinedTextField
								ref={this.passwordInput}
								style={styles.input}
								placeholder={strings('login.password')}
								testID={'input-password-field'}
								returnKeyType={'next'}
								autoCapitalize="none"
								secureTextEntry={this.state.secureTextEntry}
								onChangeText={this.onPasswordChange}
								value={this.state.password}
								baseColor={colors.grey500}
								tintColor={colors.blue}
								onSubmitEditing={this.jumpToConfirmPassword}
								renderRightAccessory={() => (
									<TouchableOpacity onPress={this.toggleShowHide} style={styles.showHideToggle}>
										<Text style={styles.passwordStrengthLabel}>
											{strings(`choose_password.${this.state.secureTextEntry ? 'show' : 'hide'}`)}
										</Text>
									</TouchableOpacity>
								)}
							/>

							{(this.state.password !== '' && (
								<Text style={styles.passwordStrengthLabel}>
									{strings('choose_password.password_strength')}
									<Text style={styles[`strength_${this.getPasswordStrengthWord()}`]}>
										{' '}
										{strings(`choose_password.strength_${this.getPasswordStrengthWord()}`)}
									</Text>
								</Text>
							)) || <Text style={styles.passwordStrengthLabel} />}
						</View>

						<View style={styles.field}>
							<Text style={styles.label}>{strings('import_from_seed.confirm_password')}</Text>
							<OutlinedTextField
								ref={this.confirmPasswordInput}
								style={styles.input}
								testID={'input-password-field-confirm'}
								onChangeText={this.onPasswordConfirmChange}
								returnKeyType={'next'}
								autoCapitalize="none"
								secureTextEntry={this.state.secureTextEntry}
								placeholder={strings('import_from_seed.confirm_password')}
								value={this.state.confirmPassword}
								baseColor={colors.grey500}
								tintColor={colors.blue}
								onSubmitEditing={this.onPressImport}
							/>

							<View style={styles.showMatchingPasswords}>
								{this.state.password !== '' && this.state.password === this.state.confirmPassword ? (
									<Icon name="check" size={12} color={colors.green300} />
								) : null}
							</View>
							<Text style={styles.passwordStrengthLabel}>
								{strings('choose_password.must_be_at_least', { number: 8 })}
							</Text>
						</View>

						{this.renderSwitch()}

						{!!this.state.error && (
							<Text style={styles.errorMsg} testID={'invalid-seed-phrase'}>
								{this.state.error}
							</Text>
						)}

						<View style={styles.ctaWrapper}>
							<StyledButton
								type={'blue'}
								onPress={this.onPressImport}
								testID={'submit'}
								disabled={
									!(password !== '' && password === confirmPassword && seed.split(' ').length === 12)
								}
							>
								{this.state.loading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									strings('import_from_seed.import_button')
								)}
							</StyledButton>
						</View>
						<View style={styles.termsAndConditions}>
							<TermsAndConditions
								navigation={this.props.navigation}
								action={strings('import_from_seed.import_button')}
							/>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</SafeAreaView>
		);
	}
}

const mapDispatchToProps = dispatch => ({
	setLockTime: time => dispatch(setLockTime(time)),
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step)),
	passwordSet: () => dispatch(passwordSet()),
	seedphraseBackedUp: () => dispatch(seedphraseBackedUp())
});

export default connect(
	null,
	mapDispatchToProps
)(ImportFromSeed);
