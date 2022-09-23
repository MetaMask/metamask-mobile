// eslint-disable-next-line import/no-unresolved
import '@ethersproject/shims';

import Engine from '../core/Engine';
import ensNetworkMap from 'ethereum-ens-network-map';
import { ethers } from 'ethers';
import { toLowerCaseEquals } from '../util/general';
import { getEthersNetworkTypeById } from './networks';
import Logger from './Logger';
const ENS_NAME_NOT_DEFINED_ERROR = 'ENS name not defined';
const INVALID_ENS_NAME_ERROR = 'invalid ENS name';
// One hour cache threshold.
const CACHE_REFRESH_THRESHOLD = 60 * 60 * 1000;

/**
 * Utility class with the single responsibility
 * of caching ENS names
 */
export class ENSCache {
  static cache = {};
}

export function getEnsProvider(network, provider) {
  const ensAddress = ensNetworkMap[network];
  if (ensAddress) {
    const networkType = getEthersNetworkTypeById(network);
    return new ethers.providers.Web3Provider(provider, {
      chainId: parseInt(network, 10),
      name: networkType,
      ensAddress,
    });
  }
}

export async function doENSReverseLookup(address, network) {
  const { provider } = Engine.context.NetworkController;
  const { name: cachedName, timestamp } =
    ENSCache.cache[network + address] || {};
  const nowTimestamp = Date.now();
  if (timestamp && nowTimestamp - timestamp < CACHE_REFRESH_THRESHOLD) {
    return Promise.resolve(cachedName);
  }

  try {
    const ensProvider = await getEnsProvider(network, provider);
    if (ensProvider) {
      const name = await ensProvider.lookupAddress(address);
      const resolvedAddress = await ensProvider.resolveName(name);
      if (toLowerCaseEquals(address, resolvedAddress)) {
        ENSCache.cache[network + address] = { name, timestamp: Date.now() };
        return name;
      }
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

export async function doENSLookup(ensName, network) {
  const { provider } = Engine.context.NetworkController;
  const ensProvider = await getEnsProvider(network, provider);
  if (ensProvider) {
    try {
      const resolvedAddress = await ensProvider.resolveName(ensName);
      return resolvedAddress;
    } catch (e) {
      Logger.error(e);
    }
  }
}

export function isDefaultAccountName(name) {
  return /^Account \d*$/.test(name);
}
