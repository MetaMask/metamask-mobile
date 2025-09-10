import { Store } from 'redux';
import { JsonRpcRequest } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';

import { containsUserRejectedError } from '../../util/middlewares';
import Routes from '../../constants/navigation/Routes';
import NavigationService from '../NavigationService';
import { RPC_METHODS } from '../SDKConnect/SDKConnectConstants';
import {
  selectIsOriginBlockedForRPCRequests,
  onRPCRequestRejectedByUser,
} from '../redux/slices/originThrottling';

export const BLOCKABLE_SPAM_RPC_METHODS = new Set([
  RPC_METHODS.ETH_SENDTRANSACTION,
  RPC_METHODS.ETH_SIGNTYPEDEATA,
  RPC_METHODS.ETH_SIGNTYPEDEATAV3,
  RPC_METHODS.ETH_SIGNTYPEDEATAV4,
  RPC_METHODS.METAMASK_CONNECTSIGN,
  RPC_METHODS.METAMASK_BATCH,
  RPC_METHODS.PERSONAL_SIGN,
  RPC_METHODS.WALLET_WATCHASSET,
  RPC_METHODS.WALLET_ADDETHEREUMCHAIN,
  RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
  RPC_METHODS.WALLET_SEND_CALLS,
]);

// Origin added in the createOriginMiddleware
export type ExtendedJSONRPCRequest = JsonRpcRequest & { origin: string };

export const SPAM_FILTER_ACTIVATED = providerErrors.unauthorized(
  'Request blocked due to spam filter.',
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

  const isDappBlocked = selectIsOriginBlockedForRPCRequests(
    appState,
    req.origin,
  );
  if (isDappBlocked) {
    throw SPAM_FILTER_ACTIVATED;
  }
}

export function processOriginThrottlingRejection({
  req,
  error,
  store,
}: {
  req: ExtendedJSONRPCRequest;
  error: {
    message: string;
    code?: number;
  };
  store: Store;
}) {
  const isBlockableRPCMethod = BLOCKABLE_SPAM_RPC_METHODS.has(req.method);

  if (!isBlockableRPCMethod) {
    return;
  }

  if (!containsUserRejectedError(error.message, error?.code)) {
    return;
  }

  store.dispatch(onRPCRequestRejectedByUser(req.origin));

  if (selectIsOriginBlockedForRPCRequests(store.getState(), req.origin)) {
    NavigationService.navigation.navigate(Routes.SHEET.ORIGIN_SPAM_MODAL, {
      origin: req.origin,
    });
  }
}
