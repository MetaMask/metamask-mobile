import { handleSwapUrl } from './handleSwapUrl';
import NavigationService from '../../NavigationService';
import { fetchBridgeTokens } from '@metamask/bridge-controller';

jest.mock('../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

// Mock fetchBridgeTokens to return test data while preserving other exports
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  fetchBridgeTokens: jest.fn(),
}));

// Mock Engine and related utilities
jest.mock('../../Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
        },
      },
    },
  },
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockFetchBridgeTokens = fetchBridgeTokens as jest.Mock;

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
    // Always mock the same token data for all tests unless explicitly overridden
    mockFetchBridgeTokens.mockResolvedValue({
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        iconUrl: 'https://example.com/usdc.png',
        icon: 'https://example.com/usdc.png',
      },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        iconUrl: 'https://example.com/usdt.png',
        icon: 'https://example.com/usdt.png',
      },
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
        sourceAmount: '1',
        sourcePage: 'deeplink',
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
      },
    });
  });

  it('handles unsupported tokens and navigates with undefined', async () => {
    // Mock empty bridge tokens to simulate unsupported token
    mockFetchBridgeTokens.mockResolvedValue({});

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: null,
        destToken: null,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles invalid amount format and navigates with undefined amount', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=invalid';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedSourceToken,
        destToken: expectedDestToken,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
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
      },
    });
  });

  it('navigates to Bridge view with fallback when exception occurs', async () => {
    // Mock fetchBridgeTokens to throw an error
    mockFetchBridgeTokens.mockRejectedValue(new Error('API Error'));

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: null,
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });
});
