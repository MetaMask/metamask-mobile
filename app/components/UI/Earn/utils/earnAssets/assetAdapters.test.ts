import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import type { EarnAssetId } from '../../types/earnAssets';
import {
  createDiscoveryEarnAsset,
  createHeldEarnAsset,
  earnAssetToToken,
  getAssetEarnId,
  getEarnAssetMetadata,
} from './assetAdapters';

const ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ASSET_ID = `eip155:1/erc20:${ADDRESS}` as EarnAssetId;

const createWalletAsset = (): Asset =>
  ({
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: ADDRESS,
    address: ADDRESS,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '10',
    rawBalance: '0x989680',
    fiat: { balance: 10, currency: 'USD', conversionRate: 1 },
    isNative: false,
  }) as Asset;

describe('Earn asset adapters', () => {
  it('normalizes an EVM controller asset to CAIP-19', () => {
    expect(getAssetEarnId(createWalletAsset())).toBe(ASSET_ID);
  });

  it('reads held metadata from the controller asset', () => {
    const asset = createHeldEarnAsset(createWalletAsset(), ASSET_ID, []);

    expect(getEarnAssetMetadata(asset)).toMatchObject({
      address: ADDRESS,
      chainId: '0x1',
      symbol: 'USDC',
    });
  });

  it('converts a held asset to the legacy token navigation contract', () => {
    const asset = createHeldEarnAsset(createWalletAsset(), ASSET_ID, []);

    expect(earnAssetToToken(asset)).toMatchObject({
      address: ADDRESS,
      balance: '10',
      balanceFiat: '$10.00',
      isStaked: false,
      symbol: 'USDC',
    });
  });

  it('marks mainnet ETH as unstaked for legacy Earn token lookup', () => {
    const ethAsset = {
      ...createWalletAsset(),
      assetId: '0x0000000000000000000000000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      isNative: true,
    } as Asset;
    const asset = createHeldEarnAsset(
      ethAsset,
      'eip155:1/slip44:60' as EarnAssetId,
      [],
    );

    expect(earnAssetToToken(asset)).toMatchObject({
      isETH: true,
      isStaked: false,
    });
  });

  it('keeps discovery metadata separate from wallet asset state', () => {
    const asset = createDiscoveryEarnAsset(
      ASSET_ID,
      {
        address: ADDRESS,
        chainId: '0x1',
        decimals: 6,
        image: 'usdc.png',
        name: 'USD Coin',
        symbol: 'USDC',
        logo: 'usdc.png',
        isETH: false,
      },
      [],
    );

    expect(asset.kind).toBe('discovery');
    expect(earnAssetToToken(asset).balance).toBe('0');
  });
});
