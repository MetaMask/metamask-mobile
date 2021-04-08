import { InteractionManager } from 'react-native';
import validUrl from 'valid-url';
import { NetworksChainId } from '@metamask/controllers';
import { jsonRpcRequest } from '../../util/jsonRpcRequest';
import Engine from '../Engine';
import { ethErrors } from 'eth-json-rpc-errors';
import { isPrefixedFormattedHexString, isSafeChainId } from '../../util/networks';
import URL from 'url-parse';
import AnalyticsV2 from '../../util/analyticsV2';

const wallet_addEthereumChain = async ({
	req,
	res,
	showAddCustomNetworkDialog,
	showSwitchCustomNetworkDialog,
	addCustomNetworkRequest,
	switchCustomNetworkRequest,
	setCustomNetworkToSwitch,
	setShowSwitchCustomNetworkDialog,
	setCustomNetworkToAdd,
	setShowAddCustomNetworkDialog
}) => {
	if (showAddCustomNetworkDialog || showSwitchCustomNetworkDialog) return;
	addCustomNetworkRequest.current = null;
	switchCustomNetworkRequest.current = null;

	const { PreferencesController, CurrencyRateController, NetworkController } = Engine.context;

	if (!req.params?.[0] || typeof req.params[0] !== 'object') {
		throw ethErrors.rpc.invalidParams({
			message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`
		});
	}

	const params = req.params[0];

	const { chainId, chainName = null, blockExplorerUrls = null, nativeCurrency = null, rpcUrls } = params;

	const allowedKeys = {
		chainId: true,
		chainName: true,
		blockExplorerUrls: true,
		nativeCurrency: true,
		rpcUrls: true
	};

	const extraKeys = Object.keys(params).filter(key => !allowedKeys[key]);
	if (extraKeys.length) {
		throw ethErrors.rpc.invalidParams(
			`Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`
		);
	}

	const firstValidRPCUrl = Array.isArray(rpcUrls) ? rpcUrls.find(rpcUrl => validUrl.isHttpsUri(rpcUrl)) : null;

	const firstValidBlockExplorerUrl =
		blockExplorerUrls !== null && Array.isArray(blockExplorerUrls)
			? blockExplorerUrls.find(blockExplorerUrl => validUrl.isHttpsUri(blockExplorerUrl))
			: null;

	if (!firstValidRPCUrl) {
		throw ethErrors.rpc.invalidParams(
			`Expected an array with at least one valid string HTTPS url 'rpcUrls', Received:\n${rpcUrls}`
		);
	}

	if (blockExplorerUrls !== null && !firstValidBlockExplorerUrl) {
		throw ethErrors.rpc.invalidParams(
			`Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'. Received: ${blockExplorerUrls}`
		);
	}

	const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

	if (!isPrefixedFormattedHexString(_chainId)) {
		throw ethErrors.rpc.invalidParams(
			`Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`
		);
	}

	if (!isSafeChainId(parseInt(_chainId, 16))) {
		throw ethErrors.rpc.invalidParams(
			`Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`
		);
	}

	const chainIdDecimal = parseInt(_chainId, 16).toString(10);

	if (NetworksChainId[chainIdDecimal]) {
		throw ethErrors.rpc.invalidParams(`May not specify default MetaMask chain.`);
	}

	const frequentRpcList = PreferencesController.state.frequentRpcList;
	const existingNetwork = frequentRpcList.find(rpc => rpc.chainId === chainIdDecimal);

	if (existingNetwork) {
		const currentChainId = NetworkController.state.provider.chainId;
		if (currentChainId === chainIdDecimal) {
			res.result = null;
			return;
		}

		setCustomNetworkToSwitch({
			rpcUrl: existingNetwork.rpcUrl,
			chainId: _chainId,
			chainName: existingNetwork.nickname,
			ticker: existingNetwork.ticker
		});
		setShowSwitchCustomNetworkDialog('switch');

		const switchCustomNetworkApprove = await new Promise((resolve, reject) => {
			switchCustomNetworkRequest.current = { resolve, reject };
		});

		const analyticsParams = {
			rpc_url: existingNetwork.rpcUrl,
			chain_id: _chainId,
			source: 'Custom Network API',
			symbol: existingNetwork.ticker,
			block_explorer_url: existingNetwork.blockExplorerUrl,
			network_name: 'rpc'
		};

		if (!switchCustomNetworkApprove) {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_REQUEST_REJECTED, analyticsParams);
			throw ethErrors.provider.userRejectedRequest();
		}

		CurrencyRateController.configure({ nativeCurrency: existingNetwork.ticker });
		NetworkController.setRpcTarget(
			existingNetwork.rpcUrl,
			chainIdDecimal,
			existingNetwork.ticker,
			existingNetwork.nickname
		);

		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_SWITCHED, analyticsParams);

		res.result = null;
		return;
	}

	let endpointChainId;

	try {
		endpointChainId = await jsonRpcRequest(firstValidRPCUrl, 'eth_chainId');
	} catch (err) {
		throw ethErrors.rpc.internal({
			message: `Request for method 'eth_chainId on ${firstValidRPCUrl} failed`,
			data: { networkErr: err }
		});
	}

	if (_chainId !== endpointChainId) {
		throw ethErrors.rpc.invalidParams({
			message: `Chain ID returned by RPC URL ${firstValidRPCUrl} does not match ${_chainId}`,
			data: { chainId: endpointChainId }
		});
	}

	if (typeof chainName !== 'string' || !chainName) {
		throw ethErrors.rpc.invalidParams({
			message: `Expected non-empty string 'chainName'. Received:\n${chainName}`
		});
	}
	const _chainName = chainName.length > 100 ? chainName.substring(0, 100) : chainName;

	if (nativeCurrency !== null) {
		if (typeof nativeCurrency !== 'object' || Array.isArray(nativeCurrency)) {
			throw ethErrors.rpc.invalidParams({
				message: `Expected null or object 'nativeCurrency'. Received:\n${nativeCurrency}`
			});
		}
		if (nativeCurrency.decimals !== 18) {
			throw ethErrors.rpc.invalidParams({
				message: `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided. Received: ${
					nativeCurrency.decimals
				}`
			});
		}

		if (!nativeCurrency.symbol || typeof nativeCurrency.symbol !== 'string') {
			throw ethErrors.rpc.invalidParams({
				message: `Expected a string 'nativeCurrency.symbol'. Received: ${nativeCurrency.symbol}`
			});
		}
	}
	const ticker = nativeCurrency?.symbol || 'ETH';

	if (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 6) {
		throw ethErrors.rpc.invalidParams({
			message: `Expected 2-6 character string 'nativeCurrency.symbol'. Received:\n${ticker}`
		});
	}

	const requestData = {
		chainId: _chainId,
		blockExplorerUrl: firstValidBlockExplorerUrl,
		chainName: _chainName,
		rpcUrl: firstValidRPCUrl,
		ticker
	};

	let alert = null;
	const safeChainsListRequest = await fetch('https://chainid.network/chains.json');
	const safeChainsList = await safeChainsListRequest.json();
	const matchedChain = safeChainsList.find(chain => chain.chainId.toString() === chainIdDecimal);
	let validated = !!matchedChain;

	if (matchedChain) {
		if (
			matchedChain.nativeCurrency?.decimals !== 18 ||
			matchedChain.name.toLowerCase() !== requestData.chainName.toLowerCase() ||
			matchedChain.nativeCurrency?.symbol !== requestData.ticker
		) {
			validated = false;
		}

		const { origin } = new URL(requestData.rpcUrl);
		if (!matchedChain.rpc.map(rpc => new URL(rpc).origin).includes(origin)) {
			validated = false;
		}
	}

	if (!matchedChain) {
		alert = 'UNRECOGNIZED_CHAIN';
	} else if (!validated) {
		alert = 'INVALID_CHAIN';
	}
	requestData.alert = alert;

	const analyticsParamsAdd = {
		rpc_url: firstValidRPCUrl,
		chain_id: chainIdDecimal,
		source: 'Custom Network API',
		symbol: ticker,
		block_explorer_url: firstValidBlockExplorerUrl,
		network_name: 'rpc'
	};

	AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_REQUESTED, analyticsParamsAdd);

	setCustomNetworkToAdd(requestData);
	setShowAddCustomNetworkDialog(true);

	const addCustomNetworkApprove = await new Promise((resolve, reject) => {
		addCustomNetworkRequest.current = { resolve, reject };
	});

	if (!addCustomNetworkApprove) {
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_REQUEST_REJECTED, analyticsParamsAdd);
		throw ethErrors.provider.userRejectedRequest();
	}

	PreferencesController.addToFrequentRpcList(firstValidRPCUrl, chainIdDecimal, ticker, _chainName, {
		blockExplorerUrl: firstValidBlockExplorerUrl
	});

	AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_ADDED, analyticsParamsAdd);

	InteractionManager.runAfterInteractions(() => {
		setCustomNetworkToSwitch(requestData);
		setShowSwitchCustomNetworkDialog('new');
	});

	const switchCustomNetworkApprove = await new Promise((resolve, reject) => {
		switchCustomNetworkRequest.current = { resolve, reject };
	});

	if (!switchCustomNetworkApprove) throw ethErrors.provider.userRejectedRequest();

	CurrencyRateController.configure({ nativeCurrency: ticker });
	NetworkController.setRpcTarget(firstValidRPCUrl, chainIdDecimal, ticker, _chainName);

	res.result = null;
};

export default wallet_addEthereumChain;
