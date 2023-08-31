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

export async function doENSReverseLookup(address, networkId) {
  const { provider } =
    Engine.context.NetworkController.getProviderAndBlockTracker();
  const { name: cachedName, timestamp } =
    ENSCache.cache[networkId + address] || {};
  const nowTimestamp = Date.now();
  if (timestamp && nowTimestamp - timestamp < CACHE_REFRESH_THRESHOLD) {
    return Promise.resolve(cachedName);
  }

  const networkHasEnsSupport = Boolean(networkMap[networkId]);

  if (networkHasEnsSupport) {
    this.ens = new ENS({ provider, network: networkId });
    try {
      const name = await this.ens.reverse(address);
      const resolvedAddress = await this.ens.lookup(name);
      if (toLowerCaseEquals(address, resolvedAddress)) {
        ENSCache.cache[networkId + address] = { name, timestamp: Date.now() };
        return name;
      }
    } catch (e) {
      if (
        e.message.includes(ENS_NAME_NOT_DEFINED_ERROR) ||
        e.message.includes(INVALID_ENS_NAME_ERROR)
      ) {
        ENSCache.cache[networkId + address] = { timestamp: Date.now() };
      }
    }
  }
}

export async function doENSLookup(ensName, networkId) {
  const { provider } =
    Engine.context.NetworkController.getProviderAndBlockTracker();

  const networkHasEnsSupport = Boolean(networkMap[networkId]);

  if (networkHasEnsSupport) {
    this.ens = new ENS({ provider, network: networkId });
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
