import { AuthorizationList } from '@metamask/transaction-controller';
import {
  SentinelSmartTransactionStatus,
  type SentinelRelaySubmitRequest,
  type SentinelRelaySubmitResponse,
  type SentinelSmartTransactionRequest,
} from '@metamask/sentinel-api-service';
import { Hex, createProjectLogger } from '@metamask/utils';
import {
  getSentinelApiMessenger,
  getSentinelNetworkFlags,
} from './sentinel-api';
import { prefixError } from './error-prefix';

const log = createProjectLogger('transaction-relay');
const ERROR_PREFIX = 'Sentinel: Relay: ';

export const RelayStatus = {
  Pending: SentinelSmartTransactionStatus.Pending,
  Success: SentinelSmartTransactionStatus.Validated,
} as const;

export type RelaySubmitRequest = Omit<
  SentinelRelaySubmitRequest,
  'authorizationList'
> & {
  authorizationList?: AuthorizationList;
};

export type RelayWaitRequest = SentinelSmartTransactionRequest & {
  interval: number;
};

export interface RelayWaitResponse {
  errorReason?: string;
  status: string;
  transactionHash?: Hex;
}

export async function submitRelayTransaction(
  request: RelaySubmitRequest,
): Promise<SentinelRelaySubmitResponse> {
  const { chainId } = request;
  const isSupported = await isRelaySupported(chainId);

  try {
    if (!isSupported) {
      throw new Error(`Chain not supported - ${chainId}`);
    }

    log('Request', request);

    const response = await getSentinelApiMessenger().call(
      'SentinelApiService:submitRelayTransaction',
      request as SentinelRelaySubmitRequest,
    );

    log('Response', response);

    return response;
  } catch (error) {
    throw prefixError(error, ERROR_PREFIX);
  }
}

export async function waitForRelaySuccess(
  request: RelayWaitRequest,
): Promise<RelayWaitResponse> {
  const { chainId, interval, uuid } = request;
  const isSupported = await isRelaySupported(chainId);

  try {
    if (!isSupported) {
      throw new Error(`Chain not supported - ${chainId}`);
    }

    const waitResult = await new Promise<RelayWaitResponse>(
      (resolve, reject) => {
        const intervalId = setInterval(async () => {
          try {
            const relayResult = await pollResult(chainId, uuid);

            if (relayResult.status !== RelayStatus.Pending) {
              clearInterval(intervalId);
              resolve(relayResult);
            }
          } catch (error) {
            clearInterval(intervalId);
            reject(error);
          }
        }, interval);
      },
    );

    const { status, errorReason } = waitResult;

    if (status !== RelayStatus.Success) {
      throw new Error(`Transaction failed - ${status} - ${errorReason}`);
    }

    return waitResult;
  } catch (error) {
    throw prefixError(error, ERROR_PREFIX);
  }
}

export async function isRelaySupported(chainId: Hex): Promise<boolean> {
  const networkData = await getSentinelNetworkFlags(chainId);

  if (!networkData?.relayTransactions) {
    log('Chain is not supported', chainId);
    return false;
  }

  return true;
}

async function pollResult(
  chainId: Hex,
  uuid: string,
): Promise<RelayWaitResponse> {
  log('Polling request', chainId, uuid);

  const { transactions } = await getSentinelApiMessenger().call(
    'SentinelApiService:getSmartTransaction',
    { chainId, uuid },
  );

  log('Polling response', transactions);

  const transaction = transactions?.[0];

  return {
    errorReason: transaction?.errorReason ?? 'Unknown error',
    status: transaction?.status as string,
    transactionHash: transaction?.hash as Hex | undefined,
  };
}
