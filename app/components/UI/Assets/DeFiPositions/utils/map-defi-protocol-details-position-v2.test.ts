import {
  getNativeTokenAddress,
  type DeFiUnderlyingPosition,
} from '@metamask/assets-controllers';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { mapDefiProtocolDetailsPositionV2ToToken } from './map-defi-protocol-details-position-v2';

describe('mapDefiProtocolDetailsPositionV2ToToken', () => {
  const position: DeFiUnderlyingPosition = {
    assetId: 'eip155:59144/erc20:0x1111111111111111111111111111111111111111',
    chainId: 'eip155:59144',
    symbol: 'mUSD',
    name: 'MetaMask USD',
    balance: '0.00001',
    decimals: 18,
    marketValue: 0.00001,
    positionType: 'deposit',
    poolAddress: '0xpool',
    groupId: 'group-musd-1',
    tokenImage: 'musd.png',
  };

  it('maps precomputed fiat and converts CAIP chain id to hex', () => {
    expect(mapDefiProtocolDetailsPositionV2ToToken(position)).toMatchObject({
      name: 'MetaMask USD',
      symbol: 'mUSD',
      marketValue: 0.00001,
      chainId: '0xe708',
      iconUrl: 'musd.png',
      balance: 0.00001,
      isNative: false,
      positionType: 'deposit',
    });
  });

  it('marks native assets and uses the chain native token address', () => {
    const nativePosition: DeFiUnderlyingPosition = {
      ...position,
      assetId: 'eip155:59144/slip44:60',
      symbol: 'ETH',
      name: 'Ethereum',
    };

    expect(
      mapDefiProtocolDetailsPositionV2ToToken(nativePosition),
    ).toMatchObject({
      name: 'Ethereum',
      symbol: 'ETH',
      address: getNativeTokenAddress('0xe708'),
      isNative: true,
    });
  });

  it('uses Polygon native token address for Polygon slip44 assets', () => {
    const polygonNativePosition: DeFiUnderlyingPosition = {
      ...position,
      assetId: 'eip155:137/slip44:966',
      chainId: 'eip155:137',
      symbol: 'POL',
      name: 'Polygon',
    };

    expect(
      mapDefiProtocolDetailsPositionV2ToToken(polygonNativePosition),
    ).toMatchObject({
      isNative: true,
      address: getNativeTokenAddress('0x89'),
      chainId: '0x89',
    });
  });

  it('returns a checksummed hex address for an ERC-20 asset', () => {
    const lowercaseAddress = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
    const erc20Position: DeFiUnderlyingPosition = {
      ...position,
      assetId: `eip155:1/erc20:${lowercaseAddress}`,
      chainId: 'eip155:1',
    };

    const { address } = mapDefiProtocolDetailsPositionV2ToToken(erc20Position);

    expect(address).toBe(toChecksumHexAddress(lowercaseAddress));
    expect(address).not.toBe(lowercaseAddress);
    expect(address).toMatch(/[A-F]/u);
  });

  it('leaves market value undefined when unavailable', () => {
    const positionWithoutPrice: DeFiUnderlyingPosition = {
      ...position,
      marketValue: undefined,
    };

    expect(
      mapDefiProtocolDetailsPositionV2ToToken(positionWithoutPrice),
    ).toMatchObject({
      marketValue: undefined,
    });
  });

  it('returns 0 balance when the balance string is invalid', () => {
    const invalidBalancePosition: DeFiUnderlyingPosition = {
      ...position,
      balance: 'not-a-number',
    };

    expect(
      mapDefiProtocolDetailsPositionV2ToToken(invalidBalancePosition).balance,
    ).toBe(0);
  });

  it('passes a non-EVM CAIP chain id and asset id through unchanged', () => {
    const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const solanaAssetId = `${solanaChainId}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`;
    const solanaPosition: DeFiUnderlyingPosition = {
      ...position,
      assetId: solanaAssetId,
      chainId: solanaChainId,
    };

    expect(
      mapDefiProtocolDetailsPositionV2ToToken(solanaPosition),
    ).toMatchObject({
      chainId: solanaChainId,
      address: solanaAssetId,
    });
  });

  it('returns the asset id unchanged when it is not a CAIP asset type', () => {
    const rawAssetId = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
    const nonCaipAssetPosition: DeFiUnderlyingPosition = {
      ...position,
      assetId: rawAssetId as DeFiUnderlyingPosition['assetId'],
      chainId: 'eip155:1',
    };

    expect(
      mapDefiProtocolDetailsPositionV2ToToken(nonCaipAssetPosition),
    ).toMatchObject({
      address: rawAssetId,
      isNative: false,
      chainId: '0x1',
    });
  });
});
