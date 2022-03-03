import Engine from '../Engine';
import { ethErrors } from 'eth-json-rpc-errors';
import { getDefaultNetworkByChainId, isPrefixedFormattedHexString, isSafeChainId } from '../../util/networks';
import AnalyticsV2 from '../../util/analyticsV2';

const wallet_switchEthereumChain = async ({
	req,
	res,
	showSwitchCustomNetworkDialog,
	switchCustomNetworkRequest,
	setCustomNetworkToSwitch,
	setShowSwitchCustomNetworkDialog,
}) => {
	if (showSwitchCustomNetworkDialog) return;
	switchCustomNetworkRequest.current = null;

	const { PreferencesController, CurrencyRateController, NetworkController } = Engine.context;
	const params = req.params?.[0];

	if (!params || typeof params !== 'object') {
		throw ethErrors.rpc.invalidParams({
			message: `Expected single, object parameter. Received:\n${JSON.stringify(req.params)}`,
		});
	}

	const { chainId } = params;

	const allowedKeys = {
		chainId: true,
	};

	const extraKeys = Object.keys(params).filter((key) => !allowedKeys[key]);
	if (extraKeys.length) {
		throw ethErrors.rpc.invalidParams(
			`Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`
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

	const frequentRpcList = PreferencesController.state.frequentRpcList;
	const existingNetworkDefault = getDefaultNetworkByChainId(chainIdDecimal);
	const existingNetworkRPC = frequentRpcList.find((rpc) => rpc.chainId === chainIdDecimal);
	if (existingNetworkRPC || existingNetworkDefault) {
		const currentChainId = NetworkController.state.provider.chainId;
		if (currentChainId === chainIdDecimal) {
			res.result = null;
			return;
		}

		if (existingNetworkRPC) {
			setCustomNetworkToSwitch({
				rpcUrl: existingNetworkRPC.rpcUrl,
				chainId: _chainId,
				chainName: existingNetworkRPC.nickname,
				ticker: existingNetworkRPC.ticker,
			});
		} else {
			setCustomNetworkToSwitch({
				chainId: _chainId,
				chainColor: existingNetworkDefault.color,
				chainName: existingNetworkDefault.shortName,
				ticker: 'ETH',
			});
		}

		setShowSwitchCustomNetworkDialog('switch');

		const switchCustomNetworkApprove = await new Promise((resolve, reject) => {
			switchCustomNetworkRequest.current = { resolve, reject };
		});

		let analyticsParams = {
			chain_id: _chainId,
			source: 'Switch Network API',
		};
		if (existingNetworkRPC) {
			analyticsParams = {
				...analyticsParams,
				rpc_url: existingNetworkRPC?.rpcUrl,
				symbol: existingNetworkRPC?.ticker,
				block_explorer_url: existingNetworkRPC?.blockExplorerUrl,
				network_name: 'rpc',
			};
		} else {
			analyticsParams = {
				...analyticsParams,
				network_name: existingNetworkDefault?.shortName,
			};
		}

		if (!switchCustomNetworkApprove) {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_REQUEST_REJECTED, analyticsParams);
			throw ethErrors.provider.userRejectedRequest();
		}

		if (existingNetworkRPC) {
			CurrencyRateController.setNativeCurrency(existingNetworkRPC.ticker);
			NetworkController.setRpcTarget(
				existingNetworkRPC.rpcUrl,
				chainIdDecimal,
				existingNetworkRPC.ticker,
				existingNetworkRPC.nickname
			);
		} else {
			CurrencyRateController.setNativeCurrency('ETH');
			NetworkController.setProviderType(existingNetworkDefault.networkType);
		}

		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.NETWORK_SWITCHED, analyticsParams);

		res.result = null;
		return;
	}

	throw ethErrors.provider.custom({
		code: 4902, // To-be-standardized "unrecognized chain ID" error
		message: `Unrecognized chain ID "${_chainId}". Try adding the chain using wallet_addEthereumChain first.`,
	});
};

export default wallet_switchEthereumChain;
