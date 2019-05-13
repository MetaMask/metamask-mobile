import RNWalletConnect from '@walletconnect/react-native';
import Engine from './Engine';
import Logger from '../util/Logger';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-community/async-storage';

const hub = new EventEmitter();
const connectors = [];
const DEFAULT_OPTIONS = {
	clientMeta: {
		// Required
		description: 'MetaMask Mobile app',
		url: 'https://metamask.io',
		icons: ['https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg'],
		name: 'MetaMask',
		ssl: true
	}
	// push: {                                                             // Optional
	// 	url: "https://push.walletconnect.org",
	// 	type: "fcm",
	// 	token: token,
	// 	peerMeta: true,
	// 	language: language
	// }
};

const persistSessions = () => {
	const sessions = connectors
		.filter(connector => connector && connector.walletConnector)
		.map(connector => connector.walletConnector.session);

	AsyncStorage.setItem('@MetaMask:walletconnectSessions', JSON.stringify(sessions));
};

class WalletConnect {
	selectedAddress = null;
	chainId = null;

	constructor(options) {
		this.walletConnector = new RNWalletConnect({
			...DEFAULT_OPTIONS,
			...options
		});

		/**
		 *  Subscribe to session requests
		 */
		this.walletConnector.on('session_request', async (error, payload) => {
			if (error) {
				throw error;
			}

			try {
				await this.sessionRequest(payload.params[0]);

				Logger.log('WalletConnect request payload', payload);

				const { network, selectedAddress } = Engine.datamodel.flatState;
				this.selectedAddress = selectedAddress;
				const approveData = {
					chainId: parseInt(network, 10),
					accounts: [selectedAddress]
				};
				this.walletConnector.approveSession(approveData);
				persistSessions();
			} catch (e) {
				this.walletConnector.rejectSession();
			}
		});

		/**
		 *  Subscribe to call requests
		 */
		this.walletConnector.on('call_request', async (error, payload) => {
			if (error) {
				throw error;
			}

			if (payload.method) {
				if (payload.method === 'eth_sendTransaction') {
					const { TransactionController } = Engine.context;
					try {
						const txParams = {};
						txParams.to = payload.params[0].to;
						txParams.from = payload.params[0].from;
						txParams.value = payload.params[0].value;
						txParams.gasLimit = payload.params[0].gasLimit;
						txParams.gasPrice = payload.params[0].gasPrice;
						if (payload.params[0].data && payload.params[0].data.toString() !== '0x') {
							txParams.data = payload.params[0].data;
						}

						const hash = await (await TransactionController.addTransaction(txParams)).result;
						this.walletConnector.approveRequest({
							id: payload.id,
							result: hash
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				} else if (payload.method === 'eth_sign' || payload.method === 'personal_sign') {
					const { PersonalMessageManager } = Engine.context;
					try {
						const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
							data: payload.params[1],
							from: payload.params[0]
						});
						this.walletConnector.approveRequest({
							id: payload.id,
							result: rawSig
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				} else if (payload.method && payload.method === 'eth_signTypedData') {
					const { TypedMessageManager } = Engine.context;
					try {
						const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
							{
								data: payload.params[1],
								from: payload.params[0]
							},
							'V3'
						);

						this.walletConnector.approveRequest({
							id: payload.id,
							result: rawSig
						});
					} catch (error) {
						this.walletConnector.rejectRequest({
							id: payload.id,
							error
						});
					}
				}
			}
		});

		this.walletConnector.on('disconnect', error => {
			if (error) {
				throw error;
			}

			// delete walletConnector
			this.walletConnector = null;
			this.removeSession();
		});

		this.walletConnector.on('session_update', (error, payload) => {
			if (error) {
				throw error;
			}
			Logger.log('session_update FROM WC:', error, payload);
		});

		Engine.context.TransactionController.hub.on('networkChange', this.onNetworkChange);
		Engine.context.PreferencesController.subscribe(this.onAccountChange);
		const { selectedAddress } = Engine.context.PreferencesController.state;
		const { network } = Engine.context.NetworkController.state;

		this.selectedAddress = selectedAddress;
		this.chainId = network;
	}

	onAccountChange = () => {
		const { selectedAddress } = Engine.context.PreferencesController.state;

		if (selectedAddress !== this.selectedAddress) {
			this.selectedAddress = selectedAddress;
			this.updateSession();
		}
	};

	onNetworkChange = () => {
		const { network } = Engine.context.NetworkController.state;
		// Wait while the network is set
		if (network !== 'loading' && network !== this.chainId) {
			this.chainId = network;
			this.updateSession();
		}
	};

	updateSession = () => {
		const { network } = Engine.context.NetworkController.state;
		const { selectedAddress } = Engine.context.PreferencesController.state;
		const sessionData = {
			chainId: parseInt(network, 10),
			accounts: [selectedAddress]
		};
		this.walletConnector.updateSession(sessionData);
	};

	killSession = () => {
		this.walletConnector && this.walletConnector.killSession();
		this.removeSession();
	};

	sessionRequest = peerInfo =>
		new Promise((resolve, reject) => {
			hub.emit('walletconnectSessionRequest', peerInfo);

			hub.on('walletconnectSessionRequest::approved', peerId => {
				if (this.peerId === peerId) {
					resolve(true);
				}
			});
			hub.on('walletconnectSessionRequest::rejected', peerId => {
				if (this.peerId === peerId) {
					reject(false);
				}
			});
		});
}

export default {
	init() {
		const sessionData = AsyncStorage.getItem('@MetaMask:walletconnectSessions');
		if (sessionData) {
			const sessions = JSON.parse(sessionData);
			sessions.forEach(session => {
				connectors.push(new WalletConnect({ session }));
			});
		}
	},
	newSession(uri) {
		connectors.push(new WalletConnect({ uri }));
	},
	hub,
	shutdown() {
		//TO DO: Store connectors
		Engine.context.TransactionController.hub.removeAllListeners();
		Engine.context.PreferencesController.unsubscribe();
	}
};
