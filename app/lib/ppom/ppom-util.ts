import { createProjectLogger } from '@metamask/utils';
import {
  setSecurityAlertResponse,
  clearSecurityAlertResponse,
} from '../../reducers/security-alerts';
import {
  Reason,
  ResultType,
  SecurityAlertResponse,
  SecurityAlertSource,
} from '../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';
import Logger from '../../util/Logger';
import { updateSecurityAlertResponse } from '../../util/transaction-controller';
import {
  TransactionControllerUnapprovedTransactionAddedEvent,
  TransactionMeta,
  TransactionParams,
  normalizeTransactionParams,
} from '@metamask/transaction-controller';
import { WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import AppConstants from '../../core/AppConstants';
import { isUUID } from '../../core/SDKConnect/utils/isUUID';
import { validateWithSecurityAlertsAPI } from './security-alerts-api';
import { Messenger } from '@metamask/messenger';
import { SignatureStateChange } from '@metamask/signature-controller';
import cloneDeep from 'lodash/cloneDeep';

export interface PPOMRequest {
  method: string;
  params: unknown[];

  // Optional
  id?: number | string;
  jsonrpc?: string;
  origin?: string;
  networkClientId?: string;
}

export type PPOMMessenger = Messenger<
  'PPOMMessenger',
  never,
  SignatureStateChange | TransactionControllerUnapprovedTransactionAddedEvent
>;

const log = createProjectLogger('ppom-util');

const METHOD_SEND_TRANSACTION = 'eth_sendTransaction';
const TRANSACTION_METHODS = [METHOD_SEND_TRANSACTION, 'eth_sendRawTransaction'];
export const METHOD_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3';
export const METHOD_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4';

const CONFIRMATION_METHODS = Object.freeze([
  'eth_sendRawTransaction',
  METHOD_SEND_TRANSACTION,
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
]);

const SECURITY_ALERT_RESPONSE_FAILED = {
  result_type: ResultType.Failed,
  reason: Reason.failed,
  description: 'Validating the confirmation failed by throwing error.',
};

const SECURITY_ALERT_RESPONSE_IN_PROGRESS = {
  result_type: ResultType.RequestInProgress,
  reason: Reason.requestInProgress,
  description: 'Validating the confirmation in progress.',
};

async function validateRequest(
  req: PPOMRequest,
  {
    transactionMeta,
    securityAlertId,
  }: {
    transactionMeta?: TransactionMeta;
    securityAlertId?: string;
  } = {},
) {
  const { AccountsController, NetworkController } = Engine.context;

  const { method, networkClientId: requestNetworkClientId } = req;

  const {
    chainId: transactionChainId,
    id: transactionId,
    networkClientId: transactionNetworkClientId,
  } = transactionMeta ?? {};

  const globalNetworkClientId =
    NetworkController.state?.selectedNetworkClientId;

  const networkClientId =
    transactionNetworkClientId ??
    requestNetworkClientId ??
    globalNetworkClientId;

  const chainId =
    transactionChainId ??
    NetworkController.getNetworkClientById(networkClientId).configuration
      .chainId;

  const isConfirmationMethod = CONFIRMATION_METHODS.includes(method);
  const isBlockaidFeatEnabled = await isBlockaidFeatureEnabled();

  if (!isBlockaidFeatEnabled || !isConfirmationMethod) {
    return;
  }

  if (method === METHOD_SEND_TRANSACTION) {
    const internalAccounts = AccountsController.listAccounts();
    const { from: fromAddress, to: toAddress } = req
      ?.params?.[0] as Partial<TransactionParams>;

    if (
      internalAccounts.some(
        ({ address }: { address: string }) =>
          address?.toLowerCase() === toAddress?.toLowerCase(),
      ) &&
      toAddress !== fromAddress
    ) {
      return;
    }
  }

  const isTransaction = isTransactionRequest(req);
  let securityAlertResponse: SecurityAlertResponse | undefined;

  try {
    if (isTransaction && !transactionId && !securityAlertId) {
      securityAlertResponse = SECURITY_ALERT_RESPONSE_FAILED;
      return;
    }

    dispatchSecurityAlertResponse(
      req,
      SECURITY_ALERT_RESPONSE_IN_PROGRESS,
      transactionId,
      { securityAlertId },
    );

    const normalizedRequest = normalizeRequest(req, transactionMeta);

    log('Normalized request', normalizedRequest);

    securityAlertResponse = await validateWithAPI(chainId, normalizedRequest);

    securityAlertResponse = {
      ...securityAlertResponse,
      req: req as unknown as Record<string, unknown>,
      chainId,
    };
  } catch (e) {
    Logger.log(`Error validating JSON RPC using PPOM: ${e}`);
  } finally {
    if (!securityAlertResponse) {
      securityAlertResponse = SECURITY_ALERT_RESPONSE_FAILED;
    }

    dispatchSecurityAlertResponse(req, securityAlertResponse, transactionId, {
      updateControllerState: true,
      securityAlertId,
    });
  }
}

async function validateWithAPI(
  chainId: string,
  request: PPOMRequest,
): Promise<SecurityAlertResponse> {
  try {
    log('Validating with API', chainId, request);

    const response = await validateWithSecurityAlertsAPI(chainId, request);

    return {
      ...response,
      source: SecurityAlertSource.API,
    };
  } catch (e) {
    Logger.log(`Error validating request with security alerts API: ${e}`);
    return {
      ...SECURITY_ALERT_RESPONSE_FAILED,
      source: SecurityAlertSource.API,
    };
  }
}

function getTransactionIdForSecurityAlertId(securityAlertId?: string) {
  if (!securityAlertId) return;
  const confirmation =
    Engine.context.TransactionController.state.transactions.find(
      (meta) =>
        (
          meta.securityAlertResponse as SecurityAlertResponse & {
            securityAlertId: string;
          }
        )?.securityAlertId === securityAlertId,
    );
  return confirmation?.id;
}

function updateSecurityResultForTransaction(
  transactionId: string | undefined,
  response: SecurityAlertResponse,
  updateControllerState: boolean = false,
  securityAlertId?: string,
) {
  if (!transactionId) return;

  store.dispatch(setSecurityAlertResponse(transactionId, response));

  if (updateControllerState) {
    updateSecurityAlertResponse(
      transactionId as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...response, securityAlertId } as any,
    );
  }
}

