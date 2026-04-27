/**
 * EVM (eip155) request routing for WalletConnect.
 *
 * Handles chain validation, chain switching, `eth_sendTransaction` (via the
 * TransactionController), `eth_signTypedData` normalization, and general
 * dispatch through BackgroundBridge. Called from the session's
 * `handleRequest` once the namespace is identified as EVM.
 */

import type { SessionTypes } from '@walletconnect/types';
import type { WalletKitTypes } from '@reown/walletkit';
import type { CaipChainId, Hex } from '@metamask/utils';
import { rpcErrors } from '@metamask/rpc-errors';
import {
  WalletDevice,
  type TransactionParams,
} from '@metamask/transaction-controller';

import { store } from '../../../../store';
import { updateWC2Metadata } from '../../../../actions/sdk';
import { getPermittedChains } from '../../../Permissions';
import type BackgroundBridge from '../../../BackgroundBridge/BackgroundBridge';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import ppomUtil from '../../../../lib/ppom/ppom-util';
import { addTransaction } from '../../../../util/transaction-controller';
import {
  isSwitchingChainRequest,
  getChainIdForCaipChainId,
  getNetworkClientIdForCaipChainId,
} from '../../wc-utils';
import { ERROR_MESSAGES } from '../../WalletConnectV2';
import type { RoutingHostContext } from '../../WalletConnect2Session.routing';

/**
 * Session-level capabilities the EVM routing function needs. Provided by
 * the WalletConnect2Session instance at the call site so the routing logic
 * stays free of class-level coupling.
 */
export interface EvmRoutingHost extends RoutingHostContext {
  readonly channelId: string;
  readonly session: SessionTypes.Struct;
  readonly backgroundBridge: BackgroundBridge;
  getCurrentChainId(): Hex;
  switchToChain(
    caip2ChainId: CaipChainId,
    origin: string,
    allowNew?: boolean,
  ): Promise<void>;
  respondSessionError(
    requestId: number,
    code: number,
    message: string,
  ): Promise<unknown>;
  setHandlingRequest(value: boolean): void;
}

/**
 * Dispatch an `eth_sendTransaction` RPC through the transaction controller
 * so it can be confirmed and broadcast via the app's normal flow.
 */
