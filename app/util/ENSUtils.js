import Engine from '../core/Engine';
import networkMap from 'ethjs-ens/lib/network-map.json';
import ENS from 'ethjs-ens';
import { toLowerCaseEquals } from '../util/general';
const ENS_NAME_NOT_DEFINED_ERROR = 'ENS name not defined';
const INVALID_ENS_NAME_ERROR = 'invalid ENS name';
// One hour cache threshold.
const CACHE_REFRESH_THRESHOLD = 60 * 60 * 1000;
import { EMPTY_ADDRESS } from '../constants/transaction';

/**
 * Utility class with the single responsibility
 * of caching ENS names
 */
export class ENSCache {
  static cache = {};
}

export async function doENSReverseLookup(address, network) {
  const { provider } = Engine.context.NetworkController;
  const { name: cachedName, timestamp } =
    ENSCache.cache[network + address] || {};
  const nowTimestamp = Date.now();
  if (timestamp && nowTimestamp - timestamp < CACHE_REFRESH_THRESHOLD) {
    return Promise.resolve(cachedName);
  }

  const networkHasEnsSupport = Boolean(networkMap[network]);

  if (networkHasEnsSupport) {
    this.ens = new ENS({ provider, network });
    try {
      const name = await this.ens.reverse(address);
      const resolvedAddress = await this.ens.lookup(name);
      if (toLowerCaseEquals(address, resolvedAddress)) {
        ENSCache.cache[network + address] = { name, timestamp: Date.now() };
        return name;
      }
    } catch (e) {
      if (
        e.message.includes(ENS_NAME_NOT_DEFINED_ERROR) ||
        e.message.includes(INVALID_ENS_NAME_ERROR)
      ) {
        ENSCache.cache[network + address] = { timestamp: Date.now() };
      }
    }
  }
}

export async function doENSLookup(ensName, network) {
  const { provider } = Engine.context.NetworkController;

  const networkHasEnsSupport = Boolean(networkMap[network]);

  if (networkHasEnsSupport) {
    this.ens = new ENS({ provider, network });
    try {
      const resolvedAddress = await this.ens.lookup(ensName);
      if (resolvedAddress === EMPTY_ADDRESS) return;
      return resolvedAddress;
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}

export function isDefaultAccountName(name) {
  return /^Account \d*$/.test(name);
}
