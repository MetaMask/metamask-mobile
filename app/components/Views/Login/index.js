import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Switch,
	Alert,
	ActivityIndicator,
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	Image,
	InteractionManager,
	TouchableWithoutFeedback,
	Keyboard,
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
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import Device from '../../../util/device';
import { OutlinedTextField } from 'react-native-material-textfield';
import BiometryButton from '../../UI/BiometryButton';
import { recreateVaultWithSamePassword } from '../../../core/Vault';
import Logger from '../../../util/Logger';
import {
	BIOMETRY_CHOICE_DISABLED,
	ONBOARDING_WIZARD,
	ENCRYPTION_LIB,
	TRUE,
	ORIGINAL,
	EXISTING_USER,
} from '../../../constants/storage';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import WarningExistingUserModal from '../../UI/WarningExistingUserModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { tlc, toLowerCaseEquals } from '../../../util/general';
import DefaultPreference from 'react-native-default-preference';

const deviceHeight = Device.getDeviceHeight();
const breakPoint = deviceHeight < 700;

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 32,
	},
	foxWrapper: {
		justifyContent: 'center',
		alignSelf: 'center',
		width: Device.isIos() ? 130 : 100,
		height: Device.isIos() ? 130 : 100,
		marginTop: 100,
	},
	image: {
		alignSelf: 'center',
		width: Device.isIos() ? 130 : 100,
		height: Device.isIos() ? 130 : 100,
	},
	title: {
		fontSize: Device.isAndroid() ? 30 : 35,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold,
	},
	field: {
		flex: 1,
		marginBottom: Device.isAndroid() ? 0 : 10,
		flexDirection: 'column',
	},
	label: {
		color: colors.black,
		fontSize: 16,
		marginBottom: 12,
		...fontStyles.normal,
	},
	ctaWrapper: {
		marginTop: 20,
	},
	footer: {
		marginVertical: 40,
	},
	errorMsg: {
		color: colors.red,
		...fontStyles.normal,
		lineHeight: 20,
	},
	goBack: {
		marginVertical: 14,
		color: colors.blue,
		...fontStyles.normal,
	},
	biometrics: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 20,
		marginBottom: 30,
	},
	biometryLabel: {
		flex: 1,
		fontSize: 16,
		color: colors.black,
		...fontStyles.normal,
	},
	biometrySwitch: {
		flex: 0,
	},
	input: {
		...fontStyles.normal,
		fontSize: 16,
		paddingTop: 2,
	},
	cant: {
		width: 280,
		alignSelf: 'center',
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.normal,
		fontSize: 16,
		lineHeight: 24,
		color: colors.black,
	},
	areYouSure: {
		width: '100%',
		padding: breakPoint ? 16 : 24,
		justifyContent: 'center',
		alignSelf: 'center',
	},
	heading: {
		marginHorizontal: 6,
		color: colors.black,
		...fontStyles.bold,
		fontSize: 20,
		textAlign: 'center',
		lineHeight: breakPoint ? 24 : 26,
	},
	red: {
		marginHorizontal: 24,
		color: colors.red,
	},
	warningText: {
		...fontStyles.normal,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: breakPoint ? 18 : 22,
		color: colors.black,
		marginTop: 20,
	},
	warningIcon: {
		alignSelf: 'center',
		color: colors.red,
		marginVertical: 10,
	},
	bold: {
		...fontStyles.bold,
	},
	delete: {
		marginBottom: 20,
	},
	deleteWarningMsg: {
		...fontStyles.normal,
		fontSize: 16,
		lineHeight: 20,
		marginTop: 10,
		color: colors.red,
	},
});

