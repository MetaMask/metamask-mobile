///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { HandlerType } from '@metamask/snaps-utils';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import Engine from '../../core/Engine';
import { handleSnapRequest } from '../../core/Snaps/utils';
import { STELLAR_WALLET_SNAP_ID } from '../../core/SnapKeyring/StellarWalletSnap';

export interface StellarChangeTrustOptResult {
  status: boolean;
  transactionId?: string;
}

export async function requestStellarChangeTrustOptAdd(params: {
  accountId: string;
  assetId: CaipAssetType;
  scope: CaipChainId;
  limit?: string;
}): Promise<StellarChangeTrustOptResult> {
  return (await handleSnapRequest(Engine.controllerMessenger, {
    snapId: STELLAR_WALLET_SNAP_ID,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'changeTrustOpt',
      params: {
        ...params,
        action: 'add',
      },
    },
  })) as StellarChangeTrustOptResult;
}

export async function requestStellarChangeTrustOptDelete(params: {
  accountId: string;
  assetId: CaipAssetType;
  scope: CaipChainId;
}): Promise<void> {
  await handleSnapRequest(Engine.controllerMessenger, {
    snapId: STELLAR_WALLET_SNAP_ID,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'changeTrustOpt',
      params: {
        ...params,
        action: 'delete',
      },
    },
  });
}

/**
 * Fetches Snap account-asset enrichment (e.g. Stellar trustline fields).
 */
export async function requestStellarGetAccountAssetInfo(params: {
  accountId: string;
  scope: CaipChainId;
  assets: CaipAssetType[];
}): Promise<Record<string, Record<string, unknown>> | undefined> {
  return (await handleSnapRequest(Engine.controllerMessenger, {
    snapId: STELLAR_WALLET_SNAP_ID,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      jsonrpc: '2.0',
      method: 'getAccountAssetInfo',
      params,
    },
  })) as Record<string, Record<string, unknown>> | undefined;
}
///: END:ONLY_INCLUDE_IF
