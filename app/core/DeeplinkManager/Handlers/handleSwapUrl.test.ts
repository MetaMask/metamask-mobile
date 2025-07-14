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

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockFetchBridgeTokens = fetchBridgeTokens as jest.Mock;

describe('handleSwapUrl', () => {
  const expectedSourceToken = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 'eip155:1',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    image: 'https://example.com/usdc.png',
  };
  const expectedDestToken = {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 'eip155:1',
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

  it('navigates to Bridge view with hex amount processed correctly', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=0x38d7ea4c68000';

    await handleSwapUrl({ swapPath });

    // Hex strings are now invalid, so sourceAmount should be undefined
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

  it('navigates to Bridge view with partial parameters (only source token)', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expect.any(Object),
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
        destToken: expect.any(Object),
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('navigates to Bridge view with partial parameters (only amount - should be undefined without source token)', async () => {
    const swapPath = 'amount=1000000';

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

  it('handles invalid CAIP format and navigates with undefined for invalid tokens', async () => {
    const swapPath =
      'from=invalid-caip&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: undefined,
        destToken: expect.any(Object),
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
        sourceToken: expect.any(Object),
        destToken: expect.any(Object),
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

  it('navigates to Bridge view with fallback when malformed path is provided', async () => {
    const swapPath = 'malformed%query';

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

  it('handles URL path with ? prefix correctly', async () => {
    const swapPath =
      '?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedSourceToken,
        destToken: expectedDestToken,
        sourceAmount: '1', // 1000000 / 10^6 = 1 (decimal string)
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles very large amount correctly', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=999999999999999999';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedSourceToken,
        destToken: undefined,
        sourceAmount: '1000000000000',
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles amount with decimal string format', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=500000';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expectedSourceToken,
        destToken: undefined,
        sourceAmount: '0.5',
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles amount with non-decimal characters and returns undefined', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=1000abc';

    await handleSwapUrl({ swapPath });

    // This should be undefined since "1000abc" is not a valid decimal string
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

  it('handles amount with decimal point and returns undefined', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=1000.5';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expect.any(Object),
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles error in processAmount function', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=invalid-hex-format';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: expect.any(Object),
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles error in validateAndLookupToken function', async () => {
    // Mock fetchBridgeTokens to throw an error for specific token
    mockFetchBridgeTokens
      .mockResolvedValueOnce({}) // First call succeeds but returns empty
      .mockRejectedValueOnce(new Error('Network error')); // Second call fails

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7';

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

  it('handles token lookup with lowercase address fallback', async () => {
    // Mock bridge tokens with lowercase address
    mockFetchBridgeTokens.mockResolvedValue({
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        iconUrl: 'https://example.com/usdc.png',
      },
    });

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          chainId: 'eip155:1',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
          image: 'https://example.com/usdc.png',
        },
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles token with icon field instead of iconUrl', async () => {
    // Mock bridge tokens with icon field
    mockFetchBridgeTokens.mockResolvedValue({
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        icon: 'https://example.com/usdc-icon.png',
      },
    });

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          chainId: 'eip155:1',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
          image: 'https://example.com/usdc-icon.png',
        },
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles token with neither iconUrl nor icon field', async () => {
    // Mock bridge tokens without icon fields
    mockFetchBridgeTokens.mockResolvedValue({
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
    });

    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    await handleSwapUrl({ swapPath });

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          chainId: 'eip155:1',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
          image: '',
        },
        destToken: undefined,
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });

  it('handles zero amount and returns undefined', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=0';

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

  it('handles negative amount and returns undefined', async () => {
    const swapPath =
      'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=-1000000';

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
});
