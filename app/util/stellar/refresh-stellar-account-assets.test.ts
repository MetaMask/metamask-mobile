///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { XlmScope } from '@metamask/keyring-api';
import type { CaipAssetType } from '@metamask/utils';
import Engine from '../../core/Engine';
import { refreshStellarAccountAssets } from './refresh-stellar-account-assets';

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AssetsController: {
        getAssets: jest.fn(),
        refreshAccountAssetInfo: jest.fn(),
        invalidateAccountAssetExtras: jest.fn(),
      },
      MultichainBalancesController: {
        updateBalance: jest.fn(),
      },
    },
  },
}));

describe('refreshStellarAccountAssets', () => {
  const account = { id: 'stellar-account-id' } as InternalAccount;
  const assetId =
    'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' as CaipAssetType;

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.AssetsController.getAssets as jest.Mock).mockResolvedValue(
      undefined,
    );
    (
      Engine.context.AssetsController.refreshAccountAssetInfo as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.MultichainBalancesController.updateBalance as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('refreshes trustline enrichment and balances for the Stellar account', async () => {
    await refreshStellarAccountAssets({
      account,
      chainId: XlmScope.Pubnet,
      assetId,
      trustlineAction: 'add',
    });

    expect(
      Engine.context.AssetsController.refreshAccountAssetInfo,
    ).toHaveBeenCalledWith(account.id, [assetId]);
    expect(Engine.context.AssetsController.getAssets).toHaveBeenCalledWith(
      [account],
      {
        forceUpdate: true,
        chainIds: [XlmScope.Pubnet],
        assetTypes: ['fungible'],
      },
    );
    expect(
      Engine.context.MultichainBalancesController.updateBalance,
    ).toHaveBeenCalledWith(account.id);
    expect(
      Engine.context.AssetsController.invalidateAccountAssetExtras,
    ).not.toHaveBeenCalled();
  });

  it('invalidates trustline extra before refresh when removing a trustline', async () => {
    await refreshStellarAccountAssets({
      account,
      chainId: XlmScope.Pubnet,
      assetId,
      trustlineAction: 'remove',
    });

    expect(
      Engine.context.AssetsController.invalidateAccountAssetExtras,
    ).toHaveBeenCalledWith(account.id, [assetId]);
    expect(
      Engine.context.AssetsController.refreshAccountAssetInfo,
    ).toHaveBeenCalledWith(account.id, [assetId]);
  });

  it('still updates balances when refreshAccountAssetInfo fails', async () => {
    (
      Engine.context.AssetsController.refreshAccountAssetInfo as jest.Mock
    ).mockRejectedValue(new Error('enrichment failed'));

    await refreshStellarAccountAssets({
      account,
      chainId: XlmScope.Pubnet,
      assetId,
    });

    expect(
      Engine.context.MultichainBalancesController.updateBalance,
    ).toHaveBeenCalledWith(account.id);
  });
});
///: END:ONLY_INCLUDE_IF
