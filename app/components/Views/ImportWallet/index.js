import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
	Platform,
	Alert,
	AsyncStorage,
	ActivityIndicator,
	Image,
	Text,
	View,
	ScrollView,
	StyleSheet
} from 'react-native';
import { connect } from 'react-redux';
import PubNub from 'pubnub';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import StyledButton from '../../UI/StyledButton';
import SecureKeychain from '../../../core/SecureKeychain';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingTop: 10,
		paddingHorizontal: 40,
		paddingBottom: 30
	},
	logoWrapper: {
		alignItems: 'center'
	},
	fox: {
		marginTop: Platform.OS === 'android' ? 20 : 70,
		width: 156,
		height: 97
	},
	title: {
		fontSize: 32,
		marginTop: 30,
		marginBottom: 0,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	subtitle: {
		fontSize: 18,
		lineHeight: 24,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.normal
	},
	steps: {
		marginTop: 10,
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
		marginTop: 25,
		marginBottom: -10,
		textAlign: 'center'
	},
	ctaWrapper: {
		marginTop: 10
	},
	importFromSeedBtn: {
		borderWidth: 0,
		backgroundColor: colors.transparent
	},
	loader: {
		marginTop: 40
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
const SUB_KEY = process.env['MM_PUBNUB_SUB_KEY']; // eslint-disable-line dot-notation

/**
 * View where users can decide how to import their wallet
 */
class ImportWallet extends Component {
	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * An string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object
	};

	seedwords = null;
	channelName = null;
	incomingDataStr = '';
	dataToSync = null;
	mounted = false;
	complete = false;

	state = {
		loading: false
	};

	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	componentDidMount() {
		this.mounted = true;
	}

	componentDidUpdate() {
		// We need to wait until the sync completes and the engine is ready
		// To do that we make sure the # of accounts in redux === the # accounts we imported
		// and also make sure the selected address matches
		if (
			this.dataToSync &&
			this.dataToSync.accounts &&
			this.dataToSync.accounts.hd &&
			Object.keys(this.props.accounts).length === this.dataToSync.accounts.hd.length &&
			this.props.selectedAddress === this.dataToSync.preferences.selectedAddress &&
			!this.done
		) {
			this.done = true;

			this.dataToSync = null;
			this.props.navigation.push('SyncWithExtensionSuccess');
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.disconnectWebsockets();
	}

	scanCode = () => {
		if (this.props.navigation.getParam('existingUser', false)) {
			Alert.alert(
				strings('sync_with_extension.warning_title'),
				strings('sync_with_extension.warning_message'),
				[
					{ text: strings('sync_with_extension.warning_cancel_button'), onPress: () => false },
					{ text: strings('sync_with_extension.warning_ok_button'), onPress: () => this.showQrCode() }
				],
				{ cancelable: false }
			);
		} else {
			this.showQrCode();
		}
	};

	showQrCode = () => {
		this.props.navigation.push('QRScanner', {
			onScanSuccess: data => {
				const result = data.content.replace('metamask-sync:', '').split('|@|');
				this.channelName = result[0];
				this.cipherKey = result[1];
				this.initWebsockets();
			}
		});
	};

	initWebsockets() {
		if (this.loading) return false;

		this.loading = true;
		this.mounted && this.setState({ loading: true });

		this.pubnub = new PubNub({
			subscribeKey: SUB_KEY,
			publishKey: PUB_KEY,
			cipherKey: this.cipherKey,
			ssl: true
		});

		this.pubnubListener = this.pubnub.addListener({
			message: ({ channel, message }) => {
				if (channel !== this.channelName) {
					return false;
				}

				if (!message) {
					return false;
				}

				if (message.event === 'error-sync') {
					this.handleError(message);
					Logger.error('Sync failed from extension');
				}

				if (message.event === 'syncing-data') {
					this.incomingDataStr += message.data;
					if (message.totalPkg === message.currentPkg) {
						try {
							const data = JSON.parse(this.incomingDataStr);
							this.incomingDataStr = null;
							const { pwd, seed } = data.udata;
							this.password = pwd;
							this.seedWords = seed;
							delete data.udata;
							this.dataToSync = { ...data };
							this.endSync();
						} catch (e) {
							this.handleError(message);
							Logger.error('Sync failed at parsing', e);
						}
					}
				}
			}
		});

		this.pubnub.subscribe({
			channels: [this.channelName],
			withPresence: false
		});

		this.startSync();
	}

	handleError(message) {
		this.disconnectWebsockets();
		Logger.log('Sync failed', message, this.incomingDataStr);
		Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
		this.loading = false;
		this.setState({ loading: false });
		return false;
	}

	disconnectWebsockets() {
		if (this.pubnub && this.pubnubListener) {
			this.pubnub.disconnect(this.pubnubListener);
		}
	}

	startSync() {
		this.pubnub.publish(
			{
				message: {
					event: 'start-sync'
				},
				channel: this.channelName,
				sendByPost: false,
				storeInHistory: false
			},
			null
		);
	}

	async endSync() {
		this.pubnub.publish(
			{
				message: {
					event: 'end-sync',
					data: { status: 'success' }
				},
				channel: this.channelName,
				sendByPost: false,
				storeInHistory: false
			},
			() => {
				this.disconnectWebsockets();
				this.complete = true;
			}
		);

		let password;
		try {
			// This could also come from the previous step if it's a first time user
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				password = credentials.password;
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
			Engine.sync({ ...this.dataToSync, seed: this.seedWords, pass: password });
		} catch (e) {
			Logger.error('Sync failed', e);
			Alert.alert(strings('sync_with_extension.error_title'), strings('sync_with_extension.error_message'));
			this.setState({ loading: false });
		}
		await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
	}

	onPressImport = () => {
		this.props.navigation.push('ImportFromSeed');
	};

	onPressSync = () => {
		if (!PUB_KEY || PUB_KEY === 'KEY') {
			// Dev message
			Alert.alert(
				'This feature has been disabled',
				`Because you did not set the .js.env file. Look at .js.env.example for more information`
			);
			return false;
		}

		if (this.props.navigation.getParam('existingUser', false)) {
			Alert.alert(
				strings('sync_with_extension.warning_title'),
				strings('sync_with_extension.warning_message'),
				[
					{ text: strings('sync_with_extension.warning_cancel_button'), onPress: () => false },
					{ text: strings('sync_with_extension.warning_ok_button'), onPress: () => this.showQrCode() }
				],
				{ cancelable: false }
			);
		} else {
			this.showQrCode();
		}
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
			<View>
				<Text style={styles.subtitle}>{strings('import_wallet.sync_help')}</Text>
				<View style={styles.steps}>
					<Text style={styles.text}>{strings('import_wallet.sync_help_step_one')}</Text>
					<Text style={styles.text}>{strings('import_wallet.sync_help_step_two')}</Text>
					<Text style={styles.text}>{strings('import_wallet.sync_help_step_three')}</Text>
					<Text style={styles.text}>{strings('import_wallet.sync_help_step_four')}</Text>
				</View>
				<View style={styles.ctaWrapper}>
					<StyledButton type={'blue'} onPress={this.onPressSync} testID={'onboarding-import-button'}>
						{strings('import_wallet.sync_from_browser_extension_button')}
					</StyledButton>
				</View>
				<Text style={[styles.text, styles.separator]}>{strings('import_wallet.or')}</Text>

				<View style={styles.ctaWrapper}>
					<StyledButton
						type={'normal'}
						onPress={this.onPressImport}
						testID={'onboarding-new-button'}
						containerStyle={styles.importFromSeedBtn}
					>
						{strings('import_wallet.import_from_seed_button')}
					</StyledButton>
				</View>
			</View>
		);
	}

	renderContent() {
		if (this.state.loading) return this.renderLoader();
		return this.renderInitialView();
	}

	render = () => (
		<OnboardingScreenWithBg>
			<ScrollView style={styles.flex} testID={'import-wallet-screen'}>
				<View style={styles.wrapper}>
					<View style={styles.logoWrapper}>
						<Image
							source={require('../../../images/sync-icon.png')}
							style={styles.fox}
							resizeMethod={'auto'}
						/>
					</View>
					<Text style={styles.title}>{strings('import_wallet.title')}</Text>
					{this.renderContent()}
				</View>
			</ScrollView>
		</OnboardingScreenWithBg>
	);
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts
});

export default connect(mapStateToProps)(ImportWallet);
