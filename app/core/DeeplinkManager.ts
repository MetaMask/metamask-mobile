'use strict';

// eslint-disable-next-line @typescript-eslint/no-shadow
import URL from 'url-parse';
import qs from 'qs';
import { Alert } from 'react-native';
import { parse } from 'eth-url-parser';
import WalletConnect from './WalletConnect';
import AppConstants from './AppConstants';
import Engine from './Engine';
import { generateApproveData } from '../util/transactions';
import { strings } from '../../locales/i18n';
import { getNetworkTypeById } from '../util/networks';
import { WalletDevice } from '@metamask/controllers/';
import { ACTIONS, ETH_ACTIONS, PROTOCOLS, PREFIXES } from '../constants/deeplinks';

interface ethUrl {
	parameters: {
		address: string;
		uint256: string;
		value: any;
	};
	target_address: string;
	chain_id: string;
	function_name: string;
}

interface parseArgs {
	browserCallBack?: () => void;
	origin: string;
	onHandled: () => void;
}

class DeeplinkManager {
	navigation: any;
	pendingDeeplink: string | null;

	constructor(_navigation: any) {
		this.navigation = _navigation;
		this.pendingDeeplink = null;
	}

	setDeeplink = (url: string) => (this.pendingDeeplink = url);

	getPendingDeeplink = () => this.pendingDeeplink;

	expireDeeplink = () => (this.pendingDeeplink = null);

	_approveTransaction = (ethUrl: ethUrl, origin: string) => {
		const {
			parameters: { address, uint256 },
			target_address,
			chain_id,
		} = ethUrl;
		const { TransactionController, PreferencesController, NetworkController }: any = Engine.context;

		if (chain_id) {
			const newNetworkType = getNetworkTypeById(chain_id);
			NetworkController.setProviderType(newNetworkType);
		}

		const uint256Number = Number(uint256);

		if (Number.isNaN(uint256Number)) throw new Error('The parameter uint256 should be a number');
		if (!Number.isInteger(uint256Number)) throw new Error('The parameter uint256 should be an integer');

		const value = uint256Number.toString(16);

		const txParams = {
			to: target_address.toString(),
			from: PreferencesController.state.selectedAddress.toString(),
			value: '0x0',
			data: generateApproveData({ spender: address, value }),
		};

		TransactionController.addTransaction(txParams, origin, WalletDevice.MM_MOBILE);
	};

	async _handleEthereumUrl(url: string, origin: string) {
		let ethUrl: ethUrl;

		try {
			ethUrl = parse(url);
		} catch (e: any) {
			Alert.alert(strings('deeplink.invalid'), e.toString());
			return;
		}

		const txMeta = { ...ethUrl, source: url };

		switch (ethUrl.function_name) {
			case ETH_ACTIONS.TRANSFER: {
				this.navigation.navigate('SendView', {
					screen: 'Send',
					params: { txMeta: { ...txMeta, action: 'send-token' } },
				});
				break;
			}
			case ETH_ACTIONS.APPROVE: {
				this._approveTransaction(ethUrl, origin);
				break;
			}
			default: {
				if (ethUrl.parameters?.value) {
					this.navigation.navigate('SendView', {
						screen: 'Send',
						params: { txMeta: { ...txMeta, action: 'send-eth' } },
					});
				} else {
					this.navigation.navigate('SendFlowView', { screen: 'SendTo', params: { txMeta } });
				}
			}
		}
	}

	_handleBrowserUrl(url: string, callback?: (url: string) => void) {
		this.navigation.navigate(
			'BrowserTabHome',
			callback ? null : { screen: 'BrowserView', params: { newTabUrl: url, timestamp: Date.now() } }
		);

		if (callback) callback(url);
	}

	parse(url: string, { browserCallBack, origin, onHandled }: parseArgs) {
		const urlObj = new URL(url);
		let params;
		let wcCleanUrl;

		if (urlObj.query) {
			try {
				params = qs.parse(urlObj.query.substring(1));
			} catch (e: any) {
				Alert.alert(strings('deeplink.invalid'), e.toString());
				//TODO: check if we have to return false here
			}
		}

		const handled = () => (onHandled ? onHandled() : false);
		const { MM_UNIVERSAL_LINK_HOST } = AppConstants;

		switch (urlObj.protocol.replace(':', '')) {
			case PROTOCOLS.HTTP:
			case PROTOCOLS.HTTPS:
				// Universal links
				handled();

				if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
					// action is the first part of the pathname
					const action = urlObj.pathname.split('/')[1];

					if (action === ACTIONS.WC && params?.uri) {
						WalletConnect.newSession(params.uri, params.redirectUrl, false);
					} else if (PREFIXES[action]) {
						this._handleBrowserUrl(
							urlObj.href.replace(`https://${MM_UNIVERSAL_LINK_HOST}/${action}/`, PREFIXES[action]),
							browserCallBack
						);
					} else {
						Alert.alert(strings('deeplink.not_supported'));
					}
				} else {
					// Normal links (same as dapp)
					urlObj.set('protocol', 'https:');
					this._handleBrowserUrl(urlObj.href, browserCallBack);
				}
				break;

			// walletconnect related deeplinks
			// address, transactions, etc
			case PROTOCOLS.WC:
				handled(); //TODO: check if we have to handle it here or handle after the next isValidUri check
				if (!WalletConnect.isValidUri(url)) return;

				// eslint-disable-next-line no-case-declarations
				const redirect = params && params.redirect;
				// eslint-disable-next-line no-case-declarations
				const autosign = params && params.autosign;
				WalletConnect.newSession(wcCleanUrl, redirect, autosign);
				break;
			case PROTOCOLS.ETHEREUM:
				handled();
				this._handleEthereumUrl(url, origin);
				break;

			// Specific to the browser screen
			// For ex. navigate to a specific dapp
			case PROTOCOLS.DAPP:
				// Enforce https
				handled();
				urlObj.set('protocol', 'https:');
				this._handleBrowserUrl(urlObj.href, browserCallBack);
				break;

			// Specific to the MetaMask app
			// For ex. go to settings
			case PROTOCOLS.METAMASK:
				handled(); //TODO: check if we need to wait to handle it after all checks are made

				if (urlObj.origin.indexOf('metamask://wc') === 0) {
					const { href } = new URL(urlObj.query.replace('?uri=', ''));

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

let instance: any = null;

const SharedDeeplinkManager = {
	init: (navigation: any) => {
		instance = new DeeplinkManager(navigation);
	},
	parse: (url: string, args: parseArgs) => instance.parse(url, args),
	setDeeplink: (url: string) => instance.setDeeplink(url),
	getPendingDeeplink: () => instance.getPendingDeeplink(),
	expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
