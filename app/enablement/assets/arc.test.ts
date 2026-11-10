import { type AssetsControllerState } from '@metamask/assets-controller';
import {
  ARC_HEX_CHAIN_ID,
  ARC_USDC_ERC20_ADDRESS,
  ARC_USDC_ERC20_ASSET_ID,
  augmentArcExcludedAssets,
  isArcUsdcErc20AssetId,
  isArcUsdcForBridge,
} from './arc';
import type { BridgeToken } from '../../components/UI/Bridge/types';
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

describe('isArcUsdcForBridge', () => {
  const createArcToken = (address: string): BridgeToken => ({
    address,
    chainId: ARC_HEX_CHAIN_ID,
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  });

  it.each([
    '0x0000000000000000000000000000000000000000',
    ARC_USDC_ERC20_ADDRESS,
  ])('returns true for Arc USDC represented by %s', (address) => {
    const token = createArcToken(address);

    const result = isArcUsdcForBridge(token);

    expect(result).toBe(true);
  });

  it('returns false for the Arc USDC ERC20 address on another chain', () => {
    const token = {
      ...createArcToken(ARC_USDC_ERC20_ADDRESS),
      chainId: '0x1' as const,
    };

    const result = isArcUsdcForBridge(token);

    expect(result).toBe(false);
  });
});

describe('isArcUsdcErc20AssetId', () => {
  it('returns true for the Arc ERC20 USDC asset id case-insensitively', () => {
    const result = isArcUsdcErc20AssetId(ARC_USDC_ERC20_ASSET_ID.toUpperCase());

    expect(result).toBe(true);
  });

  it('returns false for Arc native USDC', () => {
    const result = isArcUsdcErc20AssetId('eip155:5042/slip44:5042');

    expect(result).toBe(false);
  });
});
