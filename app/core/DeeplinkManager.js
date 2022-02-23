'use strict';

import URL from 'url-parse';
import qs from 'qs';
import { InteractionManager, Alert } from 'react-native';
import { parse } from 'eth-url-parser';
import WalletConnect from '../core/WalletConnect';
import AppConstants from './AppConstants';
import Engine from './Engine';
import { generateApproveData } from '../util/transactions';
import { NETWORK_ERROR_MISSING_NETWORK_ID } from '../constants/error';
import { strings } from '../../locales/i18n';
import { getNetworkTypeById } from '../util/networks';
import { WalletDevice } from '@metamask/controllers/';
import { showAlert } from '../actions/alert';

class DeeplinkManager {
	constructor({ navigation, frequentRpcList, dispatch }) {
		this.navigation = navigation;
		this.pendingDeeplink = null;
		this.frequentRpcList = frequentRpcList;
		this.dispatch = dispatch;
	}

	setDeeplink = (url) => (this.pendingDeeplink = url);

	getPendingDeeplink = () => this.pendingDeeplink;

	expireDeeplink = () => (this.pendingDeeplink = null);

	/**
	 * Method in charge of changing network if is needed
	 *
	 * @param switchToChainId - Corresponding chain id for new network
	 */
	handleNetworkSwitch = (switchToChainId) => {
		const { NetworkController, CurrencyRateController } = Engine.context;

		// If current network is the same as the one we want to switch to, do nothing
		if (NetworkController?.state?.provider?.chainId === switchToChainId) {
			return;
		}

		const rpc = this.frequentRpcList.find(({ chainId }) => chainId === switchToChainId);

		if (rpc) {
			const { rpcUrl, chainId, ticker, nickname } = rpc;
			CurrencyRateController.setNativeCurrency(ticker);
			NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);
			this.dispatch(
				showAlert({
					isVisible: true,
					autodismiss: 5000,
					content: 'clipboard-alert',
					data: { msg: strings('send.warn_network_change') + nickname },
				})
			);
			return;
		}

		const networkType = getNetworkTypeById(switchToChainId);

