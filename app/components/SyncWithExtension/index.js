import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Alert, AsyncStorage, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import PubNub from 'pubnub';
import { colors, fontStyles } from '../../styles/common';
import Logger from '../../util/Logger';
import { strings } from '../../../locales/i18n';
import Screen from '../Screen';
import StyledButton from '../StyledButton';
import { getOnboardingNavbarOptions } from '../Navbar';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 30
	},
	title: {
		fontSize: 32,
		marginTop: 20,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	text: {
		marginTop: 20,
		fontSize: 16,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	loadingText: {
		marginTop: 20,
		fontSize: 14,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	button: {
		marginTop: 40
	}
});

/**
 * View that initiates the sync process with
 * the MetaMask extension
 */
class SyncWithExtension extends Component {
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

		// We need to use ENV variables to set this
		// And rotate keys before going opensource
		// See https://github.com/MetaMask/MetaMask/issues/145
		this.pubnub = new PubNub({
			subscribeKey: process.env['MM_PUBNUB_SUB_KEY'], // eslint-disable-line dot-notation
			publishKey: process.env['MM_PUBNUB_PUB_KEY'], // eslint-disable-line dot-notation
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
					this.disconnectWebsockets();
					Logger.error('Sync failed', message.data);
					Alert.alert(
						strings('sync_with_extension.error_title'),
						strings('sync_with_extension.error_message')
					);
					this.loading = false;
					this.setState({ loading: false });
					return false;
				}

				if (message.event === 'syncing-data') {
					this.incomingDataStr += message.data;
					if (message.totalPkg === message.currentPkg) {
						const data = JSON.parse(this.incomingDataStr);
						this.incomingDataStr = null;
						const { pwd, seed } = data.udata;
						this.password = pwd;
						this.seedWords = seed;
						delete data.udata;
						this.dataToSync = { ...data };
						this.endSync();
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
			const credentials = await Keychain.getGenericPassword();
			if (credentials) {
				password = credentials.password;
			} else {
				password = this.password;
			}
		} catch (e) {
			password = this.password;
		}

		if (password === this.password) {
			const biometryType = await Keychain.getSupportedBiometryType();
			if (biometryType) {
				this.setState({ biometryType, biometryChoice: true });
			}

			const authOptions = {
				accessControl: this.state.biometryChoice
					? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
					: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
				accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
				authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
			};
			await Keychain.setGenericPassword('metamask-user', password, authOptions);
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

	goBack = () => {
		this.props.navigation.navigate('HomeNav');
	};

	renderLoader() {
		return (
			<View style={styles.wrapper} testID={'sync-with-extension-screen'}>
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
				<Text style={styles.text}>{strings('sync_with_extension.label')}</Text>
				<StyledButton type="blue" onPress={this.scanCode} containerStyle={styles.button}>
					{strings('sync_with_extension.button_continue')}
				</StyledButton>
			</View>
		);
	}

	renderContent() {
		if (this.state.loading) return this.renderLoader();
		return this.renderInitialView();
	}

	render = () => (
		<Screen>
			<View style={styles.wrapper} testID={'sync-with-extension-screen'}>
				<Text style={styles.title}>Sync from Browser Extension</Text>
				{this.renderContent()}
			</View>
		</Screen>
	);
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress,
	accounts: state.backgroundState.AccountTrackerController.accounts
});

export default connect(mapStateToProps)(SyncWithExtension);
