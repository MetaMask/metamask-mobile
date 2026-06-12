import React from 'react';
import { render } from '@testing-library/react-native';
import AssetDetailsQuickBuy from './AssetDetailsQuickBuy';
import type { TokenDetailsRouteParams } from '../constants/constants';

const mockQuickBuyRoot = jest.fn((_props: unknown) => null);

jest.mock(
  '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/quickBuy',
  () => ({
    QuickBuy: {
      Root: (props: unknown) => mockQuickBuyRoot(props),
    },
  }),
);

jest.mock(
  '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/features',
  () => ({
    TOP_TRADERS_QUICK_BUY_FEATURES: { tradeModes: ['buy'] },
  }),
);

const mockFormatChainIdToCaip = jest.fn();
jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: (chainId: string) => mockFormatChainIdToCaip(chainId),
}));

const mockToken = {
  address: '0xtoken',
  symbol: 'TKN',
  name: 'Token',
  chainId: '0x1',
} as unknown as TokenDetailsRouteParams;

describe('AssetDetailsQuickBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatChainIdToCaip.mockImplementation(
      (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
    );
  });

  it('maps a TokenI to a QuickBuyTarget with a CAIP chain id', () => {
    render(
      <AssetDetailsQuickBuy isVisible token={mockToken} onClose={jest.fn()} />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          tokenAddress: '0xtoken',
          tokenSymbol: 'TKN',
          tokenName: 'Token',
          chain: 'eip155:1',
        },
      }),
    );
  });

  it('builds a target for a native asset without a name by falling back to the symbol', () => {
    const nativeToken = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      chainId: '0x1',
    } as unknown as TokenDetailsRouteParams;

    render(
      <AssetDetailsQuickBuy
        isVisible
        token={nativeToken}
        onClose={jest.fn()}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenName: 'ETH',
          chain: 'eip155:1',
        },
      }),
    );
  });

  it('forwards host token metadata (decimals + image) into the target', () => {
    // Arrange — a Tron TRC-20 asset as it appears on the asset-details page:
    // CAIP chain id and CAIP-19 address, with metadata already resolved.
    mockFormatChainIdToCaip.mockImplementation((chainId: string) => chainId);
    const tronToken = {
      address: 'tron:728126428/trc20:TUPM7K8REVzD2UdV4R5fe5M8XbnR2DdoJ6',
      symbol: 'HTX',
      name: 'HTX DAO',
      chainId: 'tron:728126428',
      decimals: 18,
      image: 'https://example.com/htx.png',
    } as unknown as TokenDetailsRouteParams;

    // Act
    render(
      <AssetDetailsQuickBuy isVisible token={tronToken} onClose={jest.fn()} />,
    );

    // Assert — decimals/image ride along so QuickBuy can build the dest
    // token without a metadata fetch.
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          tokenAddress:
            'tron:728126428/trc20:TUPM7K8REVzD2UdV4R5fe5M8XbnR2DdoJ6',
          tokenSymbol: 'HTX',
          tokenName: 'HTX DAO',
          chain: 'tron:728126428',
          tokenDecimals: 18,
          tokenImage: 'https://example.com/htx.png',
        },
      }),
    );
  });

  it('passes null target when token has no address', () => {
    const tokenNoAddress = {
      symbol: 'TKN',
      name: 'Token',
      chainId: '0x1',
    } as unknown as TokenDetailsRouteParams;

    render(
      <AssetDetailsQuickBuy
        isVisible
        token={tokenNoAddress}
        onClose={jest.fn()}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('passes null target when token address is an empty string', () => {
    const tokenEmptyAddress = {
      address: '',
      symbol: 'TKN',
      name: 'Token',
      chainId: '0x1',
    } as unknown as TokenDetailsRouteParams;

    render(
      <AssetDetailsQuickBuy
        isVisible
        token={tokenEmptyAddress}
        onClose={jest.fn()}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('passes null target when token address is null', () => {
    const tokenNullAddress = {
      address: null,
      symbol: 'TKN',
      name: 'Token',
      chainId: '0x1',
    } as unknown as TokenDetailsRouteParams;

    render(
      <AssetDetailsQuickBuy
        isVisible
        token={tokenNullAddress}
        onClose={jest.fn()}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('passes null target when token is null', () => {
    render(<AssetDetailsQuickBuy isVisible token={null} onClose={jest.fn()} />);

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('passes null target when token has no chainId', () => {
    const tokenNoChain = {
      address: '0xtoken',
      symbol: 'TKN',
      name: 'Token',
    } as unknown as TokenDetailsRouteParams;

    render(
      <AssetDetailsQuickBuy
        isVisible
        token={tokenNoChain}
        onClose={jest.fn()}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('passes null target when chain normalization throws', () => {
    mockFormatChainIdToCaip.mockImplementation(() => {
      throw new Error('unsupported chain');
    });

    render(
      <AssetDetailsQuickBuy isVisible token={mockToken} onClose={jest.fn()} />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('forwards isVisible and onClose to QuickBuy.Root', () => {
    const onClose = jest.fn();
    render(
      <AssetDetailsQuickBuy
        isVisible={false}
        token={mockToken}
        onClose={onClose}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ isVisible: false, onClose }),
    );
  });

  it('defaults analytics source to "asset_details" when no source prop is provided', () => {
    render(
      <AssetDetailsQuickBuy isVisible token={mockToken} onClose={jest.fn()} />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: { source: 'asset_details' },
      }),
    );
  });

  it('forwards an explicit source prop into the analytics context', () => {
    render(
      <AssetDetailsQuickBuy
        isVisible
        token={mockToken}
        onClose={jest.fn()}
        source="market_insights"
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: { source: 'market_insights' },
      }),
    );
  });
});
