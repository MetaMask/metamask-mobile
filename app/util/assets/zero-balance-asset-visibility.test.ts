import type { AssetsControllerState } from '@metamask/assets-controller';

import { shouldRetainZeroBalanceNonNativeAsset } from './zero-balance-asset-visibility';

const ACCOUNT_ID = 'account-1';
const AFR_ASSET_ID =
  'stellar:pubnet/asset:AFR-GBX6YI45VU7WNAAKA3RBFDR3I3UKNFHTJPQ5F6KOOKSGYIAM4TRQN54W';
const USDC_ASSET_ID =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const DAI_ASSET_ID =
  'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';

describe('shouldRetainZeroBalanceNonNativeAsset', () => {
  it('retains custom imported assets with zero balance', () => {
    const customAssets: AssetsControllerState['customAssets'] = {
      [ACCOUNT_ID]: [AFR_ASSET_ID],
    };

    expect(
      shouldRetainZeroBalanceNonNativeAsset({
        accountId: ACCOUNT_ID,
        assetId: AFR_ASSET_ID,
        customAssets,
        assetsBalance: {
          [ACCOUNT_ID]: {
            [AFR_ASSET_ID]: { amount: '0', extra: {} },
          },
        },
      }),
    ).toBe(true);
  });

  it('retains Stellar classic assets with an open trustline and zero balance', () => {
    expect(
      shouldRetainZeroBalanceNonNativeAsset({
        accountId: ACCOUNT_ID,
        assetId: USDC_ASSET_ID,
        customAssets: {},
        assetsBalance: {
          [ACCOUNT_ID]: {
            [USDC_ASSET_ID]: {
              amount: '0',
              accountAssetInfo: {
                limit: '922337203685.4775807',
                authorized: true,
              },
            },
          },
        },
      }),
    ).toBe(true);
  });

  it('hides Stellar classic assets once the trustline is deactivated, even if previously imported', () => {
    const customAssets: AssetsControllerState['customAssets'] = {
      [ACCOUNT_ID]: [USDC_ASSET_ID],
    };

    expect(
      shouldRetainZeroBalanceNonNativeAsset({
        accountId: ACCOUNT_ID,
        assetId: USDC_ASSET_ID,
        customAssets,
        assetsBalance: {
          [ACCOUNT_ID]: {
            [USDC_ASSET_ID]: {
              amount: '0',
              accountAssetInfo: { limit: '0', authorized: false },
            },
          },
        },
      }),
    ).toBe(false);
  });

  it('does not retain unrelated zero-balance tokens', () => {
    expect(
      shouldRetainZeroBalanceNonNativeAsset({
        accountId: ACCOUNT_ID,
        assetId: DAI_ASSET_ID,
        customAssets: {},
        assetsBalance: {
          [ACCOUNT_ID]: {
            [DAI_ASSET_ID]: { amount: '0' },
          },
        },
      }),
    ).toBe(false);
  });
});
