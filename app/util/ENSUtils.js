import Engine from '../core/Engine';
import networkMap from 'ethjs-ens/lib/network-map.json';
import ENS from 'ethjs-ens';
import { toLowerCaseEquals } from '../util/general';

/**
 * Utility class with the single responsibility
 * of caching ENS names
 */
class ENSCache {
	static cache = {};
}

export async function doENSReverseLookup(address, network) {
	const cache = ENSCache.cache[network + address];
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
			if (toLowerCaseEquals(address, resolvedAddress)) {
				ENSCache.cache[network + address] = name;
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

export function isDefaultAccountName(name) {
	return /^Account \d*$/.test(name);
}
