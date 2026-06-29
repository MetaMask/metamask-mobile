///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { AssetType } from '@metamask/assets-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import Engine from '../../core/Engine';
import Logger from '../Logger';

const STELLAR_REFRESH_ASSET_TYPES: AssetType[] = ['fungible'];

export type StellarTrustlineRefreshAction = 'add' | 'remove';

export interface RefreshStellarAccountAssetsParams {
  account: InternalAccount;
  chainId: CaipChainId;
  assetId?: CaipAssetType;
  trustlineAction?: StellarTrustlineRefreshAction;
}

/**
 * Refreshes Stellar account balances and trustline enrichment after a trustline change.
 * `MultichainBalancesController.updateBalance` alone does not update trustline `extra` fields.
 */
export async function refreshStellarAccountAssets({
  account,
  chainId,
  assetId,
  trustlineAction = 'add',
}: RefreshStellarAccountAssetsParams): Promise<void> {
  const { AssetsController, MultichainBalancesController } = Engine.context;

  if (assetId) {
    if (trustlineAction === 'remove') {
      AssetsController.invalidateAccountAssetExtras(account.id, [assetId]);
    }

    try {
      await AssetsController.refreshAccountAssetInfo(account.id, [assetId]);
    } catch (error) {
      Logger.error(
        error as Error,
        'refreshStellarAccountAssets: refreshAccountAssetInfo failed',
      );
    }
  }

  try {
    await AssetsController.getAssets([account], {
      forceUpdate: true,
      chainIds: [chainId],
      assetTypes: STELLAR_REFRESH_ASSET_TYPES,
    });
  } catch (error) {
    Logger.error(
      error as Error,
      'refreshStellarAccountAssets: AssetsController.getAssets failed',
    );
  }

  try {
    await MultichainBalancesController.updateBalance(account.id);
  } catch (error) {
    Logger.error(
      error as Error,
      'refreshStellarAccountAssets: MultichainBalancesController.updateBalance failed',
    );
  }
}
///: END:ONLY_INCLUDE_IF
