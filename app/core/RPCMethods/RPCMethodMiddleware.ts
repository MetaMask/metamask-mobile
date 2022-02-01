import { Alert } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { createAsyncMiddleware } from 'json-rpc-engine';
import { ethErrors } from 'eth-json-rpc-errors';
import RPCMethods from './index.js';
import { RPC } from '../../constants/network';
import { NetworksChainId, NetworkType } from '@metamask/controllers';
import Networks, { blockTagParamIndex, getAllNetworks } from '../../util/networks';
import { polyfillGasPrice } from './utils';
import ImportedEngine from '../Engine';
import { strings } from '../../../locales/i18n';
import { resemblesAddress } from '../../util/address';
import { store } from '../../store';
import { removeBookmark } from '../../actions/bookmarks';
import setOnboardingWizardStep from '../../actions/wizard';

let appVersion = '';

interface RPCMethodsMiddleParameters {
	hostname: string;
	getProviderState: () => any;
	navigation: any;
	getApprovedHosts: any;
	url: { current: string };
	title: { current: string };
	icon: { current: string };
	// eth_requestAccounts
	showApprovalDialog: boolean;
	setShowApprovalDialog: (showApprovalDialog: boolean) => void;
	setShowApprovalDialogHostname: (hostname: string) => void;
	approvalRequest: { current: { resolve: (value: boolean) => void; reject: () => void } };
	// Bookmarks
	isHomepage: () => boolean;
	// Show autocomplete
	fromHomepage: { current: boolean };
	setAutocompleteValue: (value: string) => void;
	setShowUrlModal: (showUrlModal: boolean) => void;
	// Wizard
	wizardScrollAdjusted: { current: boolean };
	// wallet_addEthereumChain && wallet_switchEthereumChain
	showAddCustomNetworkDialog: (addCustomNetworkDialog: boolean) => void;
	showSwitchCustomNetworkDialog: (switchCustomNetworkDialog: boolean) => void;
	addCustomNetworkRequest: { current: boolean | null };
	switchCustomNetworkRequest: { current: boolean | null };
	setCustomNetworkToSwitch: (customNetworkToSwitch: any) => void;
	setShowSwitchCustomNetworkDialog: (showSwitchCustomNetworkDialog: string | undefined) => void;
	setCustomNetworkToAdd: (customNetworkToAdd: any) => void;
	setShowAddCustomNetworkDialog: (showAddCustomNetworkDialog: boolean) => void;
}

/**
 * Handle RPC methods called by dapps
 */
