import { AuthorizationList } from '@metamask/transaction-controller';
import { SentinelMeta } from '@metamask/smart-transactions-controller';
import {
  Hex,
  Json,
  createProjectLogger,
  isStrictHexString,
} from '@metamask/utils';
import jsonRpcRequest from '../../util/jsonRpcRequest';
import {
  buildUrl,
  getSentinelApiHeadersAsync,
  getSentinelNetworkFlags,
} from './sentinel-api';
import Logger from '../../util/Logger';

const log = createProjectLogger('transaction-relay');

export interface RelaySubmitRequest {
  authorizationList?: AuthorizationList;
  chainId: Hex;
  data: Hex;
  to: Hex;
  metadata?: SentinelMeta;
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

/**
 * Validates a RelaySubmitRequest for known issues that would cause server-side
 * decode failures. Only logs field paths and type mismatches -- never raw values.
 *
 * @param request - The relay request to validate.
 * @returns Array of violation descriptions, empty if valid.
 */
export function validateRelayRequest(request: RelaySubmitRequest): string[] {
  const violations: string[] = [];

  try {
    JSON.stringify(request);
  } catch (e) {
    violations.push(
      `root: JSON.stringify failed (${e instanceof Error ? e.message : 'unknown'})`,
    );
    return violations;
  }

  const roundtrip = JSON.parse(JSON.stringify(request));
  const originalKeys = Object.keys(request).sort().join(',');
  const roundtripKeys = Object.keys(roundtrip).sort().join(',');
  if (originalKeys !== roundtripKeys) {
    violations.push(
      `root: key mismatch after roundtrip (original: [${originalKeys}], roundtrip: [${roundtripKeys}])`,
    );
  }

  if (!isStrictHexString(request.chainId)) {
    violations.push(
      `chainId: expected hex string, got ${typeof request.chainId}`,
    );
  }
  if (!isStrictHexString(request.data)) {
    violations.push(`data: expected hex string, got ${typeof request.data}`);
  }
  if (!isStrictHexString(request.to)) {
    violations.push(`to: expected hex string, got ${typeof request.to}`);
  }

  if (request.authorizationList) {
    request.authorizationList.forEach((auth, i) => {
      const prefix = `authorizationList[${i}]`;
      if (auth.address !== undefined && !isStrictHexString(auth.address)) {
        violations.push(
          `${prefix}.address: expected hex string, got ${typeof auth.address}`,
        );
      }
      if (auth.chainId !== undefined && !isStrictHexString(auth.chainId)) {
        violations.push(
          `${prefix}.chainId: expected hex string, got ${typeof auth.chainId}`,
        );
      }
      if (auth.nonce !== undefined && !isStrictHexString(auth.nonce)) {
        violations.push(
          `${prefix}.nonce: expected hex string, got ${typeof auth.nonce}`,
        );
      }
      if (auth.r !== undefined && !isStrictHexString(auth.r)) {
        violations.push(
          `${prefix}.r: expected hex string, got ${typeof auth.r}`,
        );
      }
      if (auth.s !== undefined && !isStrictHexString(auth.s)) {
        violations.push(
          `${prefix}.s: expected hex string, got ${typeof auth.s}`,
        );
      }
      if (auth.yParity !== undefined && !isStrictHexString(auth.yParity)) {
        violations.push(
          `${prefix}.yParity: expected hex string, got ${typeof auth.yParity}`,
        );
      }
    });
  }

  return violations;
}

export async function submitRelayTransaction(
  request: RelaySubmitRequest,
): Promise<RelaySubmitResponse> {
  const { chainId } = request;

  const url = await getRelayUrl(chainId);

  if (!url) {
    throw new Error(`Chain not supported by transaction relay - ${chainId}`);
  }

  const violations = validateRelayRequest(request);
  if (violations.length > 0) {
    Logger.error(
      new Error(`relay-request-validation: ${violations.join('; ')}`),
    );
  }

  log('Request', url, request);

  const headers = await getSentinelApiHeadersAsync();

  const response = (await jsonRpcRequest(
    url,
    RELAY_RPC_METHOD,
    [request as unknown as Json],
    { headers },
  )) as RelaySubmitResponse;

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
        const headers = await getSentinelApiHeadersAsync();
        const result = await pollResult(url, headers);
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

async function pollResult(
  url: string,
  headers: HeadersInit = {},
): Promise<RelayWaitResponse> {
  log('Polling request', url);

  const response = await fetch(url, { headers });

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
