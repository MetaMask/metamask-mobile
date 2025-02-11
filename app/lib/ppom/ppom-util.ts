import setSignatureRequestSecurityAlertResponse from '../../actions/signatureRequest';
import { setTransactionSecurityAlertResponse } from '../../actions/transaction';
import {
  Reason,
  ResultType,
  SecurityAlertResponse,
  SecurityAlertSource,
} from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';
import Logger from '../../util/Logger';
import { updateSecurityAlertResponse } from '../../util/transaction-controller';
import {
  TransactionParams,
  normalizeTransactionParams,
} from '@metamask/transaction-controller';
import { WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import AppConstants from '../../core/AppConstants';
import {
  getSecurityAlertsAPISupportedChainIds,
  isSecurityAlertsAPIEnabled,
  validateWithSecurityAlertsAPI,
} from './security-alerts-api';
import { PPOMController } from '@metamask/ppom-validator';
import { Hex } from '@metamask/utils';
import { SECURITY_PROVIDER_SUPPORTED_CHAIN_IDS_FALLBACK_LIST } from '../../util/networks';

export interface PPOMRequest {
  method: string;
  params: unknown[];
  origin?: string;
}

const TRANSACTION_METHOD = 'eth_sendTransaction';
const TRANSACTION_METHODS = [TRANSACTION_METHOD, 'eth_sendRawTransaction'];
export const METHOD_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3';
export const METHOD_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4';

const CONFIRMATION_METHODS = Object.freeze([
  'eth_sendRawTransaction',
  TRANSACTION_METHOD,
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

async function validateRequest(req: PPOMRequest, transactionId?: string) {
  const {
    AccountsController,
    NetworkController,
    PPOMController: ppomController,
  } = Engine.context;

  const {
    configuration: { chainId },
  } = NetworkController.getNetworkClientById(
    NetworkController.state?.selectedNetworkClientId,
  );
  const isConfirmationMethod = CONFIRMATION_METHODS.includes(req.method);
  const isSupportedChain = await isChainSupported(chainId);
  const isBlockaidFeatEnabled = await isBlockaidFeatureEnabled();
  if (
    !ppomController ||
    !isBlockaidFeatEnabled ||
    !isConfirmationMethod ||
    !isSupportedChain
  ) {
    return;
  }

  if (req.method === 'eth_sendTransaction') {
    const internalAccounts = AccountsController.listAccounts();
    const toAddress: string | undefined = (
      req?.params?.[0] as Record<string, string>
    ).to;

    if (
      internalAccounts.some(
        ({ address }: { address: string }) =>
          address?.toLowerCase() === toAddress?.toLowerCase(),
      )
    ) {
      return;
    }
  }

  const isTransaction = isTransactionRequest(req);
  let securityAlertResponse: SecurityAlertResponse | undefined;

  try {
    if (isTransaction && !transactionId) {
      securityAlertResponse = SECURITY_ALERT_RESPONSE_FAILED;
      return;
    }

    setSecurityAlertResponse(
      req,
      SECURITY_ALERT_RESPONSE_IN_PROGRESS,
      transactionId,
    );

    const normalizedRequest = normalizeRequest(req);

    securityAlertResponse = isSecurityAlertsAPIEnabled()
      ? await validateWithAPI(ppomController, chainId, normalizedRequest)
      : await validateWithController(ppomController, normalizedRequest);

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

    setSecurityAlertResponse(req, securityAlertResponse, transactionId, {
      updateControllerState: true,
    });
  }
}

async function isChainSupported(chainId: Hex): Promise<boolean> {
  let supportedChainIds = SECURITY_PROVIDER_SUPPORTED_CHAIN_IDS_FALLBACK_LIST;
  try {
    if (isSecurityAlertsAPIEnabled()) {
      supportedChainIds = await getSecurityAlertsAPISupportedChainIds();
    }
  } catch (e) {
    Logger.log(
      `Error fetching supported chains from security alerts API: ${e}`,
    );
  }

  return supportedChainIds.includes(chainId);
}

async function validateWithController(
  ppomController: PPOMController,
  request: PPOMRequest,
): Promise<SecurityAlertResponse> {
  try {
    const response = (await ppomController.usePPOM((ppom) =>
      ppom.validateJsonRpc(request as unknown as Record<string, unknown>),
    )) as SecurityAlertResponse;

    return {
      ...response,
      source: SecurityAlertSource.Local,
    };
  } catch (e) {
    Logger.log(`Error validating request with PPOM: ${e}`);
    return {
      ...SECURITY_ALERT_RESPONSE_FAILED,
      source: SecurityAlertSource.Local,
    };
  }
}

async function validateWithAPI(
  ppomController: PPOMController,
  chainId: string,
  request: PPOMRequest,
): Promise<SecurityAlertResponse> {
  try {
    const response = await validateWithSecurityAlertsAPI(chainId, request);

    return {
      ...response,
      source: SecurityAlertSource.API,
    };
  } catch (e) {
    Logger.log(`Error validating request with security alerts API: ${e}`);
    return await validateWithController(ppomController, request);
  }
}

function setSecurityAlertResponse(
  request: PPOMRequest,
  response: SecurityAlertResponse,
  transactionId?: string,
  { updateControllerState }: { updateControllerState?: boolean } = {},
) {
  if (isTransactionRequest(request)) {
    store.dispatch(
      setTransactionSecurityAlertResponse(transactionId, response),
    );

    if (updateControllerState) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateSecurityAlertResponse(transactionId as string, response as any);
    }
  } else {
    store.dispatch(setSignatureRequestSecurityAlertResponse(response));
  }
}

function isTransactionRequest(request: PPOMRequest) {
  return TRANSACTION_METHODS.includes(request.method);
}

function sanitizeRequest(request: PPOMRequest): PPOMRequest {
  // This is a temporary fix to prevent a PPOM bypass
  if (
    request.method === METHOD_SIGN_TYPED_DATA_V4 ||
    request.method === METHOD_SIGN_TYPED_DATA_V3
  ) {
    if (Array.isArray(request.params)) {
      return {
        ...request,
        params: request.params.slice(0, 2),
      };
    }
  }
  return request;
}

function normalizeRequest(request: PPOMRequest): PPOMRequest {
  if (request.method !== TRANSACTION_METHOD) {
    return sanitizeRequest(request);
  }

  request.origin = request.origin
    ?.replace(WALLET_CONNECT_ORIGIN, '')
    ?.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '');

  const transactionParams = (request.params?.[0] || {}) as TransactionParams;
  const normalizedParams = normalizeTransactionParams(transactionParams);

  return {
    ...request,
    params: [normalizedParams],
  };
}

function clearSignatureSecurityAlertResponse() {
  store.dispatch(setSignatureRequestSecurityAlertResponse());
}

export default {
  validateRequest,
  isChainSupported,
  clearSignatureSecurityAlertResponse,
};
