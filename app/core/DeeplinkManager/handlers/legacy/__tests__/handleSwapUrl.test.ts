import { handleSwapUrl } from '../handleSwapUrl';
import NavigationService from '../../../../NavigationService';
import { BridgeViewMode } from '../../../../../components/UI/Bridge/types';
import { fetchAssetMetadata } from '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { resetSuppressedNetworkAddedToasts } from '../../../../../util/networks/networkToastSuppression';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

// Mock fetchAssetMetadata from the utils module
jest.mock(
  '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils',
  () => ({
    ...jest.requireActual(
      '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils',
    ),
    fetchAssetMetadata: jest.fn(),
  }),
);

// Mock Engine and related utilities
jest.mock('../../../../Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn(),
      addNetwork: jest.fn(),
    },
    NetworkEnablementController: {
      enableNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      state: {
        multichainNetworkConfigurationsByChainId: {},
      },
    },
  },
}));

const mockEngine = jest.requireMock('../../../../Engine') as {
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest.Mock;
      addNetwork: jest.Mock;
    };
    NetworkEnablementController: {
      enableNetwork: jest.Mock;
    };
  };
};
const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockFetchAssetMetadata = fetchAssetMetadata as jest.Mock;
const mockGetNetworkConfigurationByChainId =
  mockEngine.context.NetworkController.getNetworkConfigurationByChainId;
const mockAddNetwork = mockEngine.context.NetworkController.addNetwork;
const mockEnableNetwork =
  mockEngine.context.NetworkEnablementController.enableNetwork;
const availableNetworkConfig = {
  rpcEndpoints: [
    {
      networkClientId: 'mainnetNetworkClientId',
    },
  ],
  defaultRpcEndpointIndex: 0,
};

describe('handleSwapUrl', () => {
  const expectedSourceToken = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    image: 'https://example.com/usdc.png',
  };
  const expectedDestToken = {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: '0x1',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    image: 'https://example.com/usdt.png',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSuppressedNetworkAddedToasts();
    mockGetNetworkConfigurationByChainId.mockReturnValue(
      availableNetworkConfig,
    );
    // Mock fetchAssetMetadata to return token data based on the address
    mockFetchAssetMetadata.mockImplementation(async (address) => {
      const assetId = String(address);
      // Parse the address from CAIP format if needed
      const tokenAddress = assetId.includes('/')
        ? (assetId.split(':').at(-1) ?? assetId)
        : assetId;

      if (
        tokenAddress.toLowerCase() ===
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      ) {
        return {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          chainId: '0x1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          image: 'https://example.com/usdc.png',
          assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        };
      } else if (
        tokenAddress.toLowerCase() ===
        '0xdac17f958d2ee523a2206206994597c13d831ec7'
      ) {
        return {
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          chainId: '0x1',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          image: 'https://example.com/usdt.png',
          assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
        };
      }
      return undefined;
    });
  });

  it('navigates to Bridge view with processed tokens from valid CAIP-19 parameters', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedSourceToken,
        destToken: expectedDestToken,
        sourceAmount: '1.0',
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
    expect(mockEnableNetwork).toHaveBeenCalledWith(CHAIN_IDS.MAINNET);
  });

  it('navigates to Bridge view with partial parameters (only source token)', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedSourceToken,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('adds and enables supported missing EVM source networks before navigating', async () => {
    const expectedOptimismSourceToken = {
      address: '0x1111111111111111111111111111111111111111',
      chainId: CHAIN_IDS.OPTIMISM,
      decimals: 6,
      name: 'Optimism USDC',
      symbol: 'USDC',
      image: 'https://example.com/op-usdc.png',
    };
    const expectedOptimismDestToken = {
      address: '0x2222222222222222222222222222222222222222',
      chainId: CHAIN_IDS.OPTIMISM,
      decimals: 6,
      name: 'Optimism USDT',
      symbol: 'USDT',
      image: 'https://example.com/op-usdt.png',
    };

    mockFetchAssetMetadata.mockImplementation(async (address) => {
      const assetId = String(address);
      const tokenAddress = assetId.includes('/')
        ? (assetId.split(':').at(-1) ?? assetId)
        : assetId;

      if (
        tokenAddress.toLowerCase() ===
        '0x1111111111111111111111111111111111111111'
      ) {
        return {
          ...expectedOptimismSourceToken,
          assetId: 'eip155:10/erc20:0x1111111111111111111111111111111111111111',
        };
      }

      if (
        tokenAddress.toLowerCase() ===
        '0x2222222222222222222222222222222222222222'
      ) {
        return {
          ...expectedOptimismDestToken,
          assetId: 'eip155:10/erc20:0x2222222222222222222222222222222222222222',
        };
      }

      return undefined;
    });

    mockGetNetworkConfigurationByChainId
      .mockReturnValueOnce(undefined)
      .mockReturnValue(availableNetworkConfig);

    const swapPath =
      'from=eip155:10/erc20:0x1111111111111111111111111111111111111111&to=eip155:10/erc20:0x2222222222222222222222222222222222222222&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockAddNetwork).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_IDS.OPTIMISM,
        name: 'OP',
        nativeCurrency: 'ETH',
      }),
    );
    expect(mockEnableNetwork).toHaveBeenCalledWith(CHAIN_IDS.OPTIMISM);
    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedOptimismSourceToken,
        destToken: expectedOptimismDestToken,
        sourceAmount: '1.0',
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('navigates to Bridge view with partial parameters (only dest token)', async () => {
    const swapPath =
      'to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: expectedDestToken,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('handles invalid CAIP format and navigates with undefined for invalid tokens', async () => {
    const swapPath =
      'from=invalid-caip&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: expectedDestToken,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('handles unsupported tokens and navigates with undefined', async () => {
    // Mock fetchAssetMetadata to return undefined for unsupported tokens
    mockFetchAssetMetadata.mockResolvedValue(undefined);

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('falls back when the source chain is configured but not swap supported', async () => {
    mockFetchAssetMetadata.mockResolvedValueOnce({
      address: '0x3333333333333333333333333333333333333333',
      chainId: '0x1234',
      symbol: 'TEST',
      name: 'Unsupported Token',
      decimals: 18,
      image: 'https://example.com/test.png',
      assetId: 'eip155:4660/erc20:0x3333333333333333333333333333333333333333',
    });

    const swapPath =
      'from=eip155:4660/erc20:0x3333333333333333333333333333333333333333';

    await handleSwapUrl({ swapPath });

    expect(mockEnableNetwork).not.toHaveBeenCalledWith('0x1234');
    expect(mockAddNetwork).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('handles invalid amount format and navigates with fallback', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=invalid';

    await handleSwapUrl({ swapPath });

    // When amount is invalid, ethers.utils.formatUnits throws an error
    // causing the entire function to fall back to no parameters
    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('navigates to Bridge view without parameters when no valid parameters are provided', async () => {
    const swapPath = 'invalid=param';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });

  it('navigates to Bridge view with fallback when exception occurs', async () => {
    // Mock fetchAssetMetadata to throw an error
    mockFetchAssetMetadata.mockRejectedValue(new Error('API Error'));

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
        bridgeViewMode: BridgeViewMode.Unified,
        location: 'Main View',
      },
    });
  });
});
