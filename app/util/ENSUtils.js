import Engine from '../core/Engine';
import networkMap from 'ethjs-ens/lib/network-map.json';
import ENS from 'ethjs-ens';

/**
 * Utility class with the single responsibility
 * of caching ENS names
 */
class ENSCache {
	static cache = {};
}

export async function doENSReverseLookup(address, network) {
	const cache = ENSCache.cache[address];
	if (cache) {
		return Promise.resolve(cache);
	}

	const { provider } = Engine.context.NetworkController;

	const networkHasEnsSupport = Boolean(networkMap[network]);

	if (networkHasEnsSupport) {
		this.ens = new ENS({ provider, network });
		try {
			const name = await this.ens.reverse(address);
			const resolvedAddress = await this.ens.lookup(name);
			if (address.toLowerCase() === resolvedAddress.toLowerCase()) {
				ENSCache.cache[address] = name;
				return name;
			}
			// eslint-disable-next-line no-empty
		} catch (e) {}
	}
}

export async function doENSLookup(ensName, network) {
	const { provider } = Engine.context.NetworkController;

	const networkHasEnsSupport = Boolean(networkMap[network]);

	if (networkHasEnsSupport) {
		this.ens = new ENS({ provider, network });
		try {
			const resolvedAddress = await this.ens.lookup(ensName);
			return resolvedAddress;
			// eslint-disable-next-line no-empty
		} catch (e) {}
	}
}
