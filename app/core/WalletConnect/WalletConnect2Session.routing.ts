import { WalletDevice } from '@metamask/transaction-controller';
import { HandlerType } from '@metamask/snaps-utils';
import { SnapId } from '@metamask/snaps-sdk';
import type { CaipChainId } from '@metamask/utils';
import type { WalletKitTypes } from '@reown/walletkit';

import ppomUtil from '../../../app/lib/ppom/ppom-util';
import { addTransaction } from '../../util/transaction-controller';
import Engine from '../Engine';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { handleSnapRequest } from '../Snaps/utils';

import { getAdapter } from './multichain';
import { getNetworkClientIdForCaipChainId } from './wc-utils';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { TRON_WALLET_SNAP_ID } from '../SnapKeyring/TronWalletSnap';
///: END:ONLY_INCLUDE_IF

/** Callback surface exposed by the session to its routing helpers. */
export interface RoutingHostContext {
  approveRequest: (args: { id: string; result: unknown }) => Promise<void>;
  rejectRequest: (args: { id: string; error: unknown }) => Promise<void>;
}

/**
 * Route a WalletConnect session request to a Snap. The chain adapter owns
 * any request shape mapping and response re-assembly so this function stays
 * chain-agnostic.
 */
export const routeToSnap = async ({
  requestEvent,
  snapId,
  unverifiedOrigin,
  host,
}: {
  requestEvent: WalletKitTypes.SessionRequest;
  snapId: string;
  /** WARNING: self-reported by the dapp and unverified. */
  unverifiedOrigin: string;
  host: RoutingHostContext;
}): Promise<void> => {
  const { method, params } = requestEvent.params.request;
  const namespace = requestEvent.params.chainId?.split(':')[0] ?? '';
  const adapter = getAdapter(namespace);
  const mappedRequest = adapter?.adaptRequest
    ? adapter.adaptRequest({ method, params })
    : { method, params };

  // Tron Snap expects a trusted origin for RPC execution; all other Snaps
  // receive the dapp-reported origin.
  let snapExecutionOrigin = unverifiedOrigin;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (snapId === TRON_WALLET_SNAP_ID) {
    snapExecutionOrigin = 'metamask';
  }
  ///: END:ONLY_INCLUDE_IF

  DevLogger.log(
    `WC2::routeToSnap snapId=${snapId} method=${method} mappedMethod=${mappedRequest.method}`,
  );

  try {
    const result = await handleSnapRequest(Engine.controllerMessenger, {
      origin: snapExecutionOrigin,
      snapId: snapId as SnapId,
      handler: HandlerType.OnRpcRequest,
      request: {
        jsonrpc: '2.0',
        id: requestEvent.id,
        method: mappedRequest.method,
        params: mappedRequest.params as Record<string, unknown>,
      },
    });

    const walletConnectResult = adapter?.adaptResponse
      ? adapter.adaptResponse({ method, params, result })
      : result;

    await host.approveRequest({
      id: String(requestEvent.id),
      result: walletConnectResult,
    });
  } catch (error) {
    await host.rejectRequest({ id: String(requestEvent.id), error });
  }
};

/**
 * Dispatch an `eth_sendTransaction` RPC through the transaction controller
 * so it can be confirmed and broadcast via the app's normal flow.
 */
export const handleSendTransaction = async ({
  caip2ChainId,
  requestEvent,
  methodParams,
  unverifiedOrigin,
  host,
}: {
  caip2ChainId: CaipChainId;
  requestEvent: WalletKitTypes.SessionRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methodParams: any;
  /** WARNING: self-reported by the dapp and unverified. */
  unverifiedOrigin: string;
  host: RoutingHostContext;
}): Promise<void> => {
  try {
    const networkClientId = getNetworkClientIdForCaipChainId(caip2ChainId);
    const trx = await addTransaction(methodParams[0], {
      deviceConfirmedOn: WalletDevice.MM_MOBILE,
      networkClientId,
      origin: unverifiedOrigin,
      securityAlertResponse: undefined,
    });

    const reqObject = {
      id: requestEvent.id,
      jsonrpc: '2.0',
      method: 'eth_sendTransaction',
      origin: unverifiedOrigin,
      params: [
        {
          from: methodParams[0].from,
          to: methodParams[0].to,
          value: methodParams[0]?.value,
          data: methodParams[0]?.data,
        },
      ],
    };

    ppomUtil.validateRequest(reqObject, {
      transactionMeta: trx.transactionMeta,
    });
    const hash = await trx.result;

    await host.approveRequest({
      id: String(requestEvent.id),
      result: hash,
    });
  } catch (error) {
    await host.rejectRequest({ id: String(requestEvent.id), error });
  }
};
