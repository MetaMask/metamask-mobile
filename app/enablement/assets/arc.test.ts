import { type AssetsControllerState } from '@metamask/assets-controller';
import { ARC_USDC_ERC20_ADDRESS, augmentArcExcludedAssets } from './arc';
import { STABLE_USDT0_ERC20_ADDRESS } from './networks-customization';

describe('augmentArcExcludedAssets', () => {
  const arcErc20UsdcAssetId = `eip155:5042/erc20:${ARC_USDC_ERC20_ADDRESS}`;
  const stableErc20Usdt0AssetId = `eip155:988/erc20:${STABLE_USDT0_ERC20_ADDRESS}`;
  const otherAssetId =
    'eip155:1/erc20:0x1111111111111111111111111111111111111111';
  const arcNativeAssetId = 'eip155:5042/slip44:60';
  const stableNativeAssetId = 'eip155:988/slip44:60';

  it('strips Arc ERC20 USDC and Stable ERC20 USDT0 from assetsBalance', () => {
    const state = {
      assetsInfo: {},
      assetsPrice: {},
      assetPreferences: {},
      customAssets: {},
      selectedCurrency: 'usd',
      assetsBalance: {
        'account-1': {
          [arcErc20UsdcAssetId]: { balance: '1' },
          [stableErc20Usdt0AssetId]: { balance: '2' },
          [arcNativeAssetId]: { balance: '3' },
          [stableNativeAssetId]: { balance: '4' },
          [otherAssetId]: { balance: '5' },
        },
      },
    } as unknown as AssetsControllerState;

    expect(augmentArcExcludedAssets(state).assetsBalance['account-1']).toEqual({
      [arcNativeAssetId]: { balance: '3' },
      [stableNativeAssetId]: { balance: '4' },
      [otherAssetId]: { balance: '5' },
    });
  });
});