function fetchTransactionIdAndUpdateSecurityResultForTransaction(
  response: SecurityAlertResponse,
  updateControllerState?: boolean,
  securityAlertId?: string,
) {
  const intervalId = setInterval(() => {
    const transactionId = getTransactionIdForSecurityAlertId(securityAlertId);
    if (transactionId) {
      updateSecurityResultForTransaction(
        transactionId,
        response,
        updateControllerState,
        securityAlertId,
      );
      clearInterval(intervalId);
    }
  }, 100);
}

function dispatchSecurityAlertResponse(
  request: PPOMRequest,
  response: SecurityAlertResponse,
  transactionId?: string,
  {
    updateControllerState,
    securityAlertId,
  }: { updateControllerState?: boolean; securityAlertId?: string } = {},
) {
  if (isTransactionRequest(request)) {
    if (securityAlertId && !transactionId) {
      fetchTransactionIdAndUpdateSecurityResultForTransaction(
        response,
        updateControllerState,
        securityAlertId,
      );
    } else {
      updateSecurityResultForTransaction(
        transactionId,
        response,
        updateControllerState,
        securityAlertId,
      );
    }
  } else {
    // For signatures, use the RPC request ID as the key
    const signatureId = request.id?.toString();
    if (signatureId) {
      store.dispatch(setSecurityAlertResponse(signatureId, response));
    }
  }
}

function isTransactionRequest(request: PPOMRequest) {
  return TRANSACTION_METHODS.includes(request.method);
}

