import { colors } from '../styles/common';
/**
 * List of the supported networks
 * including name, id, and color
 *
 * This values are used in certain places like
 * navbar and the network switcher.
 */
const NetworkList = {
	mainnet: {
		name: 'Ethereum Main Network',
		networkId: 1,
		color: '#3cc29e'
	},
	ropsten: {
		name: 'Ropsten Test Network',
		networkId: 3,
		color: '#ff4a8d'
	},
	kovan: {
		name: 'Kovan Test Network',
		networkId: 42,
		color: '#7057ff'
	},
	rinkeby: {
		name: 'Rinkeby Test Network',
		networkId: 4,
		color: '#f6c343'
	},
	rpc: {
		name: 'Private Network',
		color: colors.grey000
	}
};

export default NetworkList;

export function getNetworkTypeById(id) {
	const network = Object.keys(NetworkList).filter(key => NetworkList[key].networkId === parseInt(id, 10));
	if (network.length > 0) {
		return network[0];
	}

	throw new Error(`Unknown network with id ${id}`);
}

export function hasBlockExplorer(key) {
	return key.toLowerCase() !== 'rpc';
}

export function isKnownNetwork(id) {
	const knownNetworks = Object.keys(NetworkList)
		.map(key => NetworkList[key].networkId)
		.filter(id => id !== undefined);
	return knownNetworks.includes(parseInt(id, 10));
}

export function isprivateConnection(hostname) {
	return (
		hostname === 'localhost' ||
		/(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/.test(hostname)
	);
}
