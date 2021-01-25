import { colors } from '../styles/common';
import URL from 'url-parse';
import AppConstants from '../core/AppConstants';
import { MAINNET, ROPSTEN, KOVAN, RINKEBY, GOERLI, RPC } from '../../app/constants/network';

/**
 * List of the supported networks
 * including name, id, and color
 *
 * This values are used in certain places like
 * navbar and the network switcher.
 */
const NetworkList = {
	[MAINNET]: {
		name: 'Ethereum Main Network',
		shortName: 'Ethereum',
		networkId: 1,
		chainId: 1,
		color: '#3cc29e'
	},
	[ROPSTEN]: {
		name: 'Ropsten Test Network',
		shortName: 'Ropsten',
		networkId: 3,
		chainId: 3,
		color: '#ff4a8d'
	},
	[KOVAN]: {
		name: 'Kovan Test Network',
		shortName: 'Kovan',
		networkId: 42,
		chainId: 42,
		color: '#7057ff'
	},
	[RINKEBY]: {
		name: 'Rinkeby Test Network',
		shortName: 'Rinkeby',
		networkId: 4,
		chainId: 4,
		color: '#f6c343'
	},
	[GOERLI]: {
		name: 'Goerli Test Network',
		shortName: 'Goerli',
		networkId: 5,
		chainId: 5,
		color: '#3099f2'
	},
	[RPC]: {
		name: 'Private Network',
		shortName: 'Private',
		color: colors.grey000
	}
};

const NetworkListKeys = Object.keys(NetworkList);

export default NetworkList;

export const getAllNetworks = () => NetworkListKeys.filter(name => name !== RPC);

export const isMainNet = (network, provider) => {
	const is_main = network?.provider?.type === MAINNET || network === String(1);
	return is_main;
};

export const getNetworkName = id => NetworkListKeys.find(key => NetworkList[key].networkId === Number(id));

export function getNetworkTypeById(id) {
	if (!id) {
		throw new Error('Missing network Id');
	}
	const network = NetworkListKeys.filter(key => NetworkList[key].networkId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}

	throw new Error(`Unknown network with id ${id}`);
}

export function hasBlockExplorer(key) {
	return key.toLowerCase() !== RPC;
}

export function isKnownNetwork(id) {
	const knownNetworks = NetworkListKeys.map(key => NetworkList[key].networkId).filter(id => id !== undefined);
	return knownNetworks.includes(parseInt(id, 10));
}

export function isprivateConnection(hostname) {
	return (
		hostname === 'localhost' ||
		/(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/.test(hostname)
	);
}

/**
 * Returns custom block explorer for specific rpcTarget
 *
 * @param {string} rpcTarget
 * @param {array<object>} frequentRpcList
 */
export function findBlockExplorerForRpc(rpcTarget, frequentRpcList) {
	const frequentRpc = frequentRpcList.find(({ rpcUrl }) => rpcTarget === rpcUrl);
	if (frequentRpc) {
		return frequentRpc.rpcPrefs && frequentRpc.rpcPrefs.blockExplorerUrl;
	}
	return undefined;
}

/**
 * From block explorer url, get rendereable name or undefined
 *
 * @param {string} blockExplorerUrl - block explorer url
 */
export function getBlockExplorerName(blockExplorerUrl) {
	if (!blockExplorerUrl) return undefined;
	const hostname = new URL(blockExplorerUrl).hostname;
	if (!hostname) return undefined;
	const tempBlockExplorerName = hostname.split('.')[0];
	if (!tempBlockExplorerName || !tempBlockExplorerName[0]) return undefined;
	return tempBlockExplorerName[0].toUpperCase() + tempBlockExplorerName.slice(1);
}

export function isSafeChainId(chainId) {
	return Number.isSafeInteger(chainId) && chainId > 0 && chainId <= AppConstants.MAX_SAFE_CHAIN_ID;
}
