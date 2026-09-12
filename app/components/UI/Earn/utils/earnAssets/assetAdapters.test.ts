import type { Asset } from '@metamask/assets-controllers';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { EthAccountType } from '@metamask/keyring-api';
import type { EarnAssetId } from '../../types/earnAssets';
import {
  createTrackedEarnAsset,
  createUntrackedEarnAsset,
  earnAssetToToken,
  getAssetEarnId,
} from './assetAdapters';

jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: jest.fn(),
}));

const ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ASSET_ID = `eip155:1/erc20:${ADDRESS}` as EarnAssetId;
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
const ETH_ASSET_ID = 'eip155:1/slip44:60' as EarnAssetId;
const TRX_ASSET_ID = 'tron:728126428/slip44:195' as EarnAssetId;

const mockFormatAddressToAssetId = jest.mocked(formatAddressToAssetId);

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

const createNativeAsset = (
  chainId: string,
  symbol: string,
  accountType: string = EthAccountType.Eoa,
): Asset => {
  const conversionRate = symbol === 'TRX' ? 0.25 : 2500;
  const asset = {
    accountType,
    accountId: 'account-id',
    assetId: symbol === 'TRX' ? TRX_ASSET_ID : ETH_ADDRESS,
    chainId,
    decimals: symbol === 'TRX' ? 6 : 18,
    image: symbol === 'TRX' ? 'trx.png' : 'eth.png',
    name: symbol === 'ETH' ? 'Ethereum' : symbol,
    symbol,
    balance: '1',
    rawBalance: symbol === 'TRX' ? '0xf4240' : '0xde0b6b3a7640000',
    fiat: { balance: conversionRate, currency: 'USD', conversionRate },
    isNative: true,
  };

  return (
    accountType.startsWith('eip155')
      ? { ...asset, address: ETH_ADDRESS }
      : asset
  ) as Asset;
};

