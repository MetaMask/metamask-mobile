import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AsyncStorage, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import Screen from '../Screen';
import StyledButton from '../StyledButton';
import { getOnboardingNavbarOptions } from '../Navbar';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import PubNub from 'pubnub';

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
 * View that displays the current account seed words
 */
export default class SyncWithExtension extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	seedwords = null;
	channelName = null;
	dataToSync = null;

	state = {
		loading: false,
		complete: false
	};

	static navigationOptions = ({ navigation }) => getOnboardingNavbarOptions(navigation);

	showQRScanner = () => {
		/*
		this.props.navigation.navigate('QrScanner', {
			onScanSuccess: (data) => {
				// Enable pusher logging - don't include this in production
				const result = data.split('|');
				this.channelName = result[0];
				this.cipherText = result[1];
				this.seedWords = result[2];
				this.password = result[3];
				this.initWebsockets();
			}
		});*/

		// Temp to avoid having to scan every time!
		this.seedWords = 'blur spawn canvas dream person few marble evolve frown grace lab chicken';
		this.channelName = 'mm-sync-1';
		this.cipherKey = '4d6826a4-801c-4bff-b45c-752abd4da8a8';
		this.initWebsockets();
	};

	initWebsockets() {
		if (this.loading) return false;

		this.loading = true;
		this.setState({ loading: true });

		this.pubnub = new PubNub({
			subscribeKey: 'sub-c-30b2ba04-c37e-11e8-bd78-d63445bede87',
			publishKey: 'pub-c-d40e77d5-5cd3-4ca2-82eb-792a1f4573db',
			cipherKey: this.cipherKey,
			ssl: true
		});

		this.pubnubListener = this.pubnub.addListener({
			message: ({ channel, message }) => {
				// handle message
				if (channel !== this.channelName) {
					return false;
				}

				if (message.event === 'syncing-data') {
					this.syncData(message.data);
				}
				if (message.event === 'syncing-tx') {
					this.syncTx(message.data.transactions);
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

	syncData(data) {
		Logger.log('Incoming data!', JSON.stringify(data));
		this.dataToSync = { ...data };
	}
	syncTx(transactions) {
		Logger.log('Incoming tx data!', JSON.stringify(transactions));
		this.dataToSync.transactions = transactions;
		this.endSync();
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
			async () => {
				this.disconnectWebsockets();
				await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
				setTimeout(() => {
					this.props.navigation.push('SyncWithExtensionSuccess');
				}, 800);
			}
		);

		// This could also come from the previous step
		// if it's a first time user

		const credentials = await Keychain.getGenericPassword();
		let password;
		if (credentials) {
			password = credentials.password;
		} else {
			password = this.password;
		}

		Engine.sync({ ...this.dataToSync, seed: this.seedWords, pass: password });
	}

	goBack = () => {
		this.props.navigation.navigate('HomeNav');

	};

	componentWillUnmount() {
		this.disconnectWebsockets();
	}

	renderLoader() {
		return (
			<View style={styles.wrapper} testID={'sync-with-extension-screen'}>
				<View style={styles.loader}>
					<ActivityIndicator size="small" />
					<Text style={styles.loadingText}>{strings('syncWithExtension.pleaseWait')}</Text>
				</View>
			</View>
		);
	}

	renderInitialView() {
		return (
			<View>
				<Text style={styles.text}>{strings('syncWithExtension.label')}</Text>
				<StyledButton type="blue" onPress={this.showQRScanner} containerStyle={styles.button}>
					{strings('syncWithExtension.buttonContinue')}
				</StyledButton>
			</View>
		);
	}

	renderCompleteView() {
		return (
			<View>
				<Text style={styles.text}>{strings('syncWithExtension.syncComplete')}</Text>
				<StyledButton type="blue" onPress={this.goBack} containerStyle={styles.button}>
					{strings('syncWithExtension.buttonGotIt')}
				</StyledButton>
			</View>
		);
	}

	renderContent() {
		if (this.state.loading) return this.renderLoader();
		if (this.state.complete) return this.renderCompleteView();
		return this.renderInitialView();
	}

	render() {
		return (
			<Screen>
				<View
					style={styles.wrapper}
					testID={'sync-with-extension-screen'}
				>
					<Text style={styles.title}>Sync from Browser Extension</Text>
					{this.renderContent()}
				</View>
			</Screen>
		);
	}
}
