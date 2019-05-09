import RNWalletConnect from '@walletconnect/react-native';
import Engine from './Engine';
import Logger from '../util/Logger';

class WalletConnect {
	selectedAddress = null;
	chainId = null;

	constructor(uri) {
		if (!WalletConnect.instance) {
			this.walletConnector = new RNWalletConnect(
				{
					uri // Required
				},
				{
					clientMeta: {
						// Required
						description: 'MetaMask Mobile app',
						url: 'https://metamask.io',
						icons: [
							'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg'
						],
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
				}
			);

			/**
			 *  Subscribe to session requests
			 */
			this.walletConnector.on('session_request', (error, payload) => {
				if (error) {
					throw error;
				}

				Logger.log('WalletConnect request payload', payload);

				const { network, selectedAddress } = Engine.datamodel.flatState;
				this.selectedAddress = selectedAddress;
				const approveData = {
					chainId: parseInt(network, 10),
					accounts: [selectedAddress]
				};
				try {
					this.walletConnector.approveSession(approveData);
				} catch (e) {
					Logger.log('Walletconnect session approval failed', e.message);
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

			WalletConnect.instance = this;
		}
		return WalletConnect.instance;
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
	};
}

let instance;

export default {
	initialized: false,
	init(uri) {
		instance = new WalletConnect(uri);
		this.initialized = true;
		return instance;
	},
	shutdown() {
		if (this.initialized) {
			Engine.context.TransactionController.hub.removeAllListeners();
			instance.killSession();
		}
	}
};
