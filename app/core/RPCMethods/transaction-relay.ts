import { Hex, createProjectLogger } from '@metamask/utils';
import { convertHexToDecimal } from '@metamask/controller-utils';

const log = createProjectLogger('transaction-relay');

interface RelayNetwork {
  network: string;
  relayTransactions: boolean;
}

interface RelayNetworkResponse {
  [chainIdDecimal: string]: RelayNetwork;
}

const BASE_URL = 'https://tx-sentinel-{0}.api.cx.metamask.io/';
const ENDPOINT_NETWORKS = 'networks';

export async function isRelaySupported(chainId: Hex): Promise<boolean> {
  return Boolean(await getRelayUrl(chainId));
}

async function getRelayUrl(chainId: Hex): Promise<string | undefined> {
  const networkData = await getNetworkData();
  const chainIdDecimal = convertHexToDecimal(chainId);
  const network = networkData[chainIdDecimal];

  if (!network?.relayTransactions) {
    log('Chain is not supported', chainId);
    return undefined;
  }

  return buildUrl(network.network);
}

async function getNetworkData(): Promise<RelayNetworkResponse> {
  const url = `${buildUrl('ethereum-mainnet')}${ENDPOINT_NETWORKS}`;
  const response = await fetch(url);
  return response.json();
}

function buildUrl(subdomain: string): string {
  return BASE_URL.replace('{0}', subdomain);
}