describe('Earn asset adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes an EVM controller asset to CAIP-19', () => {
    const asset = createWalletAsset();

    const result = getAssetEarnId(asset);

    expect(result).toBe(ASSET_ID);
  });

  it('lowercases an existing CAIP asset ID', () => {
    const asset = {
      ...createWalletAsset(),
      assetId: ASSET_ID.toUpperCase(),
    } as Asset;

    const result = getAssetEarnId(asset);

    expect(result).toBe(ASSET_ID.toLowerCase());
  });

  it('returns a CAIP ID for a non-EVM asset', () => {
    const asset = {
      ...createWalletAsset(),
      assetId: TRX_ASSET_ID,
      chainId: 'tron:728126428',
      accountType: 'tron:728126428',
      address: undefined,
    } as unknown as Asset;

    const result = getAssetEarnId(asset);

    expect(result).toBe(TRX_ASSET_ID);
  });

  it('returns undefined for an asset without a supported identity', () => {
    const asset = {
      ...createWalletAsset(),
      assetId: 'wallet-asset-id',
      chainId: 'tron:728126428',
      accountType: 'tron:728126428',
      address: undefined,
    } as unknown as Asset;

    const result = getAssetEarnId(asset);

    expect(result).toBeUndefined();
  });

  it('normalizes a native asset through its chain-aware identity', () => {
    const asset = createNativeAsset('0x1', 'ETH');
    mockFormatAddressToAssetId.mockReturnValue(ETH_ASSET_ID);

    const result = getAssetEarnId(asset);

    expect(mockFormatAddressToAssetId).toHaveBeenCalledWith(ETH_ADDRESS, '0x1');
    expect(result).toBe(ETH_ASSET_ID);
  });

  it('returns undefined when native asset identity resolution throws', () => {
    const asset = createNativeAsset('0x1', 'ETH');
    mockFormatAddressToAssetId.mockImplementation(() => {
      throw new Error('Unsupported native asset');
    });

    const result = getAssetEarnId(asset);

    expect(result).toBeUndefined();
  });

  it('normalizes tracked wallet data into metadata and wallet state', () => {
    const walletAsset = createWalletAsset();

    const result = createTrackedEarnAsset(walletAsset, ASSET_ID, []);

    expect(result).toMatchObject({
      assetId: ASSET_ID,
      metadata: {
        address: ADDRESS,
        chainId: '0x1',
        symbol: 'USDC',
        ticker: 'USDC',
        logo: 'usdc.png',
        isETH: false,
        isStaked: false,
      },
      wallet: {
        status: 'tracked',
        asset: walletAsset,
      },
    });
  });

  it('normalizes non-EVM tracked metadata without an address field', () => {
    const walletAsset = createNativeAsset(
      'tron:728126428',
      'TRX',
      'tron:728126428',
    );
    const asset = createTrackedEarnAsset(walletAsset, TRX_ASSET_ID, []);

    expect(asset.metadata).toEqual({
      address: TRX_ASSET_ID,
      chainId: 'tron:728126428',
      decimals: 6,
      image: 'trx.png',
      name: 'TRX',
      symbol: 'TRX',
      ticker: 'TRX',
      logo: 'trx.png',
      isNative: true,
      isStaked: false,
      isETH: false,
    });
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', '   '],
  ] as const)(
    'uses canonical asset ID when tracked asset address is %s',
    (_addressState, address) => {
      const walletAsset = {
        ...createWalletAsset(),
        address,
      } as unknown as Asset;

      const asset = createTrackedEarnAsset(walletAsset, ASSET_ID, []);

      expect(asset.metadata.address).toBe(ASSET_ID);
    },
  );

  it('creates an untracked asset without wallet data', () => {
    const metadata = {
      address: ADDRESS,
      chainId: '0x1',
      decimals: 6,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      logo: 'usdc.png',
      isETH: false,
    };

    const result = createUntrackedEarnAsset(ASSET_ID, metadata, []);

    expect(result).toEqual({
      assetId: ASSET_ID,
      metadata,
      wallet: { status: 'untracked' },
      experiences: [],
    });
  });

  it('converts a tracked asset to the token navigation contract', () => {
    const asset = createTrackedEarnAsset(createWalletAsset(), ASSET_ID, []);

    const result = earnAssetToToken(asset);

    expect(result).toMatchObject({
      address: ADDRESS,
      balance: '10',
      balanceFiat: '$10.00',
      isStaked: false,
      symbol: 'USDC',
    });
  });

  it('omits fiat balance when tracked asset fiat data is unavailable', () => {
    const walletAsset = createWalletAsset();
    Reflect.deleteProperty(walletAsset, 'fiat');
    const asset = createTrackedEarnAsset(walletAsset, ASSET_ID, []);

    const result = earnAssetToToken(asset);

    expect(result.balance).toBe('10');
    expect(result.balanceFiat).toBeUndefined();
  });

  it('marks mainnet ETH as unstaked for legacy Earn token lookup', () => {
    const ethWalletAsset = {
      ...createWalletAsset(),
      assetId: '0x0000000000000000000000000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      isNative: true,
    } as Asset;
    const asset = createTrackedEarnAsset(
      ethWalletAsset,
      'eip155:1/slip44:60' as EarnAssetId,
      [],
    );

    const result = earnAssetToToken(asset);

    expect(result).toMatchObject({
      isETH: true,
      isStaked: false,
    });
  });

  it('does not mark native ETH on another EVM chain as mainnet ETH', () => {
    const ethWalletAsset = {
      ...createWalletAsset(),
      assetId: '0x0000000000000000000000000000000000000000',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0xa4b1',
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      isNative: true,
    } as Asset;
    const asset = createTrackedEarnAsset(
      ethWalletAsset,
      'eip155:42161/slip44:60' as EarnAssetId,
      [],
    );

    const result = earnAssetToToken(asset);

    expect(result).toMatchObject({
      isETH: false,
      isStaked: false,
    });
  });

  it('rejects token conversion for an untracked asset', () => {
    const asset = createUntrackedEarnAsset(
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

    expect(() => earnAssetToToken(asset)).toThrow(
      `Earn token conversion requires wallet-tracked asset: ${ASSET_ID}`,
    );
  });
});