const DELETE = 'delete';
const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
const WRONG_PASSWORD_ERROR_ANDROID = 'Error: error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT';
const VAULT_ERROR = 'Error: Cannot unlock without a previous vault.';
const isTextDelete = (text) => tlc(text) === DELETE;

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
		 * Boolean flag that determines if password has been set
		 */
		passwordSet: PropTypes.bool,
		/**
		 * A string representing the selected address => account
		 */
		selectedAddress: PropTypes.string,
	};

	state = {
		password: '',
		biometryType: null,
		rememberMe: false,
		biometryChoice: false,
		loading: false,
		error: null,
		biometryPreviouslyDisabled: false,
		warningModalVisible: false,
		deleteModalVisible: false,
		disableDelete: true,
		deleteText: '',
		showDeleteWarning: false,
	};

	mounted = true;

	fieldRef = React.createRef();

	async componentDidMount() {
		if (!this.props.passwordSet) {
			try {
				const { KeyringController } = Engine.context;
				await KeyringController.submitPassword('');
				await SecureKeychain.resetGenericPassword();
				this.props.navigation.navigate('HomeNav');
			} catch (e) {
				//
			}
		} else {
			const biometryType = await SecureKeychain.getSupportedBiometryType();
			if (biometryType) {
				let enabled = true;
				const previouslyDisabled = await AsyncStorage.getItem(BIOMETRY_CHOICE_DISABLED);
				if (previouslyDisabled && previouslyDisabled === TRUE) {
					enabled = false;
				}

				this.setState({
					biometryType: Device.isAndroid() ? 'biometrics' : biometryType,
					biometryChoice: enabled,
					biometryPreviouslyDisabled: !!previouslyDisabled,
				});

				try {
					if (enabled && !previouslyDisabled) {
						const hasCredentials = await this.tryBiometric();
						this.setState({ hasCredentials });
					}
				} catch (e) {
					console.warn(e);
				}
			}
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onLogin = async () => {
		const { password } = this.state;
		const locked = !passwordRequirementsMet(password);
		if (locked) this.setState({ error: strings('login.invalid_password') });
		if (this.state.loading || locked) return;
		try {
			this.setState({ loading: true, error: null });
			const { KeyringController } = Engine.context;

			// Restore vault with user entered password
			await KeyringController.submitPassword(this.state.password);
			const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
			const existingUser = await AsyncStorage.getItem(EXISTING_USER);
			if (encryptionLib !== ORIGINAL && existingUser) {
				await recreateVaultWithSamePassword(this.state.password, this.props.selectedAddress);
				await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
			}
			if (this.state.biometryChoice && this.state.biometryType) {
				await SecureKeychain.setGenericPassword(this.state.password, SecureKeychain.TYPES.BIOMETRICS);
			} else if (this.state.rememberMe) {
				await SecureKeychain.setGenericPassword(this.state.password, SecureKeychain.TYPES.REMEMBER_ME);
			} else {
				await SecureKeychain.resetGenericPassword();
			}

			// Get onboarding wizard state
			const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
			if (onboardingWizard) {
				this.props.navigation.navigate('HomeNav');
			} else {
				this.props.setOnboardingWizardStep(1);
				this.props.navigation.navigate('HomeNav');
			}
			this.setState({ loading: false });
		} catch (e) {
			// Should we force people to enable passcode / biometrics?
			const error = e.toString();
			if (
				toLowerCaseEquals(error, WRONG_PASSWORD_ERROR) ||
				toLowerCaseEquals(error, WRONG_PASSWORD_ERROR_ANDROID)
			) {
				this.setState({ loading: false, error: strings('login.invalid_password') });

				trackErrorAsAnalytics('Login: Invalid Password', error);

				return;
			} else if (error === PASSCODE_NOT_SET_ERROR) {
				Alert.alert(
					'Security Alert',
					'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)'
				);
				this.setState({ loading: false });
			} else if (toLowerCaseEquals(error, VAULT_ERROR)) {
				this.setState({
					loading: false,
					error: strings('login.clean_vault_error'),
				});
			} else {
				this.setState({ loading: false, error });
			}
			Logger.error(error, 'Failed to login');
		}
	};

	delete = async () => {
		const { KeyringController } = Engine.context;
		try {
			await Engine.resetState();
			await KeyringController.createNewVaultAndKeychain(`${Date.now()}`);
			await KeyringController.setLocked();
			this.deleteExistingUser();
		} catch (error) {
			Logger.log(error, `Failed to createNewVaultAndKeychain: ${error}`);
		}
	};

	deleteExistingUser = async () => {
		try {
			await AsyncStorage.removeItem(EXISTING_USER);
			// We need to reset instead of navigate here otherwise, OnboardingRootNav remembers the last screen that it was on, which is most likely not OnboardingNav.
			this.props.navigation.original.reset({
				routes: [
					{
						name: 'OnboardingRootNav',
						state: {
							routes: [
								{ name: 'OnboardingNav', params: { screen: 'Onboarding', params: { delete: true } } },
							],
						},
					},
				],
			});
		} catch (error) {
			Logger.log(error, `Failed to remove key: ${EXISTING_USER} from AsyncStorage`);
		}
	};

	toggleWarningModal = () => this.setState((state) => ({ warningModalVisible: !state.warningModalVisible }));

	toggleDeleteModal = () => this.setState((state) => ({ deleteModalVisible: !state.deleteModalVisible }));

	checkDelete = (text) => {
		this.setState({
			deleteText: text,
			showDeleteWarning: false,
			disableDelete: !isTextDelete(text),
		});
	};

	submitDelete = () => {
		const { deleteText } = this.state;
		this.setState({ showDeleteWarning: !isTextDelete(deleteText) });
		if (isTextDelete(deleteText)) this.delete();
	};

	updateBiometryChoice = async (biometryChoice) => {
		if (!biometryChoice) {
			await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
		} else {
			await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
		}
		this.setState({ biometryChoice });
	};

	renderSwitch = () => {
		if (this.state.biometryType && !this.state.biometryPreviouslyDisabled) {
			return (
				<View style={styles.biometrics}>
					<Text style={styles.biometryLabel}>
						{strings(`biometrics.enable_${this.state.biometryType.toLowerCase()}`)}
					</Text>
					<Switch
						onValueChange={(biometryChoice) => this.updateBiometryChoice(biometryChoice)} // eslint-disable-line react/jsx-no-bind
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
					onValueChange={(rememberMe) => this.setState({ rememberMe })} // eslint-disable-line react/jsx-no-bind
					value={this.state.rememberMe}
					style={styles.biometrySwitch}
					trackColor={Device.isIos() ? { true: colors.green300, false: colors.grey300 } : null}
					ios_backgroundColor={colors.grey300}
				/>
			</View>
		);
	};

	setPassword = (val) => this.setState({ password: val });

	onCancelPress = () => {
		this.toggleWarningModal();
		InteractionManager.runAfterInteractions(this.toggleDeleteModal);
	};

	tryBiometric = async (e) => {
		if (e) e.preventDefault();
		const { current: field } = this.fieldRef;
		field.blur();
		try {
			const credentials = await SecureKeychain.getGenericPassword();
			if (!credentials) return false;
			field.blur();
			this.setState({ password: credentials.password });
			field.setValue(credentials.password);
			field.blur();
			this.onLogin();
		} catch (error) {
			Logger.log(error);
		}
		field.blur();
		return true;
	};

	render = () => (
		<ErrorBoundary view="Login">
			<WarningExistingUserModal
				warningModalVisible={this.state.warningModalVisible}
				cancelText={strings('login.i_understand')}
				onCancelPress={this.onCancelPress}
				onRequestClose={this.toggleWarningModal}
				onConfirmPress={this.toggleWarningModal}
			>
				<View style={styles.areYouSure}>
					<Icon style={styles.warningIcon} size={46} color={colors.red} name="exclamation-triangle" />
					<Text style={[styles.heading, styles.red]}>{strings('login.are_you_sure')}</Text>
					<Text style={styles.warningText}>
						<Text>{strings('login.your_current_wallet')}</Text>
						<Text style={styles.bold}>{strings('login.removed_from')}</Text>
						<Text>{strings('login.this_action')}</Text>
					</Text>
					<Text style={[styles.warningText, styles.noMarginBottom]}>
						<Text>{strings('login.you_can_only')}</Text>
						<Text style={styles.bold}>{strings('login.recovery_phrase')}</Text>
						<Text>{strings('login.metamask_does_not')}</Text>
					</Text>
				</View>
			</WarningExistingUserModal>

			<WarningExistingUserModal
				warningModalVisible={this.state.deleteModalVisible}
				cancelText={strings('login.delete_my')}
				cancelButtonDisabled={this.state.disableDelete}
				onCancelPress={this.submitDelete}
				onRequestClose={this.toggleDeleteModal}
				onConfirmPress={this.toggleDeleteModal}
				onSubmitEditing={this.submitDelete}
			>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
					<View style={styles.areYouSure}>
						<Text style={[styles.heading, styles.delete]}>
							{strings('login.type_delete', { [DELETE]: DELETE })}
						</Text>
						<OutlinedTextField
							style={styles.input}
							autoFocus
							returnKeyType={'done'}
							onChangeText={this.checkDelete}
							autoCapitalize="none"
							value={this.state.deleteText}
							baseColor={colors.grey500}
							tintColor={colors.blue}
							onSubmitEditing={this.submitDelete}
						/>
						{this.state.showDeleteWarning && (
							<Text style={styles.deleteWarningMsg}>{strings('login.cant_proceed')}</Text>
						)}
					</View>
				</TouchableWithoutFeedback>
			</WarningExistingUserModal>

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
							<OutlinedTextField
								style={styles.input}
								placeholder={strings('login.password')}
								testID={'login-password-input'}
								returnKeyType={'done'}
								autoCapitalize="none"
								secureTextEntry
								ref={this.fieldRef}
								onChangeText={this.setPassword}
								value={this.state.password}
								baseColor={colors.grey500}
								tintColor={colors.blue}
								onSubmitEditing={this.onLogin}
								renderRightAccessory={() => (
									<BiometryButton
										onPress={this.tryBiometric}
										hidden={
											!(
												this.state.biometryChoice &&
												this.state.biometryType &&
												this.state.hasCredentials
											)
										}
										type={this.state.biometryType}
									/>
								)}
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
							<Text style={styles.cant}>{strings('login.go_back')}</Text>
							<Button style={styles.goBack} onPress={this.toggleWarningModal}>
								{strings('login.reset_wallet')}
							</Button>
						</View>
					</View>
				</KeyboardAwareScrollView>
				<FadeOutOverlay />
			</SafeAreaView>
		</ErrorBoundary>
	);
}

const mapStateToProps = (state) => ({
	passwordSet: state.user.passwordSet,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
});

const mapDispatchToProps = (dispatch) => ({
	setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
