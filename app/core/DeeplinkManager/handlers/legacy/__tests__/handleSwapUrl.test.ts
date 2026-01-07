import { handleSwapUrl } from '../handleSwapUrl';
import NavigationService from '../../../../NavigationService';
import { BridgeViewMode } from '../../../../../components/UI/Bridge/types';
import { fetchAssetMetadata } from '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';

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
      getNetworkConfigurationByChainId: jest.fn().mockReturnValue({
        rpcEndpoints: [
          {
            networkClientId: 'mainnetNetworkClientId',
          },
        ],
        defaultRpcEndpointIndex: 0,
      }),
    },
    MultichainNetworkController: {
      state: {
        multichainNetworkConfigurationsByChainId: {},
      },
    },
  },
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockFetchAssetMetadata = fetchAssetMetadata as jest.Mock;

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
    // Mock fetchAssetMetadata to return token data based on the address
    mockFetchAssetMetadata.mockImplementation(async (address) => {
      // Parse the address from CAIP format if needed
      const tokenAddress = address.includes('/')
        ? address.split(':')[2]
        : address;

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
      },
    });
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
      },
    });
  });
});
