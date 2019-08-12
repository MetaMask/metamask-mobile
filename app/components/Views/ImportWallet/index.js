import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
	Platform,
	Alert,
	ActivityIndicator,
	Image,
	Text,
	View,
	ScrollView,
	StyleSheet,
	InteractionManager
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import { passwordSet, seedphraseBackedUp } from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import StyledButton from '../../UI/StyledButton';
import SecureKeychain from '../../../core/SecureKeychain';
import AppConstants from '../../../core/AppConstants';
import PubNubWrapper from '../../../util/syncWithExtension';
import AnimatedFox from 'react-native-animated-fox';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import { saveOnboardingEvent } from '../../../actions/onboarding';

const styles = StyleSheet.create({
	scroll: {
		flexGrow: 1
	},
	wrapper: {
		flex: 1,
		paddingTop: 0,
		paddingHorizontal: 30,
		paddingBottom: 30
	},
	foxWrapper: {
		width: Platform.OS === 'ios' ? 90 : 45,
		height: Platform.OS === 'ios' ? 90 : 45,
		marginTop: 0,
		marginBottom: 20
	},
	image: {
		alignSelf: 'center',
		width: Platform.OS === 'ios' ? 90 : 45,
		height: Platform.OS === 'ios' ? 90 : 45
	},
	title: {
		fontSize: 24,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.bold
	},
	steps: {
		marginTop: 50,
		marginBottom: 30
	},
	text: {
		textAlign: 'left',
		fontSize: 18,
		lineHeight: 30,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	separator: {
		marginTop: 8,
		marginBottom: 8,
		textAlign: 'center'
	},
	ctas: {
		flex: 1,
		flexDirection: 'column',
		marginBottom: 40,
		marginTop: 24
	},
	ctaWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
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
	}
});

const PUB_KEY = process.env['MM_PUBNUB_PUB_KEY']; // eslint-disable-line dot-notation

/**
 * View where users can decide how to import their wallet
 */
class ImportWallet extends PureComponent {
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
	channelName = null;
	incomingDataStr = '';
	dataToSync = null;
	mounted = false;

	state = {
		loading: false,
		existingUser: false
	};

	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	async checkIfExistingUser() {
		const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
		if (existingUser !== null) {
			this.setState({ existingUser: true });
		}
	}

	componentDidMount() {
		this.mounted = true;
		this.checkIfExistingUser();
	}

	componentWillUnmount() {
		this.mounted = false;
		this.pubnubWrapper && this.pubnubWrapper.disconnectWebsockets();
	}

	startSync = async firstAttempt => {
		try {
			this.initWebsockets();
			await this.pubnubWrapper.startSync();
			return true;
		} catch (e) {
			if (!firstAttempt) {
				this.props.navigation.goBack();
				if (e.toString() === 'sync-timeout') {
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
			Logger.log('Sync::startSync', firstAttempt);
			Logger.log('Sync::startSync', e.toString());
			Logger.error('Sync::startSync', e);
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
				const { pwd, seed } = data.udata;
				this.password = pwd;
				this.seedWords = seed;
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
			const biometryType = await SecureKeychain.getSupportedBiometryType();
			if (biometryType) {
				this.setState({ biometryType, biometryChoice: true });
			}

			const authOptions = {
				accessControl: this.state.biometryChoice
					? SecureKeychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					: SecureKeychain.ACCESS_CONTROL.DEVICE_PASSCODE
			};
			await SecureKeychain.setGenericPassword('metamask-user', password, authOptions);
		}

		try {
			await Engine.sync({ ...this.dataToSync, seed: this.seedWords, pass: password });
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			this.props.passwordHasBeenSet();
			this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);
			this.props.seedphraseBackedUp();
			this.done = true;
			this.dataToSync = null;
			this.props.navigation.push('SyncWithExtensionSuccess');
		} catch (e) {
			Logger.error('Sync::disconnect', e);
			Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
			this.setState({ loading: false });
			this.props.navigation.goBack();
		}
	}

	alertExistingUser = callback => {
		Alert.alert(
			strings('sync_with_extension.warning_title'),
			strings('sync_with_extension.warning_message'),
			[
				{ text: strings('sync_with_extension.warning_cancel_button'), onPress: () => false, style: 'cancel' },
				{ text: strings('sync_with_extension.warning_ok_button'), onPress: () => callback() }
			],
			{ cancelable: false }
		);
	};

	onPressImport = () => {
		const { existingUser } = this.state;
		const action = () => {
			this.props.navigation.push('ImportFromSeed');
			InteractionManager.runAfterInteractions(async () => {
				if (Analytics.getEnabled()) {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WITH_SEEDPHRASE);
					return;
				}
				const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
				if (!metricsOptIn) {
					this.props.saveOnboardingEvent(ANALYTICS_EVENT_OPTS.ONBOARDING_SELECTED_IMPORT_WITH_SEEDPHRASE);
				}
			});
		};
		if (existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
	};

	safeSync = () => {
		const { existingUser } = this.state;
		const action = () => this.onPressSync();
		if (existingUser) {
			this.alertExistingUser(action);
		} else {
			action();
		}
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
			const metricsOptIn = await AsyncStorage.getItem('@MetaMask:metricsOptIn');
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

	renderInitialView() {
		return (
			<View style={styles.ctas}>
				<View>
					<View style={styles.steps}>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_one')}</Text>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_two')}</Text>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_three')}</Text>
						<Text style={styles.text}>{strings('import_wallet.sync_help_step_four')}</Text>
					</View>
				</View>
				<View style={styles.ctaWrapper}>
					<View style={styles.flexGrow}>
						<StyledButton type={'blue'} onPress={this.safeSync} testID={'onboarding-import-button'}>
							{strings('import_wallet.sync_from_browser_extension_button')}
						</StyledButton>
					</View>
					<Text style={[styles.text, styles.separator]}>{strings('import_wallet.or')}</Text>
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
		);
	}

	renderContent() {
		if (this.state.loading) return this.renderLoader();
		return this.renderInitialView();
	}

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<OnboardingScreenWithBg screen={'a'}>
					<ScrollView
						style={baseStyles.flexGrow}
						contentContainerStyle={styles.scroll}
						testID={'import-wallet-screen'}
					>
						<View style={styles.wrapper}>
							{!this.state.loading && (
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
							)}
							{!this.state.loading && (
								<React.Fragment>
									<Text style={styles.title}>{strings('import_wallet.title')}</Text>
									<Text style={styles.title}>{strings('import_wallet.sub_title')}</Text>
								</React.Fragment>
							)}
							{this.renderContent()}
						</View>
					</ScrollView>
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