function normalizeSignatureRequest(request: PPOMRequest): PPOMRequest {
  // This is a temporary fix to prevent a PPOM bypass
  if (
    request.method !== METHOD_SIGN_TYPED_DATA_V4 &&
    request.method !== METHOD_SIGN_TYPED_DATA_V3
  ) {
    return request;
  }

  if (!Array.isArray(request.params)) {
    return request;
  }

  return {
    ...request,
    params: request.params.slice(0, 2),
  };
}

/**
 * Whether a request origin identifies a path where the wallet cannot verify
 * the dapp's identity: a remote transport prefix (WalletConnect `wc::`,
 * MetaMask SDK v1 `MMSDKREMOTE::`, MetaMask Connect / MWP `MMSDKCONNECTV2::`),
 * a bare connection/channel UUID (the SDK v1 / MWP request origin once the
 * transport prefix is stripped), or the `deeplink` / `qr-code` placeholders.
 *
 * On these paths any URL accompanying the origin is self-reported by the
 * sender, and the rest of the value (connection ids, placeholders) is
 * meaningless to the scan.
 */
function isUnverifiableOrigin(origin: string): boolean {
  return (
    origin.startsWith(WALLET_CONNECT_ORIGIN) ||
    origin.startsWith(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN) ||
    origin.startsWith(AppConstants.MM_SDK.SDK_CONNECT_V2_ORIGIN) ||
    origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK ||
    origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE ||
    isUUID(origin)
  );
}

/**
 * Remove the origin from the scan request when it comes from an unverifiable
 * path. Blockaid treats the URL as a core heuristic that can flip a scan
 * verdict between malicious and benign, so a self-reported (spoofable) origin
 * must never reach it. Previously the transport prefix was stripped and the
 * remaining self-reported domain was still sent.
 *
 * This is a defense-in-depth net for origins that carry a transport marker.
 * Call sites where the transport is known but the origin is a bare
 * self-reported URL (indistinguishable from a verified hostname here) must
 * drop the origin themselves: see `WalletConnect2Session.handleSendTransaction`,
 * the signature handlers in `RPCMethodMiddleware`, and
 * `BackgroundBridge.validateSecurity`.
 */
function sanitizeRequestOrigin(request: PPOMRequest): PPOMRequest {
  if (request.origin && isUnverifiableOrigin(request.origin)) {
    delete request.origin;
  }
  return request;
}

function normalizeRequest(
  request: PPOMRequest,
  transactionMeta?: TransactionMeta,
): PPOMRequest {
  let normalizedRequest = cloneDeep(request);

  normalizedRequest = sanitizeRequestOrigin(normalizedRequest);

  normalizedRequest = normalizeSignatureRequest(normalizedRequest);

  normalizedRequest = normalizeTransactionRequest(
    normalizedRequest,
    transactionMeta,
  );

  return normalizedRequest;
}

function normalizeTransactionRequest(
  request: PPOMRequest,
  transactionMeta?: TransactionMeta,
): PPOMRequest {
  if (request.method !== METHOD_SEND_TRANSACTION) {
    return request;
  }

  const txParams = (
    Array.isArray(request.params) ? request.params[0] : {}
  ) as TransactionParams;

  // Provide the estimated gas to PPOM rather than relying on PPOM to estimate the gas values
  txParams.gas = transactionMeta?.txParams?.gas;
  txParams.gasPrice =
    transactionMeta?.txParams?.maxFeePerGas ??
    transactionMeta?.txParams?.gasPrice;

  // Remove unused request params for PPOM
  delete txParams.gasLimit;
  delete txParams.maxFeePerGas;
  delete txParams.maxPriorityFeePerGas;
  delete txParams.type;

  const normalizedParams = normalizeTransactionParams(txParams);

  log('Normalized transaction params', normalizedParams);

  return {
    ...request,
    params: [normalizedParams],
  };
}

function clearSignatureSecurityAlertResponse(signatureId: string) {
  store.dispatch(clearSecurityAlertResponse(signatureId));
}

function createValidatorForSecurityAlertId(securityAlertId: string) {
  return (req: PPOMRequest) => validateRequest(req, { securityAlertId });
}

export default {
  validateRequest,
  createValidatorForSecurityAlertId,
  clearSignatureSecurityAlertResponse,
};
