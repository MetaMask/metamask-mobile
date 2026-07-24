import type { DeFiUnderlyingPosition } from '@metamask/assets-controllers';
import AppConstants from '../../../../core/AppConstants';
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
    });
  });

  it('marks native assets and uses the zero address', () => {
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
      address: AppConstants.ZERO_ADDRESS,
      isNative: true,
    });
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
});
