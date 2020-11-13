import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Alert, ActivityIndicator, Image, Text, View, ScrollView, StyleSheet, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getTransparentBackOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import StyledButton from '../../UI/StyledButton';
import SecureKeychain from '../../../core/SecureKeychain';
import AppConstants from '../../../core/AppConstants';
import PubNubWrapper from '../../../util/syncWithExtension';
import AnimatedFox from 'react-native-animated-fox';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import TermsAndConditions from '../TermsAndConditions';
import Device from '../../../util/Device';
import PreventScreenshot from '../../../core/PreventScreenshot';
import {
	SEED_PHRASE_HINTS,
	EXISTING_USER,
	BIOMETRY_CHOICE,
	BIOMETRY_CHOICE_DISABLED,
	NEXT_MAKER_REMINDER,
	METRICS_OPT_IN,
	TRUE
} from '../../../constants/storage';

const SMALL_DEVICE = Device.isSmallDevice();

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 32,
		alignItems: 'center'
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
	title: {
		fontSize: SMALL_DEVICE ? 20 : 24,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	steps: {
		marginVertical: 8,
		marginHorizontal: 25
	},
	text: {
		textAlign: 'left',
		fontSize: 16,
		lineHeight: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	textCentered: {
		textAlign: 'center',
		paddingTop: 8
	},
	ctas: {
		flex: 1,
		flexDirection: 'column',
		marginBottom: 40
	},
	ctaWrapper: {
		marginVertical: 16
	},
	ctaContainer: {
		marginVertical: SMALL_DEVICE ? 8 : 25
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
	termsAndConditions: {
		paddingTop: 20,
		paddingBottom: 30
	}
});

const PUB_KEY = process.env.MM_PUBNUB_PUB_KEY;

/**
 * View where users can decide how to import their wallet
 */
class ImportWallet extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransparentBackOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
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
		seedphraseBackedUp: PropTypes.func,
		/**
		 * Boolean that determines if the user has set a password before
		 */
		passwordSet: PropTypes.bool,
		/**
		 * Selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Save onboarding event to state
		 */
		saveOnboardingEvent: PropTypes.func
	};

	seedwords = null;
	importedAccounts = null;
	channelName = null;
	incomingDataStr = '';
	dataToSync = null;
	mounted = false;

	state = {
		loading: false
	};

	componentDidMount() {
		this.mounted = true;
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

	showQrCode = () => {
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
				Logger.error(e, 'User cancelled biometrics permission');
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

	onPressImport = () => {
		this.props.navigation.push('ImportFromSeed');
		InteractionManager.runAfterInteractions(async () => {
			if (Analytics.getEnabled()) {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WITH_SEEDPHRASE);
				return;
			}
			const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
			if (!metricsOptIn) {
				this.props.saveOnboardingEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WITH_SEEDPHRASE);
			}
		});
	};

	onPressSync = () => {
		if (!PUB_KEY) {
			// Dev message
			Alert.alert(
				'This feature has been disabled',
				`Because you did not set the .js.env file. Look at .js.env.example for more information`
			);
			return false;
		}
		InteractionManager.runAfterInteractions(async () => {
			if (Analytics.getEnabled()) {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_SYNC_WITH_EXTENSION);
				return;
			}
			const metricsOptIn = await AsyncStorage.getItem(METRICS_OPT_IN);
			if (!metricsOptIn) {
				this.props.saveOnboardingEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_SYNC_WITH_EXTENSION);
			}
		});
		this.showQrCode();
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
				<View style={styles.ctaContainer}>
					<Text style={styles.title}>{strings('import_wallet.title')}</Text>
					<Text style={styles.title}>{strings('import_wallet.sub_title')}</Text>
					<View style={styles.steps}>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_one')}</Text>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_two')}</Text>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_three')}</Text>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_four')}</Text>
					</View>
					<View style={styles.ctaWrapper}>
						<View style={styles.flexGrow}>
							<StyledButton type={'blue'} onPress={this.onPressSync} testID={'onboarding-import-button'}>
								{strings('import_wallet.sync_from_browser_extension_button')}
							</StyledButton>
						</View>
					</View>
				</View>

				<View style={styles.ctaContainer}>
					<Text style={styles.title}>{'Import another wallet'}</Text>
					<Text style={[styles.text, styles.textCentered]}>{'You’ll need your 12-word seed phrase'}</Text>
					<View style={styles.ctaWrapper}>
						<View style={styles.flexGrow}>
							<StyledButton
								type={'normal'}
								onPress={this.onPressImport}
								testID={'import-wallet-import-from-seed-button'}
							>
								{strings('import_wallet.import_from_seed_button')}
							</StyledButton>
						</View>
					</View>
				</View>
			</View>
		);
	}

	render() {
		const { loading } = this.state;
		return (
			<View style={baseStyles.flexGrow} testID={'import-wallet-screen'}>
				<OnboardingScreenWithBg screen={'a'}>
					<ScrollView style={baseStyles.flexGrow} contentContainerStyle={styles.scroll}>
						<View style={styles.wrapper}>
							{!loading && (
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
					</ScrollView>
					<View style={styles.termsAndConditions}>
						<TermsAndConditions navigation={this.props.navigation} />
					</View>
				</OnboardingScreenWithBg>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
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
)(ImportWallet);
