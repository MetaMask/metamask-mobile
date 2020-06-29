import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Animated,
	Switch,
	ActivityIndicator,
	Alert,
	Text,
	View,
	TextInput,
	SafeAreaView,
	StyleSheet,
	TouchableOpacity
} from 'react-native';
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
import zxcvbn from 'zxcvbn';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 20
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	subtitle: {
		fontSize: 16,
		lineHeight: 23,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
		justifyContent: 'center'
	},

	label: {
		position: 'absolute',
		marginTop: -35,
		marginLeft: 5,
		fontSize: 16,
		color: colors.fontSecondary,
		textAlign: 'left',
		...fontStyles.normal
	},
	field: {
		marginTop: 20,
		marginBottom: 10
	},
	input: {
		borderBottomWidth: Device.isAndroid() ? 0 : 1,
		borderBottomColor: colors.grey100,
		paddingLeft: 0,
		paddingVertical: 10,
		borderRadius: 4,
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
		position: 'absolute',
		marginTop: 8,
		alignSelf: 'flex-end'
	},
	showMatchingPasswords: {
		position: 'absolute',
		marginTop: 8,
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

	onPressCreate = async () => {
		const { loading, password, confirmPassword } = this.state;
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
			// await this.recreateVault(password);

			const { KeyringController } = Engine.context;
			await Engine.resetState();
			await KeyringController.createNewVaultAndKeychain('');
			await SecureKeychain.setGenericPassword('metamask-user', password);
			await AsyncStorage.removeItem('@MetaMask:biometryChoice');
			await AsyncStorage.removeItem('@MetaMask:nextMakerReminder');
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');

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

	animateInLabel = label => {
		if (
			(label === 'new' && this.state.password !== '') ||
			(label === 'confirm' && this.state.confirmPassword !== '')
		) {
			return;
		}
		Animated.timing(label === 'new' ? this.state.labelsScaleNew : this.state.labelsScaleConfirm, {
			toValue: 1,
			duration: 200,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	};

	animateOutLabel = label => {
		Animated.timing(label === 'new' ? this.state.labelsScaleNew : this.state.labelsScaleConfirm, {
			toValue: 0.66,
			duration: 200,
			useNativeDriver: true,
			isInteraction: false
		}).start();
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

	onPasswordChange = val => {
		const passInfo = zxcvbn(val);

		this.setState({ password: val, passwordStrength: passInfo.score });
	};

	toggleShowHide = () => {
		this.setState({ secureTextEntry: !this.state.secureTextEntry });
	};

	render() {
		const startX = 0;
		const startY = 0;
		const width = 100;
		const height = 24;
		const initialScale = 1;
		const endX = 0;
		const endY = 50;

		const {
			labelsScaleNew,
			password,
			confirmPassword,
			secureTextEntry,
			labelsScaleConfirm,
			error,
			loading
		} = this.state;

		const isDisabled = !(password !== '' && password === confirmPassword);

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View style={styles.wrapper} testID={'choose-password-screen'}>
					<KeyboardAwareScrollView style={styles.wrapper} resetScrollToCoords={{ x: 0, y: 0 }}>
						<View testID={'create-password-screen'}>
							<View style={styles.content}>
								<Text style={styles.title}>{strings('choose_password.title')}</Text>
								<View style={styles.text}>
									<Text style={styles.subtitle}>{strings('choose_password.subtitle')}</Text>
								</View>
							</View>
							<View style={styles.field}>
								<Animated.Text
									style={[
										styles.label,
										{
											transform: [
												{
													scale: labelsScaleNew
												},
												{
													translateX: labelsScaleNew.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startX - width / 2 - (width * initialScale) / 2,
															endX
														]
													})
												},
												{
													translateY: labelsScaleNew.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startY - height / 2 - (height * initialScale) / 2,
															endY
														]
													})
												}
											]
										}
									]}
								>
									{strings('choose_password.password')}
								</Animated.Text>
								<TextInput
									style={styles.input}
									value={password}
									onChangeText={this.onPasswordChange} // eslint-disable-line  react/jsx-no-bind
									secureTextEntry={secureTextEntry}
									placeholder={''}
									underlineColorAndroid={colors.grey100}
									testID={'input-password'}
									onSubmitEditing={this.jumpToConfirmPassword}
									returnKeyType={'next'}
									onFocus={() => this.animateOutLabel('new')} // eslint-disable-line  react/jsx-no-bind
									onBlur={() => this.animateInLabel('new')} // eslint-disable-line  react/jsx-no-bind
									autoCapitalize="none"
								/>
								<TouchableOpacity onPress={this.toggleShowHide} style={styles.showHideToggle}>
									<Text style={styles.passwordStrengthLabel}>
										{strings(`choose_password.${secureTextEntry ? 'show' : 'hide'}`)}
									</Text>
								</TouchableOpacity>
								{(password !== '' && (
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
								<Animated.Text
									style={[
										styles.label,
										{
											transform: [
												{
													scale: labelsScaleConfirm
												},
												{
													translateX: labelsScaleConfirm.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startX - width / 2 - (width * initialScale) / 2,
															endX
														]
													})
												},
												{
													translateY: labelsScaleConfirm.interpolate({
														inputRange: [0, 1],
														outputRange: [
															startY - height / 2 - (height * initialScale) / 2,
															endY
														]
													})
												}
											]
										}
									]}
								>
									{strings('choose_password.confirm_password')}
								</Animated.Text>
								<TextInput
									ref={this.confirmPasswordInput}
									style={styles.input}
									value={confirmPassword}
									onChangeText={val => this.setState({ confirmPassword: val })} // eslint-disable-line  react/jsx-no-bind
									secureTextEntry={secureTextEntry}
									placeholder={''}
									placeholderTextColor={colors.grey100}
									underlineColorAndroid={colors.grey100}
									testID={'input-password-confirm'}
									onSubmitEditing={this.onPressCreate}
									returnKeyType={'done'}
									onFocus={() => this.animateOutLabel('confirm')} // eslint-disable-line  react/jsx-no-bind
									onBlur={() => this.animateInLabel('confirm')} // eslint-disable-line  react/jsx-no-bind
									autoCapitalize="none"
								/>
								<View style={styles.showMatchingPasswords}>
									{password !== '' && password === confirmPassword ? (
										<Icon name="check" size={12} color={colors.green300} />
									) : null}
								</View>
								<Text style={styles.passwordStrengthLabel}>
									{strings('choose_password.must_be_at_least', { number: 8 })}
								</Text>
							</View>

							{this.renderSwitch()}

							{!!error && <Text style={styles.errorMsg}>{error}</Text>}
						</View>
					</KeyboardAwareScrollView>
					<View style={styles.ctaWrapper}>
						<StyledButton
							type={'blue'}
							onPress={this.onPressCreate}
							testID={'submit-button'}
							disabled={isDisabled}
						>
							{loading ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								strings('choose_password.create_button')
							)}
						</StyledButton>
					</View>
				</View>
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
