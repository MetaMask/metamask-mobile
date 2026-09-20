import Engine from '../Engine';
import { store } from '../../store';

import { getPermittedAccounts } from '../Permissions';
import { isSmartContractAddress } from '../../util/transactions';
import {
  TOKEN_NOT_SUPPORTED_FOR_NETWORK,
  TOKEN_NOT_VALID,
} from '../../constants/error';
import {
  selectEvmChainId,
  selectNetworkClientId,
} from '../../selectors/networkController';
import { isValidAddress } from 'ethereumjs-util';
import {
  getSafeJson,
  Hex,
  Json,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import { MESSAGE_TYPE } from '../createTracingMiddleware';

/**
 * Strips `undefined` properties (and any other non-JSON-serializable values
 * such as functions or symbols) from a value by round-tripping it through
 * `JSON.stringify` / `JSON.parse`.
 *
 * This is needed because `_pageMeta` is assembled in the middleware from refs
 * (`url`, `title`, `icon`) and optional fields (`channelId`, `analytics.*`)
 * that are often `undefined` at runtime. `getSafeJson` from `@metamask/utils`
 * rejects any object that contains a non-JSON value (including `undefined`),
 * which surfaces to dapps as:
 * "Expected a value of type `JSON`, but received: `[object Object]`"
 *
 * Pre-sanitizing with this helper drops those properties before validation,
 * so `getSafeJson` only has to enforce the prototype-pollution safeguards.
 *
 * @param value - The value to sanitize. Must be JSON-serializable once
 * `undefined` / function / symbol values are dropped.
 * @returns A deep clone of `value` with all non-JSON-serializable properties
 * removed.
 */
const stripNonJsonValues = <Type>(value: Type): Type =>
  JSON.parse(JSON.stringify(value));

type WatchAssetRpcRequest = JsonRpcRequest<{
  options: {
    address: string;
    decimals: string;
    symbol: string;
    image: string;
  };
  type: string;
}> & {
  networkClientId?: string;
  origin?: string;
};

/**
 * Resolves the EVM network the requesting dapp is on.
 *
 * `wallet_switchEthereumChain` updates SelectedNetworkController for the dapp
 * origin without changing the wallet's globally selected network. Validation
 * and `TokensController.watchAsset` must use that per-dapp client, otherwise
 * tokens are checked/stored against the wrong chain.
 *
 * @param requestNetworkClientId - `networkClientId` already attached to the
 * JSON-RPC request by selected-network middleware, when present.
 * @param origin - Request origin (preferred SelectedNetworkController key).
 * @param hostname - BackgroundBridge hostname/origin fallback.
 * @returns The dapp's `chainId` and `networkClientId`, falling back to the
 * wallet's globally selected network when no dapp network is available.
 */
export const getNetworkForWatchAssetRequest = ({
  requestNetworkClientId,
  origin,
  hostname,
}: {
  requestNetworkClientId?: string;
  origin?: string;
  hostname: string;
}): { chainId: Hex; networkClientId: string } => {
  const { NetworkController, SelectedNetworkController } = Engine.context;
  const state = store.getState();
  const domain = origin || hostname;

  const networkClientId =
    requestNetworkClientId ||
    (domain
      ? SelectedNetworkController.getNetworkClientIdForDomain(domain)
      : undefined) ||
    selectNetworkClientId(state);

  const networkConfiguration =
    NetworkController.getNetworkConfigurationByNetworkClientId(networkClientId);

  return {
    chainId: networkConfiguration?.chainId ?? selectEvmChainId(state),
    networkClientId,
  };
};

export const wallet_watchAsset = async ({
  req,
  res,
  hostname,
  checkTabActive,
  pageMeta: _pageMeta,
}: {
  req: WatchAssetRpcRequest;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res: PendingJsonRpcResponse<any>;
  hostname: string;
  checkTabActive: () => true | undefined;
  pageMeta?: {
    url?: string;
    title?: string;
    icon?: unknown;
    channelId?: string;
    analytics?: {
      request_source?: string;
      request_platform?: string | boolean;
    };
  };
}) => {
  const { AssetsContractController } = Engine.context;
  if (!req.params) {
    throw new Error('wallet_watchAsset params is undefined');
  }
  const {
    params: {
      options: { address, decimals, image, symbol },
      type,
    },
  } = req;

  const { TokensController } = Engine.context;
  const { chainId, networkClientId } = getNetworkForWatchAssetRequest({
    requestNetworkClientId: req.networkClientId,
    origin: req.origin,
    hostname,
  });

  checkTabActive();
  const requestOrigin = _pageMeta?.url ?? hostname;

  const isValidTokenAddress = isValidAddress(address);

  if (!isValidTokenAddress) {
    throw new Error(TOKEN_NOT_VALID);
  }

  // Check if the token contract exists on the dapp-selected network.
  const isTokenOnNetwork = await isSmartContractAddress(
    address,
    chainId,
    networkClientId,
  );
  if (!isTokenOnNetwork) {
    throw new Error(TOKEN_NOT_SUPPORTED_FOR_NETWORK);
  }

  const permittedAccounts = getPermittedAccounts(hostname);
  // This should return the current active account on the Dapp.
  const selectedInternalAccountAddress =
    Engine.context.AccountsController.getSelectedAccount().address;
  // Fallback to wallet address if there is no connected account to Dapp.
  const interactingAddress =
    permittedAccounts?.[0] || selectedInternalAccountAddress;
  // This variables are to override the value of decimals and symbol from the dapp
  // if they are wrong accordingly to the token address
  // *This is an hotfix this logic should live on whatchAsset method on TokensController*
  let fetchedDecimals, fetchedSymbol;
  try {
    [fetchedDecimals, fetchedSymbol] = await Promise.all([
      AssetsContractController.getERC20TokenDecimals(address, networkClientId),
      AssetsContractController.getERC721AssetSymbol(address, networkClientId),
    ]);
    //The catch it's only to prevent the fetch from the chain to fail
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const finalTokenSymbol = fetchedSymbol ?? symbol;
  const finalTokenDecimals = fetchedDecimals ?? decimals;

  const safePageMeta =
    _pageMeta !== undefined
      ? getSafeJson<Record<string, Json>>(stripNonJsonValues(_pageMeta))
      : undefined;

  await TokensController.watchAsset({
    asset: {
      address,
      symbol: finalTokenSymbol,
      // @ts-expect-error TODO: Fix decimal type
      decimals: finalTokenDecimals,
      image,
    },
    type,
    interactingAddress,
    networkClientId,
    origin: requestOrigin,
    pageMeta: safePageMeta,
    requestMetadata: {
      origin: requestOrigin,
      pageMeta: safePageMeta,
    },
  });

  res.result = true;
};

export const watchAssetHandler = {
  methodNames: [MESSAGE_TYPE.WATCH_ASSET],
  implementation: wallet_watchAsset,
  hookNames: {
    handleWatchAssetRequest: true,
  },
};
