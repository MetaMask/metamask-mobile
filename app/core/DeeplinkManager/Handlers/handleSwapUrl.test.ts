import { handleSwapUrl } from './handleSwapUrl';
import NavigationService from '../../NavigationService';
import {
  fetchBridgeTokens,
  isSolanaChainId,
} from '@metamask/bridge-controller';

jest.mock('../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

// Mock fetchBridgeTokens to return test data while preserving other exports
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  fetchBridgeTokens: jest.fn(),
  isSolanaChainId: jest.fn(),
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

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
jest.mock('../../Multichain/utils', () => ({
  isSolanaAccount: jest.fn(),
}));
///: END:ONLY_INCLUDE_IF

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockFetchBridgeTokens = fetchBridgeTokens as jest.Mock;
const mockIsSolanaChainId = isSolanaChainId as jest.Mock;

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
const mockIsSolanaAccount = jest.requireMock('../../Multichain/utils')
  .isSolanaAccount as jest.Mock;
///: END:ONLY_INCLUDE_IF

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

    // Default mocks for Solana functionality
    mockIsSolanaChainId.mockReturnValue(false);
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    mockIsSolanaAccount.mockReturnValue(false);
    ///: END:ONLY_INCLUDE_IF
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

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  describe('Solana Account Checking', () => {
    beforeEach(() => {
      // Mock Solana tokens in bridge list
      mockFetchBridgeTokens.mockResolvedValue({
        So11111111111111111111111111111111111111112: {
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          iconUrl: 'https://example.com/sol.png',
        },
        Es9vMFrzaCERaQeKX5Rdm1hTgFJ4QyP1gC1tF5uQW5Q: {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          iconUrl: 'https://example.com/usdc-sol.png',
        },
        // Keep existing EVM tokens for mixed tests
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          iconUrl: 'https://example.com/usdc.png',
        },
        '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          iconUrl: 'https://example.com/usdt.png',
        },
      });
    });

    it('redirects to Solana account creation when user has no Solana account and source token is Solana', async () => {
      // Mock Solana chain detection
      mockIsSolanaChainId.mockImplementation(
        (chainId) => chainId === 'solana:solana',
      );

      // Mock no Solana account exists
      mockIsSolanaAccount.mockReturnValue(false);

      const swapPath =
        'from=solana:solana/solana:So11111111111111111111111111111111111111112&to=eip155:1/slip44:60&amount=1000000';

      await handleSwapUrl({ swapPath });

      // Should redirect to account creation instead of bridge view
      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        screen: 'RootModalFlow',
        params: {
          screen: 'AddAccount',
          params: {
            scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            clientType: 'solana',
          },
        },
      });

      // Should not navigate to bridge view
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'Bridge',
        expect.any(Object),
      );
    });

    it('redirects to Solana account creation when user has no Solana account and destination token is Solana', async () => {
      // Mock Solana chain detection
      mockIsSolanaChainId.mockImplementation(
        (chainId) => chainId === 'solana:solana',
      );

      // Mock no Solana account exists
      mockIsSolanaAccount.mockReturnValue(false);

      const swapPath =
        'from=eip155:1/slip44:60&to=solana:solana/solana:So11111111111111111111111111111111111111112&amount=1000000000000000000';

      await handleSwapUrl({ swapPath });

      // Should redirect to account creation instead of bridge view
      expect(mockNavigate).toHaveBeenCalledWith('Modal', {
        screen: 'RootModalFlow',
        params: {
          screen: 'AddAccount',
          params: {
            scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            clientType: 'solana',
          },
        },
      });

      // Should not navigate to bridge view
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'Bridge',
        expect.any(Object),
      );
    });

    it('proceeds to bridge view when user has Solana account and tokens are Solana', async () => {
      // Mock Solana bridge tokens
      mockFetchBridgeTokens.mockResolvedValue({
        So11111111111111111111111111111111111111112: {
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          iconUrl: 'https://example.com/sol.png',
        },
        Es9vMFrzaCERaQeKX5Rdm1hTgFJ4QyP1gC1tF5uQW5Q: {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          iconUrl: 'https://example.com/usdc-sol.png',
        },
      });

      // Mock Solana chain detection
      mockIsSolanaChainId.mockImplementation(
        (chainId) => chainId === 'solana:solana',
      );

      // Mock Solana account exists
      mockIsSolanaAccount.mockReturnValue(true);

      // Mock Engine context to have Solana accounts
      const mockEngine = jest.requireMock('../../Engine');
      mockEngine.context.AccountsController.state.internalAccounts.accounts = {
        'solana-account': {
          metadata: {
            caipAccountId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      };

      const swapPath =
        'from=solana:solana/solana:So11111111111111111111111111111111111111112&to=solana:solana/solana:Es9vMFrzaCERaQeKX5Rdm1hTgFJ4QyP1gC1tF5uQW5Q&amount=1000000';

      await handleSwapUrl({ swapPath });

      // Should navigate to bridge view with resolved tokens
      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address:
              'solana:solana/solana:So11111111111111111111111111111111111111112',
            chainId: 'solana:solana',
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: 'https://example.com/sol.png',
          },
          destToken: {
            address:
              'solana:solana/solana:Es9vMFrzaCERaQeKX5Rdm1hTgFJ4QyP1gC1tF5uQW5Q',
            chainId: 'solana:solana',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
            image: 'https://example.com/usdc-sol.png',
          },
          sourceAmount: '0.001',
          sourcePage: 'deeplink',
        },
      });

      // Should not redirect to account creation
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'Modal',
        expect.any(Object),
      );
    });

    it('proceeds to bridge view when no Solana tokens are involved', async () => {
      // Mock no Solana chains
      mockIsSolanaChainId.mockReturnValue(false);

      // Mock no Solana account exists (should not matter)
      mockIsSolanaAccount.mockReturnValue(false);

      const swapPath =
        'from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000';

      await handleSwapUrl({ swapPath });

      // Should navigate to bridge view normally
      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: expectedSourceToken,
          destToken: expectedDestToken,
          sourceAmount: '1',
          sourcePage: 'deeplink',
        },
      });

      // Should not redirect to account creation
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'Modal',
        expect.any(Object),
      );
    });

    it('handles mixed EVM and Solana tokens when user has Solana account', async () => {
      // Mock Solana bridge tokens for destination
      mockFetchBridgeTokens.mockResolvedValue({
        So11111111111111111111111111111111111111112: {
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          iconUrl: 'https://example.com/sol.png',
        },
      });

      // Mock Solana chain detection for destination only
      mockIsSolanaChainId.mockImplementation(
        (chainId) => chainId === 'solana:solana',
      );

      // Mock Solana account exists
      mockIsSolanaAccount.mockReturnValue(true);

      const swapPath =
        'from=eip155:1/slip44:60&to=solana:solana/solana:So11111111111111111111111111111111111111112&amount=1000000000000000000';

      await handleSwapUrl({ swapPath });

      // Should navigate to bridge view with resolved destination token
      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: null, // EVM ETH token not in bridge list
          destToken: {
            address:
              'solana:solana/solana:So11111111111111111111111111111111111111112',
            chainId: 'solana:solana',
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: 'https://example.com/sol.png',
          },
          sourceAmount: undefined, // No source token means no amount processing
          sourcePage: 'deeplink',
        },
      });

      // Should not redirect to account creation
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'Modal',
        expect.any(Object),
      );
    });

    it('handles error in Solana account checking gracefully', async () => {
      // Mock Solana bridge tokens for source
      mockFetchBridgeTokens.mockResolvedValue({
        So11111111111111111111111111111111111111112: {
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          iconUrl: 'https://example.com/sol.png',
        },
      });

      // Mock Solana chain detection
      mockIsSolanaChainId.mockImplementation(
        (chainId) => chainId === 'solana:solana',
      );

      // Mock error in account checking
      mockIsSolanaAccount.mockImplementation(() => {
        throw new Error('Account checking error');
      });

      const swapPath =
        'from=solana:solana/solana:So11111111111111111111111111111111111111112&to=eip155:1/slip44:60&amount=1000000';

      await handleSwapUrl({ swapPath });

      // Should still navigate to bridge view despite error with resolved source token
      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address:
              'solana:solana/solana:So11111111111111111111111111111111111111112',
            chainId: 'solana:solana',
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: 'https://example.com/sol.png',
          },
          destToken: null, // EVM ETH token not in bridge list
          sourceAmount: '0.001',
          sourcePage: 'deeplink',
        },
      });
    });
  });
  ///: END:ONLY_INCLUDE_IF

  it('handles Solana tokens in bridge token list lookup correctly', async () => {
    // Mock Solana bridge tokens with raw addresses as keys
    mockFetchBridgeTokens.mockResolvedValue({
      So11111111111111111111111111111111111111112: {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        iconUrl: 'https://example.com/sol.png',
      },
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        iconUrl: 'https://example.com/usdc-sol.png',
      },
    });

    // Mock Solana chain detection
    mockIsSolanaChainId.mockImplementation(
      (chainId) => chainId === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    // Mock that user has a Solana account to bypass account creation redirect
    mockIsSolanaAccount.mockReturnValue(true);

    // Mock Engine context to have Solana accounts
    const mockEngine = jest.requireMock('../../Engine');
    mockEngine.context.AccountsController.state.internalAccounts.accounts = {
      'solana-account': {
        metadata: {
          caipAccountId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      },
    };
    ///: END:ONLY_INCLUDE_IF

    const swapPath =
      'from=eip155:1/slip44:60&to=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112&amount=1000000000';

    await handleSwapUrl({ swapPath });

    // Should navigate to bridge view with properly resolved Solana destination token
    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: null, // EVM ETH token should be null if not in bridge list
        destToken: {
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          image: 'https://example.com/sol.png',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
        sourceAmount: undefined,
        sourcePage: 'deeplink',
      },
    });
  });
});
