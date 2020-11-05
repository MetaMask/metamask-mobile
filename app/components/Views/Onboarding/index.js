import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	ActivityIndicator,
	FlatList,
	Text,
	View,
	ScrollView,
	StyleSheet,
	Alert,
	Image,
	InteractionManager
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import StyledButton from '../../UI/StyledButton';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import { strings } from '../../../../locales/i18n';
import Button from 'react-native-button';
import { connect } from 'react-redux';
import SecureKeychain from '../../../core/SecureKeychain';
import Engine from '../../../core/Engine';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import TermsAndConditions from '../TermsAndConditions';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import { getTransparentBackOnboardingNavbarOptions } from '../../UI/Navbar';
import ScanStep from '../../UI/ScanStep';
import PubNubWrapper from '../../../util/syncWithExtension';
import ActionModal from '../../UI/ActionModal';
import Logger from '../../../util/Logger';
import Device from '../../../util/Device';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import AppConstants from '../../../core/AppConstants';
import AnimatedFox from 'react-native-animated-fox';
import PreventScreenshot from '../../../core/PreventScreenshot';
import WarningExistingUserModal from '../../UI/WarningExistingUserModal';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import {
	SEED_PHRASE_HINTS,
	EXISTING_USER,
	BIOMETRY_CHOICE,
	BIOMETRY_CHOICE_DISABLED,
	NEXT_MAKER_REMINDER,
	METRICS_OPT_IN,
	TRUE
} from '../../../constants/storage';

const PUB_KEY = process.env.MM_PUBNUB_PUB_KEY;

const styles = StyleSheet.create({
	scroll: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 30
	},
	modalWrapper: {
		flexGrow: 1,
		paddingHorizontal: 24,
		marginTop: 24
	},
	foxWrapper: {
		width: Device.isIos() ? 90 : 45,
		height: Device.isIos() ? 90 : 45,
		marginVertical: 20
	},
	image: {
		alignSelf: 'center',
		width: Device.isIos() ? 90 : 45,
		height: Device.isIos() ? 90 : 45
	},
	termsAndConditions: {
		paddingVertical: 30
	},
	title: {
		fontSize: 24,
		color: colors.fontPrimary,
		...fontStyles.bold,
		textAlign: 'center'
	},
	ctas: {
		flex: 1,
		position: 'relative'
	},
	footer: {
		marginTop: -20,
		marginBottom: 20
	},
	login: {
		fontSize: 18,
		color: colors.blue,
		...fontStyles.normal
	},
	buttonDescription: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 16,
		color: colors.fontPrimary,
		lineHeight: 20
	},
	importWrapper: {
		marginVertical: 24
	},
	createWrapper: {
		flex: 1,
		justifyContent: 'flex-end',
		marginBottom: 24
	},
	buttonWrapper: {
		marginBottom: 16
	},
	scanTitle: {
		...fontStyles.bold,
		fontSize: 18,
		color: colors.fontPrimary,
		textAlign: 'center',
		lineHeight: 28
	},
	loader: {
		marginTop: 180,
		justifyContent: 'center',
		textAlign: 'center'
	},
	loadingText: {
		marginTop: 30,
		fontSize: 14,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	column: {
		marginVertical: 24,
		alignItems: 'flex-start'
	}
});

const keyExtractor = ({ id }) => id;

