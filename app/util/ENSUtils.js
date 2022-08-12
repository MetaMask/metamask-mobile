import Engine from '../core/Engine';
import ensNetworkMap from 'ethereum-ens-network-map';
import { ethers } from 'ethers';
import { toLowerCaseEquals } from '../util/general';
import { getEthersNetworkTypeById } from './networks';
import https from "https";

/**
 * Utility class with the single responsibility
 * of caching ENS names
 */
class ENSCache {
  static cache = {};
}

const url1 = 'https://jsonplaceholder.typicode.com/todos/1'
const url2 = 'https://offchain-resolver-example.uc.r.appspot.com/0xc1735677a60884abbcf72295e88d47764beda282/0x9061b92300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000001701310f6f6666636861696e6578616d706c65036574680000000000000000000000000000000000000000000000000000000000000000000000000000000000243b3b57de1c9fb8c1fe76f464ccec6d2c003169598fdfcbcb6bbddf6af9c097a39fa0048c00000000000000000000000000000000000000000000000000000000.json'

function getResponse(url) {
  return new Promise((resolve, reject) => {
    return https.get(url, (res) => {
      console.log(JSON.stringify({url, statusCode:res.statusCode, header:res.headers}, null, 2));
      res.on('data', (d) => {
        resolve(d.toString());
      });
    }).on('error', (e) => {
      console.error('**error');
      console.error(e);
      reject(e)
    });
  })
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
  const cache = ENSCache.cache[network + address];
  const { provider } = Engine.context.NetworkController;
  if (cache) {
    return Promise.resolve(cache);
  }
  const ensProvider = await getEnsProvider(network, provider);
  if (ensProvider) {
    try {
      const name = await ensProvider.lookupAddress(address);
      const resolvedAddress = await ensProvider.resolveName(name);
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
  const ensProvider = await getEnsProvider(network, provider);
  console.log('**doENSLookup1', ensName)
  if (ensProvider) {
    try {
      console.log('**doENSLookup2')
      console.log('***doENSLookup3 sample url', await getResponse(url1));
      console.log('***doENSLookup4 ccip gateway url', await getResponse(url2));
      const resolvedAddress = await ensProvider.resolveName(ensName);
      console.log('**doENSLookup5', resolvedAddress)
      return resolvedAddress;
      // eslint-disable-next-line no-empty
    } catch (e) {
      console.log('**doENSLookup6', e.message)
    }
  }
}

export function isDefaultAccountName(name) {
  return /^Account \d*$/.test(name);
}
