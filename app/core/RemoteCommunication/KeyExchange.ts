import { EventEmitter2 } from 'eventemitter2';
import ECDH from './ECDH';

export default class KeyExchange extends EventEmitter2 {
	keysExchanged = false;

	myECDH = null;

	otherPublicKey = null;

	secretKey = null;

	commLayer: any;

	myPublicKey: any;
	sendPublicKey: any;

	constructor({ commLayer, otherPublicKey, sendPublicKey }) {
		super();

		this.myECDH = new ECDH();
		this.myECDH.generateECDH();
		this.commLayer = commLayer;
		this.myPublicKey = this.myECDH.getPublicKey();

		if (otherPublicKey) {
			this.onOtherPublicKey(otherPublicKey);
		}
		this.sendPublicKey = sendPublicKey;

		this.commLayer.on('key_exchange', ({ message }) => {
			if (this.keysExchanged) {
				return;
			}
			if (message.type === 'key_handshake_SYN') {
				if (message.pubkey && !this.otherPublicKey) this.onOtherPublicKey(message.pubkey);
				this.commLayer.sendMessage({
					type: 'key_handshake_SYNACK',
					pubkey: this.myPublicKey,
				});
			} else if (message.type === 'key_handshake_SYNACK') {
				this.onOtherPublicKey(message.pubkey);

				this.commLayer.sendMessage({ type: 'key_handshake_ACK' });
				this.keysExchanged = true;
				this.emit('keys_exchanged');
			} else if (message.type === 'key_handshake_ACK') {
				this.keysExchanged = true;
				this.emit('keys_exchanged');
			}
		});
	}

	start() {
		this.commLayer.sendMessage({
			type: 'key_handshake_SYN',
			pubkey: this.sendPublicKey ? this.myPublicKey : undefined,
		});
	}

	onOtherPublicKey(pubkey) {
		this.otherPublicKey = pubkey;
		this.myECDH.computeECDHSecret(this.otherPublicKey);
		this.secretKey = this.myECDH.secretKey;
	}

	encryptMessage(message) {
		if (!this.secretKey) {
			throw new Error('Keys not exchanged');
		}
		return this.myECDH.encryptAuthIV(message);
	}

	decryptMessage(message) {
		if (!this.secretKey) {
			throw new Error('Keys not exchanged');
		}
		return this.myECDH.decryptAuthIV(message);
	}
}
