import RNWalletConnect from '@walletconnect/client';
import { parseWalletConnectUri } from '@walletconnect/utils';
import type { ISessionStatus, IClientMeta } from '@walletconnect/types';
import AsyncStorage from '@react-native-community/async-storage';
import { WalletDevice } from '@metamask/controllers/';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import Engine from '../Engine';
import Logger from '../../util/Logger';
import { CLIENT_OPTIONS, WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import { WALLETCONNECT_SESSIONS } from '../../constants/storage';
import {
	ETH_SEND_TRANSACTION,
	ETH_SIGN,
	ETH_SIGN_TYPED_DATA,
	ETH_SIGN_TYPED_DATA_V3,
	ETH_SIGN_TYPED_DATA_V4,
	PERSONAL_SIGN,
} from '../../constants/RPCMethods';

/**
 * @type IPeerMeta
 *
 * Peer metadata
 * @property name - Dapp name
 * @property description - Dapp description
 * @property icons - Arrays with the icons url
 * @property url - Dapp url
 */
interface IPeerMeta {
	name: string;
	description: string;
	icons: string[];
	url: string;
}

/**
 * @type ISessionData
 *
 * WalletConnect session data
 * @property peerId - Peer ID
 * @property chainId - Chain ID
 * @property autosign - Param indicating if autosign  is enabled
 * @property userAddress - Client public address
 * @property peerMeta - Peer metadata
 */
interface ISessionData {
	peerId: string;
	chainId: number;
	autosign: boolean;
	userAddress: string;
	peerMeta: IPeerMeta;
}

/**
 * @type ITransactionParams
 *
 * Transaction metadata. This should be replaced with the proper
 * interface once it is defined.
 * @property to - Recipient address
 * @property from - Emiter address
 * @property value - Quantity
 * @property gas - Gas required for execution
 * @property gasPrice - Gas price
 * @property data - Relevant data to the transaction
 */
interface ITransactionParams {
	to?: string;
	from?: string;
	value?: string;
	gas?: string;
	gasPrice?: string;
	data?: string;
}

/**
 * @type IPayload
 *
 * WalletConnect session request payload
 * @property id - Session ID
 * @property method - RPC method name
 * @property jsonrpc - JSON RPC version
 * @property params - Method params
 */
interface IPayload {
	id: number;
	method: string;
	jsonrpc: string;
	params: any[];
}

/**
 * @type IWCSessionParams
 *
 * Params to create a new WalletConnect session
 * @property uri - WC dapp uri
 * @property redirect - Uri to redirect after a session has started
 * @property autosign - Param indicating if autosign  is enabled
 */
interface IWCSessionParams {
	uri: string;
	redirect?: string | undefined;
	autosign?: boolean;
}

const hub = new EventEmitter();
let connectors: any[] = [];
let initialized = false;
const tempCallIds: any[] = [];

const persistSessions = async () => {
	const sessions = connectors
		.filter((connector) => connector?.walletConnector?.connected)
		.map((connector) => connector.walletConnector.session);

	await AsyncStorage.setItem(WALLETCONNECT_SESSIONS, JSON.stringify(sessions));
};

const waitForInitialization = async () => {
	let i = 0;
	while (!initialized) {
		await new Promise<void>((res) => setTimeout(() => res(), 1000));
		if (i++ > 5) initialized = true;
	}
};

const waitForKeychainUnlocked = async () => {
	let i = 0;
	const { KeyringController } = Engine.context as any;
	while (!KeyringController.isUnlocked()) {
		await new Promise<void>((res) => setTimeout(() => res(), 1000));
		if (i++ > 60) break;
	}
};

class WalletConnectSession {
	redirectUrl = '';
	autosign = false;
	chainId: number | null = null;
	redirect: boolean | null = null;
	selectedAddress: string;
	walletConnector: RNWalletConnect | null;

	constructor(options: any) {
		if (options.redirect) {
			this.redirectUrl = options.redirect;
		}

		if (options.autosign) {
			this.autosign = true;
		}
		this.walletConnector = new RNWalletConnect({ ...options, ...CLIENT_OPTIONS });
		/**
		 *  Subscribe to session requests
		 */
		this.walletConnector.on('session_request', async (error, payload) => {
			Logger.log('WC session_request:', payload);
			if (error) {
				throw error;
			}

			await waitForKeychainUnlocked();

			try {
				const sessionData: ISessionData = {
					...payload.params[0],
					autosign: this.autosign,
				};

				Logger.log('WC:', sessionData);

				await waitForInitialization();
				await this.sessionRequest(sessionData);

				const { NetworkController, PreferencesController } = Engine.context as any;
				const { network } = NetworkController.state;
				this.selectedAddress = PreferencesController.state.selectedAddress;
				const approveData: ISessionStatus = {
					chainId: parseInt(network, 10),
					accounts: [this.selectedAddress],
				};

				await this.walletConnector?.approveSession(approveData);
				persistSessions();
				this.redirectIfNeeded();
			} catch (e) {
				this.walletConnector?.rejectSession();
			}
		});

		/**
		 *  Subscribe to call requests
		 */
		this.walletConnector.on('call_request', async (error, payload) => {
			if (tempCallIds.includes(payload.id)) return;
			tempCallIds.push(payload.id);

			await waitForKeychainUnlocked();

			Logger.log('CALL_REQUEST', error, payload);
			if (error) {
				throw error;
			}

			const meta = this.walletConnector?.session.peerMeta;
			if (!meta) {
				return;
			}

			if (payload.method) {
				switch (payload.method) {
					case ETH_SEND_TRANSACTION:
						await this.eth_sendTransaction(payload, meta);
						break;

					case ETH_SIGN:
						await this.eth_sign(payload, meta);
						break;

					case ETH_SIGN_TYPED_DATA:
					case ETH_SIGN_TYPED_DATA_V3:
						await this.eth_signTypedData(payload, meta);
						break;

					case ETH_SIGN_TYPED_DATA_V4:
						await this.eth_signTypedDataV4(payload, meta);
						break;

					case PERSONAL_SIGN:
						await this.personal_sign(payload, meta);
						break;

					default:
						break;
				}
				this.redirectIfNeeded();
			}
			// Clean call ids
			tempCallIds.length = 0;
		});

		this.walletConnector.on('disconnect', (error) => {
			if (error) {
				throw error;
			}

			// delete walletConnector
			this.walletConnector = null;
			persistSessions();
		});

		this.walletConnector.on('session_update', (error, payload) => {
			Logger.log('WC: Session update', payload);
			if (error) {
				throw error;
			}
		});

		const { TransactionController, NetworkController, PreferencesController } = Engine.context as any;
		TransactionController.hub.on('networkChange', this.onNetworkChange);
		PreferencesController.subscribe(this.onAccountChange);
		const { selectedAddress } = PreferencesController.state;
		const { network } = NetworkController.state;

		this.selectedAddress = selectedAddress;
		this.chainId = network;
	}

	eth_sendTransaction = async (payload: IPayload, meta: IClientMeta | null) => {
		const { TransactionController } = Engine.context as any;
		try {
			const txParams: ITransactionParams = {};
			txParams.to = payload.params[0].to;
			txParams.from = payload.params[0].from;
			txParams.value = payload.params[0].value;
			txParams.gas = payload.params[0].gas;
			txParams.gasPrice = payload.params[0].gasPrice;
			txParams.data = payload.params[0].data;
			const hash = await (
				await TransactionController.addTransaction(
					txParams,
					meta ? WALLET_CONNECT_ORIGIN + meta.url : undefined,
					WalletDevice.MM_MOBILE
				)
			).result;
			this.walletConnector?.approveRequest({
				id: payload.id,
				result: hash,
			});
		} catch (error: any) {
			this.walletConnector?.rejectRequest({
				id: payload.id,
				error,
			});
		}
	};

	eth_sign = async (payload: IPayload, meta: IClientMeta | null) => {
		const { MessageManager } = Engine.context as any;
		let rawSig = null;
		try {
			if (payload.params[2]) {
				throw new Error('Autosign is not currently supported');
				// Leaving this in case we want to enable it in the future
				// once WCIP-4 is defined: https://github.com/WalletConnect/WCIPs/issues/4
				// rawSig = await KeyringController.signPersonalMessage({
				// 	data: payload.params[1],
				// 	from: payload.params[0]
				// });
			} else {
				const data = payload.params[1];
				const from = payload.params[0];
				rawSig = await MessageManager.addUnapprovedMessageAsync({
					data,
					from,
					meta: {
						title: meta?.name,
						url: meta?.url,
						icon: meta?.icons && meta.icons[0],
					},
					origin: WALLET_CONNECT_ORIGIN,
				});
			}
			this.walletConnector?.approveRequest({
				id: payload.id,
				result: rawSig,
			});
		} catch (error: any) {
			this.walletConnector?.rejectRequest({
				id: payload.id,
				error,
			});
		}
	};

	personal_sign = async (payload: IPayload, meta: IClientMeta | null) => {
		const { PersonalMessageManager } = Engine.context as any;
		let rawSig = null;
		try {
			if (payload.params[2]) {
				throw new Error('Autosign is not currently supported');
				// Leaving this in case we want to enable it in the future
				// once WCIP-4 is defined: https://github.com/WalletConnect/WCIPs/issues/4
				// rawSig = await KeyringController.signPersonalMessage({
				// 	data: payload.params[1],
				// 	from: payload.params[0]
				// });
			} else {
				const data = payload.params[0];
				const from = payload.params[1];

				rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
					data,
					from,
					meta: {
						title: meta?.name,
						url: meta?.url,
						icon: meta?.icons,
					},
					origin: WALLET_CONNECT_ORIGIN,
				});
			}
			this.walletConnector?.approveRequest({
				id: payload.id,
				result: rawSig,
			});
		} catch (error: any) {
			this.walletConnector?.rejectRequest({
				id: payload.id,
				error,
			});
		}
	};

	eth_signTypedData = async (payload: IPayload, meta: IClientMeta | null) => {
		const { TypedMessageManager } = Engine.context as any;
		try {
			const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
				{
					data: payload.params[1],
					from: payload.params[0],
					meta: {
						title: meta?.name,
						url: meta?.url,
						icon: meta?.icons && meta.icons[0],
					},
					origin: WALLET_CONNECT_ORIGIN,
				},
				'V3'
			);

			this.walletConnector?.approveRequest({
				id: payload.id,
				result: rawSig,
			});
		} catch (error: any) {
			this.walletConnector?.rejectRequest({
				id: payload.id,
				error,
			});
		}
	};

	eth_signTypedDataV4 = async (payload: IPayload, meta: IClientMeta | null) => {
		const { TypedMessageManager } = Engine.context as any;
		try {
			const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
				{
					from: payload.params[0],
					data: payload.params[1],
					meta: {
						title: meta?.name,
						url: meta?.url,
						icon: meta?.icons && meta.icons[0],
					},
					origin: WALLET_CONNECT_ORIGIN,
				},
				'V4'
			);

			this.walletConnector?.approveRequest({
				id: payload.id,
				result: rawSig,
			});
		} catch (error: any) {
			this.walletConnector?.rejectRequest({
				id: payload.id,
				error,
			});
		}
	};

	onAccountChange = () => {
		const { PreferencesController } = Engine.context as any;
		const { selectedAddress } = PreferencesController.state;

		if (selectedAddress !== this.selectedAddress) {
			this.selectedAddress = selectedAddress;
			this.updateSession();
		}
	};

	onNetworkChange = () => {
		const { NetworkController } = Engine.context as any;
		const { network } = NetworkController.state;
		// Wait while the network is set
		if (network !== 'loading' && network !== this.chainId) {
			this.chainId = network;
			this.updateSession();
		}
	};

	updateSession = () => {
		const { NetworkController, PreferencesController } = Engine.context as any;
		const { network } = NetworkController.state;
		const { selectedAddress } = PreferencesController.state;
		const sessionData = {
			chainId: parseInt(network, 10),
			accounts: [selectedAddress],
		};
		try {
			this.walletConnector?.updateSession(sessionData);
		} catch (e) {
			Logger.log('Error while updating session', e);
		}
	};

	killSession = () => {
		this.walletConnector?.killSession();
		this.walletConnector = null;
	};

	sessionRequest = (peerInfo: ISessionData) =>
		new Promise((resolve, reject) => {
			hub.emit('walletconnectSessionRequest', peerInfo);

			hub.on('walletconnectSessionRequest::approved', (peerId) => {
				if (peerInfo.peerId === peerId) {
					resolve(true);
				}
			});
			hub.on('walletconnectSessionRequest::rejected', (peerId) => {
				if (peerInfo.peerId === peerId) {
					reject(new Error('walletconnectSessionRequest::rejected'));
				}
			});
		});

	redirectIfNeeded = () => {
		if (this.redirectUrl) {
			setTimeout(() => {
				hub.emit('walletconnect:return');
			}, 1500);
		}
	};
}

