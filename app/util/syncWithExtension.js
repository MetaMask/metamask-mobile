import PubNub from 'pubnub';
import Logger from './Logger';

const PUB_KEY = process.env['MM_PUBNUB_PUB_KEY']; // eslint-disable-line dot-notation
const SUB_KEY = process.env['MM_PUBNUB_SUB_KEY']; // eslint-disable-line dot-notation

export default class PubNubWrapper {
	pubnub;
	channelName;
	cipherKey;
	incomingDataStr = '';

	constructor(channelName, cipherKey) {
		this.pubnub = new PubNub({
			subscribeKey: SUB_KEY,
			publishKey: PUB_KEY,
			cipherKey,
			ssl: true
		});
		this.cipherKey = cipherKey;
		this.channelName = channelName;
	}

	setChannelNameAndCipherKey(channelName, cipherKey) {
		this.channelName = channelName;
		this.cipherKey = cipherKey;
	}

	generateCipherKeyAndChannelName(selectedAddress) {
		const cipherKey = `${selectedAddress.substr(-4)}-${PubNub.generateUUID()}`;
		const channelName = `mmm-${PubNub.generateUUID()}`;
		return { cipherKey, channelName };
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

	async endSync(callback) {
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
		callback();
	}

	establishConnection(selectedAddress) {
		const { cipherKey, channelName } = this.generateCipherKeyAndChannelName(selectedAddress);
		this.pubnub.publish(
			{
				message: {
					event: 'connection-info',
					channel: channelName,
					cipher: cipherKey
				},
				channel: this.channelName,
				sendByPost: false,
				storeInHistory: false
			},
			() => {
				this.disconnectWebsockets();
				this.channelName = channelName;
				this.cipherKey = cipherKey;
				this.pubnub = new PubNub({
					subscribeKey: SUB_KEY,
					publishKey: PUB_KEY,
					cipherKey,
					ssl: true
				});
			}
		);
	}

	addMessageListener(onErrorSync, onSyncingData) {
		this.pubnub.addListener({
			message: ({ channel, message }) => {
				if (channel !== this.channelName || !message) {
					return false;
				}
				if (message.event === 'error-sync') {
					this.disconnectWebsockets();
					Logger.error('Sync failed', message.data);
					onErrorSync();
				}
				if (message.event === 'syncing-data') {
					this.incomingDataStr += message.data;
					if (message.totalPkg === message.currentPkg) {
						const data = JSON.parse(this.incomingDataStr);
						onSyncingData(data);
					}
				}
			}
		});
	}

	subscribe() {
		this.pubnub.subscribe({
			channels: [this.channelName],
			withPresence: false
		});
	}

	disconnectWebsockets() {
		if (this.pubnub && this.pubnubListener) {
			this.pubnub.disconnect(this.pubnubListener);
		}
	}
}
