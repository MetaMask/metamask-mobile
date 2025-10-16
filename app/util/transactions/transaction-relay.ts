import { AuthorizationList } from '@metamask/transaction-controller';
import { Hex, Json, createProjectLogger } from '@metamask/utils';
import { buildUrl, getSentinelNetworkFlags } from './sentinel-api';
import jsonRpcRequest from '../../util/jsonRpcRequest';

const log = createProjectLogger('transaction-relay');

export interface RelaySubmitRequest {
  authorizationList?: AuthorizationList;
  chainId: Hex;
  data: Hex;
  to: Hex;
}

export interface RelayWaitRequest {
  chainId: Hex;
  interval: number;
  uuid: string;
}

export interface RelaySubmitResponse {
  uuid: string;
}

export interface RelayWaitResponse {
  transactionHash?: Hex;
  status: string;
}

export enum RelayStatus {
  Pending = 'PENDING',
  Success = 'VALIDATED',
}

export const RELAY_RPC_METHOD = 'eth_sendRelayTransaction';

export async function submitRelayTransaction(
  request: RelaySubmitRequest,
): Promise<RelaySubmitResponse> {
  const { chainId } = request;

  const url = await getRelayUrl(chainId);

  if (!url) {
    throw new Error(`Chain not supported by transaction relay - ${chainId}`);
  }

  log('Request', url, request);

  const response = (await jsonRpcRequest(url, RELAY_RPC_METHOD, [
    request as unknown as Json,
  ])) as RelaySubmitResponse;

  log('Response', response);

  return response;
}

export async function waitForRelayResult(
  request: RelayWaitRequest,
): Promise<RelayWaitResponse> {
  const { chainId, interval, uuid } = request;

  const baseUrl = await getRelayUrl(chainId);

  if (!baseUrl) {
    throw new Error(`Chain not supported by transaction relay - ${chainId}`);
  }

  const url = `${baseUrl}smart-transactions/${uuid}`;

  return new Promise<RelayWaitResponse>((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {
        const result = await pollResult(url);
        if (result.status !== RelayStatus.Pending) {
          clearInterval(intervalId);
          resolve(result);
        }
      } catch (error) {
        clearInterval(intervalId);
        reject(error);
      }
    }, interval);
  });
}

export async function isRelaySupported(chainId: Hex): Promise<boolean> {
  return Boolean(await getRelayUrl(chainId));
}

async function pollResult(url: string): Promise<RelayWaitResponse> {
  log('Polling request', url);

  const response = await fetch(url);

  log('Polling response', response);

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Failed to fetch relay transaction status: ${response.status} - ${errorBody}`,
    );
  }

  const data = await response.json();
  const transaction = data?.transactions[0];
  const { hash: transactionHash, status } = transaction || {};

  return {
    status,
    transactionHash,
  };
}

async function getRelayUrl(chainId: Hex): Promise<string | undefined> {
  const networkData = await getSentinelNetworkFlags(chainId);

  if (!networkData?.relayTransactions) {
    log('Chain is not supported', chainId);
    return undefined;
  }

  return buildUrl(networkData.network);
}
