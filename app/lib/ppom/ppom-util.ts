import setSignatureRequestSecurityAlertResponse from '../../actions/signatureRequest';
import { setTransactionSecurityAlertResponse } from '../../actions/transaction';
import { BLOCKAID_SUPPORTED_CHAIN_IDS } from '../../util/networks';
import {
  Reason,
  ResultType,
} from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';
import Logger from '../../util/Logger';
import { updateSecurityAlertResponse } from '../../util/transaction-controller';
import { normalizeTransactionParams } from '@metamask/transaction-controller';
import { WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import AppConstants from '../../core/AppConstants';

const TRANSACTION_METHOD = 'eth_sendTransaction';

const ConfirmationMethods = Object.freeze([
  'eth_sendRawTransaction',
  TRANSACTION_METHOD,
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
]);

const FailedResponse = {
  result_type: ResultType.Failed,
  reason: Reason.failed,
  description: 'Validating the confirmation failed by throwing error.',
};

const RequestInProgress = {
  result_type: ResultType.RequestInProgress,
  reason: Reason.requestInProgress,
  description: 'Validating the confirmation in progress.',
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateRequest = async (req: any, transactionId?: string) => {
  let securityAlertResponse;

  const {
    PPOMController: ppomController,
    PreferencesController,
    NetworkController,
  } = Engine.context;
  const currentChainId = NetworkController.state.providerConfig.chainId;
  if (
    !ppomController ||
    !isBlockaidFeatureEnabled() ||
    !PreferencesController.state.securityAlertsEnabled ||
    !ConfirmationMethods.includes(req.method) ||
    !BLOCKAID_SUPPORTED_CHAIN_IDS.includes(currentChainId)
  ) {
    return;
  }
  try {
    if (
      (req.method === 'eth_sendRawTransaction' ||
        req.method === 'eth_sendTransaction') &&
      !transactionId
    ) {
      securityAlertResponse = FailedResponse;
    } else {
      if (
        req.method === 'eth_sendRawTransaction' ||
        req.method === 'eth_sendTransaction'
      ) {
        store.dispatch(
          setTransactionSecurityAlertResponse(transactionId, RequestInProgress),
        );
      } else {
        store.dispatch(
          setSignatureRequestSecurityAlertResponse(RequestInProgress),
        );
      }
      const normalizedRequest = normalizeRequest(req);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      securityAlertResponse = await ppomController.usePPOM((ppom: any) =>
        ppom.validateJsonRpc(normalizedRequest),
      );
      securityAlertResponse = {
        ...securityAlertResponse,
        req,
        chainId: currentChainId,
      };
    }
  } catch (e) {
    Logger.log(`Error validating JSON RPC using PPOM: ${e}`);
  } finally {
    if (!securityAlertResponse) {
      securityAlertResponse = FailedResponse;
    }
    if (
      req.method === 'eth_sendRawTransaction' ||
      req.method === 'eth_sendTransaction'
    ) {
      store.dispatch(
        setTransactionSecurityAlertResponse(
          transactionId,
          securityAlertResponse,
        ),
      );
      updateSecurityAlertResponse(
        transactionId as string,
        // @ts-expect-error TODO: fix types
        securityAlertResponse,
      );
    } else {
      store.dispatch(
        // @ts-expect-error TODO: fix types
        setSignatureRequestSecurityAlertResponse(securityAlertResponse),
      );
    }
  }
  // todo: once all call to validateRequest are async we may not return any result
  return securityAlertResponse;
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRequest(request: any) {
  if (request.method !== TRANSACTION_METHOD) {
    return request;
  }

  request.origin = request.origin
    ?.replace(WALLET_CONNECT_ORIGIN, '')
    ?.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '');

  const transactionParams = request.params?.[0] || {};
  const normalizedParams = normalizeTransactionParams(transactionParams);

  return {
    ...request,
    params: [normalizedParams],
  };
}

export default { validateRequest };