export const getRpcMethodMiddleware = ({
	hostname,
	getProviderState,
	navigation,
	getApprovedHosts,
	// Website info
	url,
	title,
	icon,
	// eth_requestAccounts
	showApprovalDialog,
	setShowApprovalDialog,
	setShowApprovalDialogHostname,
	approvalRequest,
	// Bookmarks
	isHomepage,
	// Show autocomplete
	fromHomepage,
	setAutocompleteValue,
	setShowUrlModal,
	// Wizard
	wizardScrollAdjusted,
	// wallet_addEthereumChain && wallet_switchEthereumChain
	showAddCustomNetworkDialog,
	showSwitchCustomNetworkDialog,
	addCustomNetworkRequest,
	switchCustomNetworkRequest,
	setCustomNetworkToSwitch,
	setShowSwitchCustomNetworkDialog,
	setCustomNetworkToAdd,
	setShowAddCustomNetworkDialog,
}: RPCMethodsMiddleParameters) =>
	// all user facing RPC calls not implemented by the provider
	createAsyncMiddleware(async (req: any, res: any, next: any) => {
		const Engine = ImportedEngine as any;
		const getAccounts = async () => {
			const {
				privacy: { privacyMode },
			} = store.getState();

			const selectedAddress = Engine.context.PreferencesController.state.selectedAddress?.toLowerCase();
			const isEnabled = !privacyMode || getApprovedHosts()[hostname];

			return isEnabled && selectedAddress ? [selectedAddress] : [];
		};

		const rpcMethods: any = {
			eth_getTransactionByHash: async () => {
				res.result = await polyfillGasPrice('getTransactionByHash', req.params);
			},
			eth_getTransactionByBlockHashAndIndex: async () => {
				res.result = await polyfillGasPrice('getTransactionByBlockHashAndIndex', req.params);
			},
			eth_getTransactionByBlockNumberAndIndex: async () => {
				res.result = await polyfillGasPrice('getTransactionByBlockNumberAndIndex', req.params);
			},
			eth_chainId: async () => {
				const { provider } = Engine.context.NetworkController.state;
				const networkProvider = provider;
				const networkType = provider.type as NetworkType;
				const isInitialNetwork = networkType && getAllNetworks().includes(networkType);
				let chainId;

				if (isInitialNetwork) {
					chainId = NetworksChainId[networkType];
				} else if (networkType === 'rpc') {
					chainId = networkProvider.chainId;
				}

				if (chainId && !chainId.startsWith('0x')) {
					// Convert to hex
					res.result = `0x${parseInt(chainId, 10).toString(16)}`;
				}
			},
			net_version: async () => {
				const {
					provider: { type: networkType },
				} = Engine.context.NetworkController.state;

				const isInitialNetwork = networkType && getAllNetworks().includes(networkType);
				if (isInitialNetwork) {
					res.result = (Networks as any)[networkType].networkId;
				} else {
					return next();
				}
			},
			eth_requestAccounts: async () => {
				const { params } = req;
				const {
					privacy: { privacyMode },
				} = store.getState();

				let { selectedAddress } = Engine.context.PreferencesController.state;

				selectedAddress = selectedAddress?.toLowerCase();

				if (!privacyMode || ((!params || !params.force) && getApprovedHosts()[hostname])) {
					res.result = [selectedAddress];
				} else {
					if (showApprovalDialog) return;
					setShowApprovalDialog(true);
					setShowApprovalDialogHostname(hostname);

					const approved = await new Promise((resolve, reject) => {
						approvalRequest.current = { resolve, reject };
					});

					if (approved) {
						res.result = selectedAddress ? [selectedAddress] : [];
					} else {
						throw ethErrors.provider.userRejectedRequest('User denied account authorization.');
					}
				}
			},
			eth_accounts: async () => {
				res.result = await getAccounts();
			},

			eth_coinbase: async () => {
				const accounts = await getAccounts();
				res.result = accounts.length > 0 ? accounts[0] : null;
			},

			eth_sign: async () => {
				const { MessageManager } = Engine.context;
				const pageMeta = {
					meta: {
						url: url.current,
						title: title.current,
						icon: icon.current,
					},
				};
				const rawSig = await MessageManager.addUnapprovedMessageAsync({
					data: req.params[1],
					from: req.params[0],
					...pageMeta,
				});

				res.result = rawSig;
			},

			personal_sign: async () => {
				const { PersonalMessageManager } = Engine.context;
				const firstParam = req.params[0];
				const secondParam = req.params[1];
				const params = {
					data: firstParam,
					from: secondParam,
				};

				if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
					params.data = secondParam;
					params.from = firstParam;
				}

				const pageMeta = {
					meta: {
						url: url.current,
						title: title.current,
						icon: icon.current,
					},
				};
				const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
					...params,
					...pageMeta,
				});

				res.result = rawSig;
			},

			eth_signTypedData: async () => {
				const { TypedMessageManager } = Engine.context;
				const pageMeta = {
					meta: {
						url: url.current,
						title: title.current,
						icon: icon.current,
					},
				};
				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[0],
						from: req.params[1],
						...pageMeta,
					},
					'V1'
				);

				res.result = rawSig;
			},

			eth_signTypedData_v3: async () => {
				const { TypedMessageManager } = Engine.context;
				const data = JSON.parse(req.params[1]);
				const chainId = data.domain.chainId;

				const {
					provider: { type: networkType },
					network,
				} = Engine.context.NetworkController.state;

				const activeChainId = networkType === RPC ? network : (Networks as any)[networkType].networkId;
				// eslint-disable-next-line
				if (chainId && chainId != activeChainId) {
					throw ethErrors.rpc.invalidRequest(
						`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`
					);
				}

				const pageMeta = {
					meta: {
						url: url.current,
						title: title.current,
						icon: icon.current,
					},
				};

				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[1],
						from: req.params[0],
						...pageMeta,
					},
					'V3'
				);

				res.result = rawSig;
			},

			eth_signTypedData_v4: async () => {
				const { TypedMessageManager } = Engine.context;
				const data = JSON.parse(req.params[1]);
				const chainId = data.domain.chainId;

				const {
					provider: { type: networkType },
					network,
				} = Engine.context.NetworkController.state;

				const activeChainId = networkType === RPC ? network : (Networks as any)[networkType].networkId;

				// eslint-disable-next-line eqeqeq
				if (chainId && chainId != activeChainId) {
					throw ethErrors.rpc.invalidRequest(
						`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`
					);
				}

				const pageMeta = {
					meta: {
						url: url.current,
						title: title.current,
						icon: icon.current,
					},
				};
				const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
					{
						data: req.params[1],
						from: req.params[0],
						...pageMeta,
					},
					'V4'
				);

				res.result = rawSig;
			},

			web3_clientVersion: async () => {
				if (!appVersion) {
					appVersion = await getVersion();
				}
				res.result = `MetaMask/${appVersion}/Mobile`;
			},

			wallet_scanQRCode: () =>
				new Promise<void>((resolve, reject) => {
					navigation.navigate('QRScanner', {
						onScanSuccess: (data: any) => {
							const regex = new RegExp(req.params[0]);
							if (regex && !regex.exec(data)) {
								reject({ message: 'NO_REGEX_MATCH', data });
							} else if (!regex && !/^(0x){1}[0-9a-fA-F]{40}$/i.exec(data.target_address)) {
								reject({ message: 'INVALID_ETHEREUM_ADDRESS', data: data.target_address });
							}
							let result = data;
							if (data.target_address) {
								result = data.target_address;
							} else if (data.scheme) {
								result = JSON.stringify(data);
							}
							res.result = result;
							resolve();
						},
						onScanError: (e: { toString: () => any }) => {
							throw ethErrors.rpc.internal(e.toString());
						},
					});
				}),

			wallet_watchAsset: async () => {
				const {
					params: {
						options: { address, decimals, image, symbol },
						type,
					},
				} = req;
				const { TokensController } = Engine.context;
				const suggestionResult = await TokensController.watchAsset({ address, symbol, decimals, image }, type);

				res.result = suggestionResult.result;
			},

			metamask_removeFavorite: async () => {
				if (!isHomepage()) {
					throw ethErrors.provider.unauthorized('Forbidden.');
				}

				const { bookmarks } = store.getState();

				Alert.alert(strings('browser.remove_bookmark_title'), strings('browser.remove_bookmark_msg'), [
					{
						text: strings('browser.cancel'),
						onPress: () => {
							res.result = {
								favorites: bookmarks,
							};
						},
						style: 'cancel',
					},
					{
						text: strings('browser.yes'),
						onPress: () => {
							const bookmark = { url: req.params[0] };

							store.dispatch(removeBookmark(bookmark));

							res.result = {
								favorites: bookmarks,
							};
						},
					},
				]);
			},

			metamask_showTutorial: async () => {
				wizardScrollAdjusted.current = false;

				store.dispatch(setOnboardingWizardStep(1));

				navigation.navigate('WalletView');

				res.result = true;
			},

			metamask_showAutocomplete: async () => {
				fromHomepage.current = true;
				setAutocompleteValue('');
				setShowUrlModal(true);

				setTimeout(() => {
					fromHomepage.current = false;
				}, 1500);

				res.result = true;
			},

			/**
			 * This method is used by the inpage provider to get its state on
			 * initialization.
			 */
			metamask_getProviderState: async () => {
				res.result = {
					...getProviderState(),
					accounts: await getAccounts(),
				};
			},

			/**
			 * This method is sent by the window.web3 shim. It can be used to
			 * record web3 shim usage metrics. These metrics are already collected
			 * in the extension, and can optionally be added to mobile as well.
			 *
			 * For now, we need to respond to this method to not throw errors on
			 * the page, and we implement it as a no-op.
			 */
			metamask_logWeb3ShimUsage: () => (res.result = null),
			wallet_addEthereumChain: () =>
				RPCMethods.wallet_addEthereumChain({
					req,
					res,
					showAddCustomNetworkDialog,
					showSwitchCustomNetworkDialog,
					addCustomNetworkRequest,
					switchCustomNetworkRequest,
					setCustomNetworkToSwitch,
					setShowSwitchCustomNetworkDialog,
					setCustomNetworkToAdd,
					setShowAddCustomNetworkDialog,
				}),
			wallet_switchEthereumChain: () =>
				RPCMethods.wallet_switchEthereumChain({
					req,
					res,
					showSwitchCustomNetworkDialog,
					switchCustomNetworkRequest,
					setCustomNetworkToSwitch,
					setShowSwitchCustomNetworkDialog,
				}),
		};

		const blockRefIndex = blockTagParamIndex(req);
		if (blockRefIndex) {
			const blockRef = req.params?.[blockRefIndex];
			// omitted blockRef implies "latest"
			if (blockRef === undefined) {
				req.params[blockRefIndex] = 'latest';
			}
		}

		if (!rpcMethods[req.method]) {
			return next();
		}
		await rpcMethods[req.method]();
	});

export default getRpcMethodMiddleware;
