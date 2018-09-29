import React, { Component } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import StyledButton from '../StyledButton';
import PubNub from 'pubnub';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.slate,
		flex: 1,
		padding: 20
	},
	text: {
		marginTop: 20,
		fontSize: 18,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	loadingText: {
		marginTop: 20,
		fontSize: 14,
		textAlign: 'center',
		color: colors.fontPrimary,
		...fontStyles.normal,
	},
	button: {
		marginTop: 40
	}
});

/**
 * View that displays the current account seed words
 */
export default class SyncWithExtension extends Component {

	seedwords = null;
	channelName = null;

	state = {
		loading: false,
		complete: false
	}

	static navigationOptions = {
		title: strings('syncWithExtension.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	showQRScanner = () => {
		/*
		this.props.navigation.navigate('QrScanner', {
			onScanSuccess: (data) => {
				// Enable pusher logging - don't include this in production
				const result = data.split('|');
				this.channelName = result[0];
				this.seedWords = result[1];
				this.initWebsockets();
			}
		});*/


		// Temp to avoid having to scan every time!
		this.channelName = 'mm-sync-1';
		this.initWebsockets();
	}

	initWebsockets () {
		if(this.loading) return false;

		this.loading = true;
		this.setState({loading: true});

		this.pubnub = new PubNub({
			subscribeKey: 'sub-c-30b2ba04-c37e-11e8-bd78-d63445bede87',
			publishKey: 'pub-c-d40e77d5-5cd3-4ca2-82eb-792a1f4573db',
			ssl: true,
		})

		this.pubnubListener = this.pubnub.addListener({
			message: ({channel, message}) => {
				// handle message
				if (channel !== this.channelName) {
					return false
				}

				if (message.event === 'syncing-data') {
					this.syncData(message.data);
				}
				if (message.event === 'syncing-tx') {
					this.syncTx(message.data);
				}
			},
		});

		this.pubnub.subscribe({
			channels: [this.channelName],
		});

		this.startSync();

	}

	disconnectWebsockets () {
		if (this.pubnub && this.pubnubListener) {
			this.pubnub.disconnect(this.pubnubListener)
		}
	}

	startSync () {
		this.pubnub.publish(
		{
			message: {
				'event': 'start-sync',
				'data': { 'who': 'me' },
			},
			channel: this.channelName,
			sendByPost: false,
			storeInHistory: false,
		},
		(status, response) => {
			console.log('got response from start-sync', status, response)
		})
	}

	syncData(data){
		Alert.alert('Incoming data!', JSON.stringify(data));
	}
	syncTx(data){
		Alert.alert('Incoming tx data!', JSON.stringify(data));
		this.endSync();
	}

	endSync ()  {
		this.pubnub.publish(
		{
			message: {
				'event': 'end-sync',
				'data': { 'status': 'success' },
			},
			channel: this.channelName,
			sendByPost: false,
			storeInHistory: false,
		},
		(status, response) => {
			console.log('got response from end-sync', status, response)
			this.disconnectWebsockets();
			this.loading = false;
			this.setState({loading: false, complete: true})
		});
	}

	goBack = () => {
		this.props.navigation.pop(2);
	}

	componentWillUnmount () {
		this.disconnectWebsockets()
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

	renderInitialView(){
		return (
			<View>
				<Text style={styles.text}>{strings('syncWithExtension.label')}</Text>
				<StyledButton
					type="confirm"
					onPress={this.showQRScanner}
					containerStyle={styles.button}
				>
					{strings('syncWithExtension.buttonContinue')}
				</StyledButton>
			</View>
		)
	}

	renderCompleteView(){
		return (
			<View>
				<Text style={styles.text}>{strings('syncWithExtension.syncComplete')}</Text>
				<StyledButton
					type="confirm"
					onPress={this.goBack}
					containerStyle={styles.button}
				>
					{strings('syncWithExtension.buttonGotIt')}
				</StyledButton>
			</View>
		)
	}

	renderContent(){
		if(this.state.loading) return this.renderLoader();
		if(this.state.complete) return this.renderCompleteView();
		return this.renderInitialView();
	}

	render() {
		return (
			<View style={styles.wrapper} testID={'sync-with-extension-screen'}>
				{ this.renderContent()}
			</View>
		);
	}
}
