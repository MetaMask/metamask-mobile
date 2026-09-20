import {
  ApprovalType,
  ERC20,
  ORIGIN_METAMASK,
} from '@metamask/controller-utils';
import { rpcErrors } from '@metamask/rpc-errors';
import { v1 as random } from 'uuid';
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
import { buildEvmCaip19AssetId } from '../../util/multichain/buildEvmCaip19AssetId';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../selectors/multichainAccounts/accountTreeController';
import { isValidAddress } from 'ethereumjs-util';
import {
  getSafeJson,
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

export const wallet_watchAsset = async ({
  req,
  res,
  hostname,
  checkTabActive,
  pageMeta: _pageMeta,
}: {
  req: JsonRpcRequest<{
    options: {
      address: string;
      decimals: string;
      symbol: string;
      image: string;
    };
    type: string;
  }> & { networkClientId?: string };
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

  const { ApprovalController, AssetsController, NetworkController } =
    Engine.context;
  const state = store.getState();
  // Selected-network middleware sets `networkClientId` to the dapp's own
  // network, which `wallet_switchEthereumChain` changes without touching the
  // wallet's globally selected network.
  const networkClientId = req.networkClientId ?? selectNetworkClientId(state);
  const chainId =
    NetworkController.getNetworkConfigurationByNetworkClientId(networkClientId)
      ?.chainId ?? selectEvmChainId(state);

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

  if (type !== ERC20) {
    throw new Error(`Asset of type ${type} not supported`);
  }

  // AssetsController keys assets by account id, like every other add-token path.
  const evmAccount = selectSelectedAccountGroupEvmInternalAccount(state);
  if (!evmAccount) {
    throw rpcErrors.internal('No EVM account available to watch the asset on.');
  }

  const permittedAccounts = getPermittedAccounts(hostname);
  // Fallback to wallet address if there is no connected account to Dapp.
  const interactingAddress = permittedAccounts?.[0] || evmAccount.address;

  // This variables are to override the value of decimals and symbol from the dapp
  // if they are wrong accordingly to the token address
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
  // Decimals arrive as a string, but AssetsController persists a number.
  const finalTokenDecimals = parseInt(String(fetchedDecimals ?? decimals), 10);
  if (
    Number.isNaN(finalTokenDecimals) ||
    finalTokenDecimals < 0 ||
    finalTokenDecimals > 36
  ) {
    throw rpcErrors.invalidParams(
      `Invalid decimals "${decimals}": must be an integer 0 <= 36`,
    );
  }

  const safePageMeta =
    _pageMeta !== undefined
      ? getSafeJson<Record<string, Json>>(stripNonJsonValues(_pageMeta))
      : undefined;

  const approvalId = random();

  // Show the EIP-747 confirmation and wait for the user. A rejection throws
  // here, so the asset is never persisted below.
  await ApprovalController.add({
    id: approvalId,
    origin: requestOrigin || ORIGIN_METAMASK,
    type: ApprovalType.WatchAsset,
    requestData: {
      id: approvalId,
      interactingAddress,
      asset: {
        address,
        symbol: finalTokenSymbol,
        decimals: finalTokenDecimals,
        image,
        chainId,
      },
      pageMeta: safePageMeta ?? null,
    },
  });

  await AssetsController.addCustomAsset(
    evmAccount.id,
    buildEvmCaip19AssetId(address, chainId),
    {
      address,
      symbol: finalTokenSymbol,
      name: finalTokenSymbol,
      decimals: finalTokenDecimals,
      chainId,
      iconUrl: image,
    },
  );

  res.result = true;
};

export const watchAssetHandler = {
  methodNames: [MESSAGE_TYPE.WATCH_ASSET],
  implementation: wallet_watchAsset,
  hookNames: {
    handleWatchAssetRequest: true,
  },
};