const createStep = step => ({
	id: `ONBOARDING_SCAN_STEPS-${step}`,
	step,
	text: strings(`onboarding.scan_step_${step}`)
});

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransparentBackOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * redux flag that indicates if the user set a password
		 */
		passwordSet: PropTypes.bool,
		/**
		 * Save onboarding event to state
		 */
		saveOnboardingEvent: PropTypes.func,
		/**
		 * Selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * The action to update the password set flag
		 * in the redux store
		 */
		passwordHasBeenSet: PropTypes.func,
		/**
		 * The action to update set the locktime
		 * in the redux store
		 */
		setLockTime: PropTypes.func,
		/**
		 * The action to update the seedphrase backed up flag
		 * in the redux store
		 */
		seedphraseBackedUp: PropTypes.func
	};

	state = {
		warningModalVisible: false,
		loading: false,
		existingUser: false,
		qrCodeModalVisible: false
	};

	seedwords = null;
	importedAccounts = null;
	channelName = null;
	incomingDataStr = '';
	dataToSync = null;
	mounted = false;

	// eslint-disable-next-line no-empty-function
	warningCallback = () => {};

	componentDidMount() {
		this.mounted = true;
		this.checkIfExistingUser();
		InteractionManager.runAfterInteractions(() => {
			PreventScreenshot.forbid();
		});
	}

	componentWillUnmount() {
		this.mounted = false;
		this.pubnubWrapper && this.pubnubWrapper.disconnectWebsockets();
		InteractionManager.runAfterInteractions(() => {
			PreventScreenshot.allow();
		});
	}

	async checkIfExistingUser() {
		const existingUser = await AsyncStorage.getItem(EXISTING_USER);
		if (existingUser !== null) {
			this.setState({ existingUser: true });
		}
	}

	toggleQrCodeModal = () => {
		this.setState(state => ({ qrCodeModalVisible: !state.qrCodeModalVisible }));
	};

	initWebsockets() {
		this.loading = true;
		this.mounted && this.setState({ loading: true });

		this.pubnubWrapper.addMessageListener(
			() => {
				Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
				this.loading = false;
				this.setState({ loading: false });
				return false;
			},
			data => {
				this.incomingDataStr = null;
				const { pwd, seed, importedAccounts } = data.udata;
				this.password = pwd;
				this.seedWords = seed;
				this.importedAccounts = importedAccounts;
				delete data.udata;
				this.dataToSync = { ...data };
				this.pubnubWrapper.endSync(() => this.disconnect());
			}
		);

		this.pubnubWrapper.subscribe();
	}

	startSync = async firstAttempt => {
		try {
			this.initWebsockets();
			await this.pubnubWrapper.startSync();
			return true;
		} catch (e) {
			if (!firstAttempt) {
				this.props.navigation.goBack();
				if (e.message === 'Sync::timeout') {
					Alert.alert(
						strings('sync_with_extension.outdated_qr_code'),
						strings('sync_with_extension.outdated_qr_code_desc')
					);
				} else {
					Alert.alert(
						strings('sync_with_extension.something_wrong'),
						strings('sync_with_extension.something_wrong_desc')
					);
				}
			}
			Logger.error(e, { message: 'Sync::startSync', firstAttempt });
			return false;
		}
	};

	async disconnect() {
		let password;
		try {
			// If there's a password set, let's keep it
			if (this.props.passwordSet) {
				// This could also come from the previous step if it's a first time user
				const credentials = await SecureKeychain.getGenericPassword();
				if (credentials) {
					password = credentials.password;
				} else {
					password = this.password;
				}
				// Otherwise use the password from the extension
			} else {
				password = this.password;
			}
		} catch (e) {
			password = this.password;
		}

		if (password === this.password) {
			let biometryType = await SecureKeychain.getSupportedBiometryType();
			if (biometryType) {
				if (Device.isAndroid()) biometryType = 'biometrics';
				this.setState({ biometryType, biometryChoice: true });
				Alert.alert(
					strings('sync_with_extension.allow_biometrics_title', { biometrics: biometryType }),
					strings('sync_with_extension.allow_biometrics_desc', { biometrics: biometryType }),
					[
						{
							text: strings('sync_with_extension.warning_cancel_button'),
							onPress: async () => {
								await AsyncStorage.removeItem(BIOMETRY_CHOICE);
								await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
								this.finishSync({ biometrics: false, password });
							},
							style: 'cancel'
						},
						{
							text: strings('sync_with_extension.warning_ok_button'),
							onPress: async () => {
								await AsyncStorage.setItem(BIOMETRY_CHOICE, biometryType);
								await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
								this.finishSync({ biometrics: true, biometryType, password });
							}
						}
					],
					{ cancelable: false }
				);
			} else {
				this.finishSync({ biometrics: false, password });
			}
		} else {
			this.finishSync({ biometrics: false, password });
		}
	}

	finishSync = async opts => {
		if (opts.biometrics) {
			try {
				await SecureKeychain.setGenericPassword(opts.password, SecureKeychain.TYPES.BIOMETRICS);
			} catch (e) {
				SecureKeychain.resetGenericPassword();
			}
		} else {
			SecureKeychain.resetGenericPassword();
		}

		try {
			await AsyncStorage.removeItem(NEXT_MAKER_REMINDER);
			await Engine.resetState();
			await Engine.sync({
				...this.dataToSync,
				seed: this.seedWords,
				importedAccounts: this.importedAccounts,
				pass: opts.password
			});
			await AsyncStorage.setItem(EXISTING_USER, TRUE);
			await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
			this.props.passwordHasBeenSet();
			this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
			this.props.seedphraseBackedUp();
			this.done = true;
			this.dataToSync = null;
			this.props.navigation.push('SyncWithExtensionSuccess');
		} catch (e) {
			Logger.error(e, 'Sync::disconnect');
			Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
			this.setState({ loading: false });
			this.props.navigation.goBack();
		}
	};

	showQrCode = () => {
		this.toggleQrCodeModal();
		this.props.navigation.push('QRScanner', {
			onStartScan: async data => {
				if (data.content && data.content.search('metamask-sync:') !== -1) {
					const [channelName, cipherKey] = data.content.replace('metamask-sync:', '').split('|@|');
					this.pubnubWrapper = new PubNubWrapper(channelName, cipherKey);
					await this.pubnubWrapper.establishConnection(this.props.selectedAddress);
				} else {
					Alert.alert(
						strings('sync_with_extension.invalid_qr_code'),
						strings('sync_with_extension.invalid_qr_code_desc')
					);
				}
			},
			onScanSuccess: async data => {
				if (data.content && data.content.search('metamask-sync:') !== -1) {
					(await this.startSync(true)) || (await this.startSync(false));
				} else {
					Alert.alert(
						strings('sync_with_extension.invalid_qr_code'),
						strings('sync_with_extension.invalid_qr_code_desc')
					);
				}
			}
		});
	};

	onLogin = async () => {
		const { passwordSet } = this.props;
		if (!passwordSet) {
			const { KeyringController } = Engine.context;
			// Restore vault with empty password
			await KeyringController.submitPassword('');
			await SecureKeychain.resetGenericPassword();
			this.props.navigation.navigate('HomeNav');
		} else {
			this.props.navigation.navigate('Login');
		}
	};

	handleExistingUser = action => {
		if (this.state.existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
	};

	onPressCreate = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', {
				[PREVIOUS_SCREEN]: ONBOARDING
			});
			this.track(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_CREATE_NEW_PASSWORD);
		};
		this.handleExistingUser(action);
	};

	onPressSync = () => {
		const { existingUser } = this.state;
		const action = () =>
			setTimeout(() => {
				this.safeSync();
			}, 500);
		if (existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
	};

	safeSync = () => {
		if (!PUB_KEY) {
			// Dev message
			Alert.alert(
				'This feature has been disabled',
				`Because you did not set the .js.env file. Look at .js.env.example for more information`
			);
			return false;
		}
		this.track(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_SYNC_WITH_EXTENSION);
		this.toggleQrCodeModal();
	};

	onPressImport = () => {
		const action = () => {
			this.props.navigation.push('ImportFromSeed');
			this.track(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WALLET);
		};
		this.handleExistingUser(action);
	};

	track = key => {
		InteractionManager.runAfterInteractions(async () => {
			if (Analytics.getEnabled()) {
				Analytics.trackEvent(key);
				return;
			}
			const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
			if (!metricsOptIn) {
				this.props.saveOnboardingEvent(key);
			}
		});
	};

	alertExistingUser = callback => {
		this.warningCallback = () => {
			callback();
			this.toggleWarningModal();
		};
		this.toggleWarningModal();
	};

	toggleWarningModal = () => {
		const warningModalVisible = this.state.warningModalVisible;
		this.setState({ warningModalVisible: !warningModalVisible });
	};

	renderLoader() {
		return (
			<View style={styles.wrapper}>
				<View style={styles.loader}>
					<ActivityIndicator size="small" />
					<Text style={styles.loadingText}>{strings('sync_with_extension.please_wait')}</Text>
				</View>
			</View>
		);
	}

	renderContent() {
		return (
			<View style={styles.ctas}>
				<Text style={styles.title} testID={'onboarding-screen-title'}>
					{strings('onboarding.title')}
				</Text>
				<View style={styles.importWrapper}>
					<Text style={styles.buttonDescription}>{strings('onboarding.import')}</Text>
				</View>
				<View style={styles.createWrapper}>
					<View style={styles.buttonWrapper}>
						<StyledButton
							type={'normal'}
							onPress={this.onPressImport}
							testID={'import-wallet-import-from-seed-button'}
						>
							{strings('import_wallet.import_from_seed_button')}
						</StyledButton>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							style={styles.button}
							type={'normal'}
							onPress={this.onPressSync}
							testID={'onboarding-import-button'}
						>
							{strings('import_wallet.sync_from_browser_extension_button')}
						</StyledButton>
					</View>
					<View style={styles.buttonWrapper}>
						<StyledButton
							style={styles.button}
							type={'blue'}
							onPress={this.onPressCreate}
							testID={'create-wallet-button'}
						>
							{strings('onboarding.start_exploring_now')}
						</StyledButton>
					</View>
				</View>
			</View>
		);
	}

	render() {
		const { qrCodeModalVisible, loading, existingUser } = this.state;

		const renderScanStep = ({ item: { step, text } }) => <ScanStep step={step}>{text}</ScanStep>;

		const ONBOARDING_SCAN_STEPS = [1, 2, 3, 4].map(createStep);

		return (
			<View style={baseStyles.flexGrow} testID={'onboarding-screen'}>
				<OnboardingScreenWithBg screen={'c'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.wrapper}>
							{loading && (
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
							)}
							{loading ? this.renderLoader() : this.renderContent()}
						</View>
						{existingUser && !loading && (
							<View style={styles.footer}>
								<Button style={styles.login} onPress={this.onLogin}>
									{strings('onboarding.login')}
								</Button>
							</View>
						)}
					</ScrollView>
					<View style={styles.termsAndConditions}>
						<TermsAndConditions navigation={this.props.navigation} />
					</View>
				</OnboardingScreenWithBg>
				<FadeOutOverlay />

				<WarningExistingUserModal
					warningModalVisible={this.state.warningModalVisible}
					onCancelPress={this.warningCallback}
					onRequestClose={this.toggleWarningModal}
					onConfirmPress={this.toggleWarningModal}
				/>

				<ActionModal
					modalVisible={qrCodeModalVisible}
					onConfirmPress={this.showQrCode}
					onCancelPress={this.toggleQrCodeModal}
					onRequestClose={this.toggleQrCodeModal}
					confirmText={strings(`onboarding.scan`)}
					confirmButtonMode="confirm"
				>
					<View style={styles.modalWrapper}>
						<Text style={styles.scanTitle}>{strings('onboarding.scan_title')}</Text>
						<View style={styles.column}>
							<FlatList
								data={ONBOARDING_SCAN_STEPS}
								renderItem={renderScanStep}
								keyExtractor={keyExtractor}
							/>
						</View>
					</View>
				</ActionModal>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state?.engine?.backgroundState?.PreferencesController?.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	passwordHasBeenSet: () => dispatch(passwordSet()),
	setLockTime: time => dispatch(setLockTime(time)),
	seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
	saveOnboardingEvent: event => dispatch(saveOnboardingEvent(event))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Onboarding);
