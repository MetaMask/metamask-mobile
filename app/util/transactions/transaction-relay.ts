import { Hex, createProjectLogger } from '@metamask/utils';
import { buildUrl, getSentinelNetworkFlags } from './sentinel-api';

const log = createProjectLogger('transaction-relay');

export async function isRelaySupported(chainId: Hex): Promise<boolean> {
  return Boolean(await getRelayUrl(chainId));
}

async function getRelayUrl(chainId: Hex): Promise<string | undefined> {
  const networkData = await getSentinelNetworkFlags(chainId);

  if (!networkData?.relayTransactions) {
    log('Chain is not supported', chainId);
    return undefined;
  }

  return buildUrl(networkData.network);
}