const instance = {
	async init(): Promise<void> {
		const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
		if (sessionData) {
			const sessions = JSON.parse(sessionData);
			sessions.forEach((session: any) => {
				connectors.push(new WalletConnectSession({ session }));
			});
		}
		initialized = true;
	},
	connectors(): any[] {
		return connectors;
	},

	newSession(uri: string, redirect: string | undefined, autosign: boolean): void {
		const data: IWCSessionParams = { uri };
		if (redirect) {
			data.redirect = redirect;
		}
		if (autosign) {
			data.autosign = autosign;
		}

		const newSession = new WalletConnectSession(data);
		connectors.push(newSession);
	},

	getSessions: async (): Promise<any[]> => {
		let sessions = [];
		const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
		if (sessionData) {
			sessions = JSON.parse(sessionData);
		}
		return sessions;
	},

	killSession: async (id: number): Promise<void> => {
		// 1) First kill the session
		const connectorToKill = connectors.find((connector) => connector?.walletConnector?.session.peerId === id);
		if (connectorToKill) {
			await connectorToKill.killSession();
		}
		// 2) Remove from the list of connectors
		connectors = connectors.filter(
			(connector) => connector?.walletConnector?.connected && connector.walletConnector.session.peerId !== id
		);
		// 3) Persist the list
		await persistSessions();
	},

	hub,

	shutdown(): void {
		const { TransactionController, PreferencesController } = Engine.context as any;
		TransactionController.hub.removeAllListeners();
		PreferencesController.unsubscribe();
	},

	isValidUri(uri: string): boolean {
		const result = parseWalletConnectUri(uri);
		if (!result.handshakeTopic || !result.bridge || !result.key) {
			return false;
		}
		return true;
	},

	alreadyConnected(uri: string): boolean {
		const wcUri = parseWalletConnectUri(uri);
		const connected = connectors.some(
			(session) => session.handshakeTopic === wcUri.handshakeTopic && session.key === wcUri.key
		);
		return connected;
	},
};

export default instance;
