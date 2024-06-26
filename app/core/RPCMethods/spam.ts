import { Store } from 'redux';
import { JsonRpcRequest } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';

import { containsUserRejectedError } from '../../util/middlewares';
import Routes from '../../constants/navigation/Routes';
import { RPC_METHODS } from '../SDKConnect/SDKConnectConstants';
import {
  isDappBlockedForRPCRequests,
  onRPCRequestRejectedByUser,
  selectOriginAtSpamThreshold,
} from '../redux/slices/originThrottling';

export const BLOCKABLE_SPAM_RPC_METHODS = new Set([
  RPC_METHODS.ETH_SENDTRANSACTION,
  RPC_METHODS.ETH_SIGN,
  RPC_METHODS.ETH_SIGNTYPEDEATAV3,
  RPC_METHODS.ETH_SIGNTYPEDEATAV4,
  RPC_METHODS.METAMASK_CONNECTSIGN,
  RPC_METHODS.METAMASK_BATCH,
  RPC_METHODS.PERSONAL_SIGN,
  RPC_METHODS.WALLET_WATCHASSET,
  RPC_METHODS.WALLET_ADDETHEREUMCHAIN,
  RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
]);

// Origin added in the createOriginMiddleware
export type ExtendedJSONRPCRequest = JsonRpcRequest & { origin: string };

export const ACTIVE_SPAM_PROMPT_ERROR = providerErrors.unauthorized(
  'Request blocked due to active spam modal.',
);

export const USER_IDENTIFIED_REQUEST_AS_SPAM_ERROR =
  providerErrors.unauthorized(
    'Request blocked as the user identified it as spam.',
  );

export function validateOriginThrottling({
  req,
  store,
}: {
  req: ExtendedJSONRPCRequest;
  store: Store;
}) {
  const isBlockableRPCMethod = BLOCKABLE_SPAM_RPC_METHODS.has(req.method);
  if (!isBlockableRPCMethod) {
    return;
  }

  const appState = store.getState();
  const hasActiveSpamPrompt = selectOriginAtSpamThreshold(appState, req.origin);

  if (hasActiveSpamPrompt) {
    throw ACTIVE_SPAM_PROMPT_ERROR;
  }

  const isDappBlocked = isDappBlockedForRPCRequests(appState, req.origin);
  if (isDappBlocked) {
    throw USER_IDENTIFIED_REQUEST_AS_SPAM_ERROR;
  }
}

export function processOriginThrottlingRejection({
  req,
  error,
  store,
  navigation,
}: {
  req: ExtendedJSONRPCRequest;
  error: {
    message: string;
    code?: number;
  };
  store: Store;
  navigation: {
    navigate: (route: string, params: Record<string, unknown>) => void;
  };
}) {
  const isBlockableRPCMethod = BLOCKABLE_SPAM_RPC_METHODS.has(req.method);
  if (
    isBlockableRPCMethod &&
    containsUserRejectedError(error.message, error?.code)
  ) {
    store.dispatch(onRPCRequestRejectedByUser(req.origin));
    if (selectOriginAtSpamThreshold(store.getState(), req.origin)) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.DAPP_SPAM_MODAL,
        params: { origin: req.origin },
      });
    }
  }
}
