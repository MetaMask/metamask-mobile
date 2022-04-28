import { EventEmitter2 } from 'eventemitter2';
import Socket from './Socket';

interface RemoteCommunicationOptions {
	CommLayer: any;
	otherPublicKey?: string;
	webRTCLib?: any;
}

export default class RemoteCommunication extends EventEmitter2 {
	commLayer = null;

	channelId = null;

	clientsDisconnected = null;

	connected = false;
	isOriginator: boolean;
	originatorInfo: any;
	walletInfo: any;

	constructor({ CommLayer = Socket, otherPublicKey, webRTCLib }: RemoteCommunicationOptions) {
		super();

		this.commLayer = new CommLayer({ otherPublicKey, webRTCLib });

		this.commLayer.on('message', ({ message }) => {
			this.onMessageCommLayer(message);
		});

		this.commLayer.on('clients_ready', ({ isOriginator }) => {
			this.isOriginator = isOriginator;

			if (!isOriginator) return;

			const url = (typeof document !== 'undefined' && document.URL) || 'url undefined';
			const title = (typeof document !== 'undefined' && document.title) || 'title undefined';

			this.commLayer.sendMessage({
				type: 'originator_info',
				originatorInfo: { url, title },
			});
		});

		this.commLayer.on('clients_disconnected', () => {
			this.commLayer.removeAllListeners();
			this.clientsDisconnected = true;
			this.emit('clients_disconnected');
		});

		this.commLayer.on('channel_created', (id) => {
			this.emit('channel_created', id);
		});
	}

	connectToChannel(id) {
		this.commLayer.connectToChannel(id);
		this.channelId = id;
	}

	sendMessage(message) {
		this.commLayer.sendMessage(message);
	}

	onMessageCommLayer(message) {
		if (message.type === 'originator_info') {
			this.commLayer.sendMessage({
				type: 'wallet_info',
				walletInfo: {
					type: 'MetaMask',
					version: 'MetaMask/Mobile',
				},
			});
			this.originatorInfo = message.originatorInfo;
			this.connected = true;
			this.emit('clients_ready', {
				isOriginator: this.isOriginator,
				originatorInfo: message.originatorInfo,
			});
			return;
		} else if (message.type === 'wallet_info') {
			this.walletInfo = message.walletInfo;
			this.connected = true;
			this.emit('clients_ready', {
				isOriginator: this.isOriginator,
				walletInfo: message.walletInfo,
			});
			return;
		}

		this.emit('message', { message });
	}

	generateChannelId() {
		if (this.channelId) throw new Error('Channel already created, you must create a new instance of the SDK');
		const { channelId, pubKey } = this.commLayer.createChannel();
		this.channelId = channelId;
		return { channelId, pubKey };
	}
}
