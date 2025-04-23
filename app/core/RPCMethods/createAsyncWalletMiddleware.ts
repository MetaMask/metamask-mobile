import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getEthAccounts,
} from '@metamask/chain-agnostic-permission';
import { createWalletMiddleware } from '@metamask/eth-json-rpc-middleware';
import { Json, JsonRpcRequest } from '@metamask/utils';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

import Engine from '../Engine';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import { JsonRpcParams } from '@metamask/eth-query';

const getPermittedAccounts = (origin: string) => {
  const { PermissionController } = Engine.context;
  let caveat;
  try {
    caveat = PermissionController.getCaveat(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
    );
  } catch (err) {
    if (err instanceof PermissionDoesNotExistError) {
      // suppress expected error in case that the origin
      // does not have the target permission yet
      return [];
    }
    throw err;
  }

  if (!caveat) {
    return Promise.resolve([]);
  }

  return Promise.resolve(
    getEthAccounts(
      caveat.value as Pick<
        Caip25CaveatValue,
        'requiredScopes' | 'optionalScopes'
      >,
    ),
  );
};

export const getAccounts = async ({ origin }: { origin: string }) => {
  const { AccountsController, KeyringController } = Engine.context;
  if (origin === ORIGIN_METAMASK) {
    const selectedAddress = AccountsController.getSelectedAccount().address;
    return Promise.resolve(selectedAddress ? [selectedAddress] : []);
  } else if (KeyringController.state.isUnlocked) {
    return Promise.resolve(getPermittedAccounts(origin));
  }
  return Promise.resolve([]);
};

export const createAsyncWalletMiddleware = (): JsonRpcMiddleware<
  JsonRpcParams,
  Json
> =>
  createWalletMiddleware({
    getAccounts: getAccounts as unknown as (
      req: JsonRpcRequest,
    ) => Promise<string[]>,
  }) as JsonRpcMiddleware<JsonRpcParams, Json>;