const sendTransaction = async ({
  caip2ChainId,
  requestEvent,
  methodParams,
  unverifiedOrigin,
  host,
}: {
  caip2ChainId: CaipChainId;
  requestEvent: WalletKitTypes.SessionRequest;
  methodParams: unknown[];
  unverifiedOrigin: string;
  host: RoutingHostContext;
}): Promise<void> => {
  const txParams = methodParams[0] as TransactionParams;
  try {
    const networkClientId = getNetworkClientIdForCaipChainId(caip2ChainId);
    const trx = await addTransaction(txParams, {
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
          from: txParams.from,
          to: txParams.to,
          value: txParams.value,
          data: txParams.data,
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

/**
 * Route a WalletConnect EVM (eip155 / wallet) request. Owns chain
 * validation, auto-switching, method normalization, and dispatch to
 * BackgroundBridge or the TransactionController.
 *
 * @param params.requestEvent - The raw WalletConnect session request.
 * @param params.method - The JSON-RPC method name.
 * @param params.unverifiedOrigin - Self-reported dapp origin (untrusted).
 * @param params.host - Session capabilities for routing.
 */
export const handleEvmRequest = async ({
  requestEvent,
  method,
  unverifiedOrigin,
  host,
}: {
  requestEvent: WalletKitTypes.SessionRequest;
  method: string;
  unverifiedOrigin: string;
  host: EvmRoutingHost;
}): Promise<void> => {
  // ── Chain ID extraction ────────────────────────────────────────────
  const isSwitchingChain = isSwitchingChainRequest(requestEvent);

  let caip2ChainId: CaipChainId;
  let hexChainId: Hex;
  try {
    hexChainId = isSwitchingChain
      ? requestEvent.params.request.params[0].chainId
      : getChainIdForCaipChainId(requestEvent.params.chainId as CaipChainId);
    caip2ChainId = `eip155:${parseInt(hexChainId, 16)}` as CaipChainId;
  } catch (err) {
    DevLogger.log(
      `WC::handleEvmRequest chain ID parsing failed for chainId=${requestEvent.params.chainId}`,
      err,
    );
    host.setHandlingRequest(false);
    await host.respondSessionError(
      requestEvent.id,
      4902,
      ERROR_MESSAGES.INVALID_CHAIN,
    );
    return;
  }

  const methodParams = requestEvent.params.request.params;

  // ── WC2 metadata update ────────────────────────────────────────────
  const currentMetadata = store.getState().sdk.wc2Metadata ?? {
    id: host.channelId,
    url: unverifiedOrigin,
    name: host.session.peer.metadata.name,
    icon: host.session.peer.metadata.icons?.[0] as string,
  };

  store.dispatch(
    updateWC2Metadata({
      ...currentMetadata,
      lastVerifiedUrl: unverifiedOrigin,
    }),
  );

  DevLogger.log(
    `WalletConnect2Session::handleEvmRequest caip2ChainId=${caip2ChainId} method=${method} unverifiedOrigin=${unverifiedOrigin}`,
  );

  // ── Permission check ───────────────────────────────────────────────
  const permittedChains = await getPermittedChains(host.channelId);
  const isAllowedChainId = permittedChains.includes(caip2ChainId);

  // ── wallet_switchEthereumChain ─────────────────────────────────────
  if (method === 'wallet_switchEthereumChain') {
    try {
      await host.switchToChain(caip2ChainId, unverifiedOrigin, true);
      DevLogger.log(`WC::handleEvmRequest approving switch chain request`);
      await host.approveRequest({
        id: requestEvent.id + '',
        result: true,
      });
    } catch (err) {
      DevLogger.log(
        `WC::handleEvmRequest switchToChain failed for chainId=${caip2ChainId}`,
        err,
      );
      host.setHandlingRequest(false);
      await host.respondSessionError(
        requestEvent.id,
        4902,
        ERROR_MESSAGES.INVALID_CHAIN,
      );
    }
    return;
  }

  // ── Auto-switch to the request's chain if permitted ────────────────
  const currentChainId = host.getCurrentChainId();
  DevLogger.log(
    `WC::handleEvmRequest currentChainId=${currentChainId} chainId=${hexChainId} isAllowedChainId=${isAllowedChainId}`,
  );
  if (currentChainId !== hexChainId && isAllowedChainId) {
    DevLogger.log(`WC::handleEvmRequest switching to chainId=${caip2ChainId}`);
    await host.switchToChain(caip2ChainId, host.channelId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Chain change notification is handled by BackgroundBridge → WalletConnectPort
  }

  if (!isAllowedChainId) {
    DevLogger.log(`WC::checkWCPermissions chainId is not permitted`);
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: active chainId is different than the one provided.`,
    });
  }

  // ── eth_sendTransaction (direct TransactionController path) ────────
  if (method === 'eth_sendTransaction') {
    await sendTransaction({
      caip2ChainId,
      requestEvent,
      methodParams,
      unverifiedOrigin,
      host: {
        approveRequest: host.approveRequest,
        rejectRequest: host.rejectRequest,
      },
    });
    return;
  }

  // ── All other methods → BackgroundBridge ───────────────────────────
  // Normalize eth_signTypedData to the v3 handler.
  const bridgeMethod =
    method === 'eth_signTypedData' ? 'eth_signTypedData_v3' : method;

  host.backgroundBridge.onMessage({
    name: 'walletconnect-provider',
    data: {
      id: requestEvent.id,
      topic: requestEvent.topic,
      method: bridgeMethod,
      params: methodParams,
    },
    origin: unverifiedOrigin,
  });
};