		if (networkType) {
			CurrencyRateController.setNativeCurrency('ETH');
			NetworkController.setProviderType(networkType);
			this.dispatch(
				showAlert({
					isVisible: true,
					autodismiss: 5000,
					content: 'clipboard-alert',
					data: { msg: strings('send.warn_network_change') + networkType },
				})
			);
		}
	};

	async handleEthereumUrl(url, origin) {
		let ethUrl = '';
		try {
			ethUrl = parse(url);
		} catch (e) {
			Alert.alert(strings('deeplink.invalid'), e.toString());
			return;
		}

		try {
			// Validate and switch network before performing any other action
			this.handleNetworkSwitch(ethUrl.chain_id);
			const functionName = ethUrl.function_name;
			if (!functionName) {
				const txMeta = { ...ethUrl, source: url };
				if (ethUrl.parameters?.value) {
					this.navigation.navigate('SendView', {
						screen: 'Send',
						params: { txMeta: { ...txMeta, action: 'send-eth' } },
					});
				} else {
					this.navigation.navigate('SendFlowView', { screen: 'SendTo', params: { txMeta } });
				}
			} else if (functionName === 'transfer') {
				const txMeta = { ...ethUrl, source: url };
				this.navigation.navigate('SendView', {
					screen: 'Send',
					params: { txMeta: { ...txMeta, action: 'send-token' } },
				});
			} else if (functionName === 'approve') {
				// add approve transaction
				const {
					parameters: { address, uint256 },
					target_address,
				} = ethUrl;
				const { TransactionController, PreferencesController } = Engine.context;
				const txParams = {};
				txParams.to = `${target_address}`;
				txParams.from = `${PreferencesController.state.selectedAddress}`;
				txParams.value = '0x0';
				const uint256Number = Number(uint256);
				if (Number.isNaN(uint256Number)) throw new Error('The parameter uint256 should be a number');
				if (!Number.isInteger(uint256Number)) throw new Error('The parameter uint256 should be an integer');
				const value = uint256Number.toString(16);
				txParams.data = generateApproveData({ spender: address, value });
				TransactionController.addTransaction(txParams, origin, WalletDevice.MM_MOBILE);
			}
		} catch (e) {
			let alertMessage;
			switch (e.message) {
				case NETWORK_ERROR_MISSING_NETWORK_ID:
					alertMessage = strings('send.network_missing_id');
					break;
				default:
					alertMessage = strings('send.network_not_found_description', { chain_id: ethUrl.chain_id });
			}
			Alert.alert(strings('send.network_not_found_title'), alertMessage);
		}
	}

	handleBrowserUrl(url, callback) {
		InteractionManager.runAfterInteractions(() => {
			if (callback) {
				callback(url);
			} else {
				this.navigation.navigate('BrowserTabHome', {
					screen: 'BrowserView',
					params: {
						newTabUrl: url,
						timestamp: Date.now(),
					},
				});
			}
		});
	}

	parse(url, { browserCallBack, origin, onHandled }) {
		const urlObj = new URL(url.replace('dapp/https://', 'dapp/').replace('dapp/http://', 'dapp/'));
		let params;
		let wcCleanUrl;

		if (urlObj.query.length) {
			try {
				params = qs.parse(urlObj.query.substring(1));
			} catch (e) {
				if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
			}
		}

		const handled = () => onHandled?.();

		const { MM_UNIVERSAL_LINK_HOST } = AppConstants;
		switch (urlObj.protocol.replace(':', '')) {
			case 'http':
			case 'https':
				// Universal links
				handled();
				if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
					// action is the first parth of the pathname
					const action = urlObj.pathname.split('/')[1];

					switch (action) {
						case 'wc':
							params && params.uri && WalletConnect.newSession(params.uri, params.redirectUrl, false);
							break;
						case 'dapp':
							this.handleBrowserUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/dapp/`, 'https://'),
								browserCallBack
							);
							break;
						case 'send':
							this.handleEthereumUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/send/`, 'ethereum:'),
								origin
							);
							break;
						case 'approve':
							this.handleEthereumUrl(
								urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/approve/`, 'ethereum:'),
								origin
							);
							break;
						case 'payment':
						case 'focus':
						case '':
							break;

						default:
							Alert.alert(strings('deeplink.not_supported'));
					}
				} else {
					// Normal links (same as dapp)
					handled();
					urlObj.set('protocol', 'https:');
					this.handleBrowserUrl(urlObj.href, browserCallBack);
				}
				break;

			// walletconnect related deeplinks
			// address, transactions, etc
			case 'wc':
				handled();

				wcCleanUrl = url.replace('wc://wc?uri=', '');
				if (!WalletConnect.isValidUri(wcCleanUrl)) return;

				WalletConnect.newSession(wcCleanUrl, params?.redirect, params?.autosign, origin);
				break;

			case 'ethereum':
				handled();
				this.handleEthereumUrl(url, origin);
				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case 'dapp':
				// Enforce https
				handled();
				urlObj.set('protocol', 'https:');
				this.handleBrowserUrl(urlObj.href, browserCallBack);
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case 'metamask':
				handled();
				if (url.startsWith('metamask://wc')) {
					const cleanUrlObj = new URL(urlObj.query.replace('?uri=', ''));
					const href = cleanUrlObj.href;
					if (!WalletConnect.isValidUri(href)) return;
					const redirect = params && params.redirect;
					const autosign = params && params.autosign;
					WalletConnect.newSession(href, redirect, autosign);
				}
				break;
			default:
				return false;
		}

		return true;
	}
}

let instance = null;

const SharedDeeplinkManager = {
	init: ({ navigation, frequentRpcList, dispatch }) => {
		instance = new DeeplinkManager({ navigation, frequentRpcList, dispatch });
	},
	parse: (url, args) => instance.parse(url, args),
	setDeeplink: (url) => instance.setDeeplink(url),
	getPendingDeeplink: () => instance.getPendingDeeplink(),
	expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
