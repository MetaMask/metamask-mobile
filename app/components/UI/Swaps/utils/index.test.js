import {
  getFetchParams,
  shouldShowMaxBalanceLink,
  isSwapsAllowed,
} from './index';
import { swapsUtils } from '@metamask/swaps-controller';
import { SolScope } from '@metamask/keyring-api';
import AppConstants from '../../../../core/AppConstants';

// Mock AppConstants
jest.mock('../../../../core/AppConstants', () => ({
  SWAPS: {
    ACTIVE: true,
    ONLY_MAINNET: true,
  },
}));

const {
  ETH_CHAIN_ID,
  BSC_CHAIN_ID,
  SWAPS_TESTNET_CHAIN_ID,
  POLYGON_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  ARBITRUM_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
  LINEA_CHAIN_ID,
  BASE_CHAIN_ID,
} = swapsUtils;

describe('getFetchParams', () => {
  const mockSourceToken = {
    address: '0x123',
    symbol: 'TOKEN1',
    decimals: 18,
  };

  const mockDestinationToken = {
    address: '0x456',
    symbol: 'TOKEN2',
    decimals: 18,
  };

  const mockBaseParams = {
    slippage: 1,
    sourceToken: mockSourceToken,
    destinationToken: mockDestinationToken,
    sourceAmount: '1000000000000000000', // 1 token in wei
    walletAddress: '0x789',
    networkClientId: '1',
    enableGasIncludedQuotes: true,
  };

  it('returns correct parameters with default slippage', () => {
    const result = getFetchParams(mockBaseParams);

    expect(result).toEqual({
      slippage: 1,
      sourceToken: mockSourceToken.address,
      destinationToken: mockDestinationToken.address,
      sourceAmount: '1000000000000000000',
      walletAddress: '0x789',
      metaData: {
        sourceTokenInfo: mockSourceToken,
        destinationTokenInfo: mockDestinationToken,
        networkClientId: '1',
      },
      enableGasIncludedQuotes: true,
    });
  });

  it('returns correct parameters with custom slippage', () => {
    const result = getFetchParams({
      ...mockBaseParams,
      slippage: 2,
    });

    expect(result).toEqual({
      slippage: 2,
      sourceToken: mockSourceToken.address,
      destinationToken: mockDestinationToken.address,
      sourceAmount: '1000000000000000000',
      walletAddress: '0x789',
      metaData: {
        sourceTokenInfo: mockSourceToken,
        destinationTokenInfo: mockDestinationToken,
        networkClientId: '1',
      },
      enableGasIncludedQuotes: true,
    });
  });

  it('returns correct parameters with gas included quotes disabled', () => {
    const result = getFetchParams({
      ...mockBaseParams,
      enableGasIncludedQuotes: false,
    });

    expect(result).toEqual({
      slippage: 1,
      sourceToken: mockSourceToken.address,
      destinationToken: mockDestinationToken.address,
      sourceAmount: '1000000000000000000',
      walletAddress: '0x789',
      metaData: {
        sourceTokenInfo: mockSourceToken,
        destinationTokenInfo: mockDestinationToken,
        networkClientId: '1',
      },
      enableGasIncludedQuotes: false,
    });
  });
});

describe('shouldShowMaxBalanceLink', () => {
  const nativeToken = {
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000', // NATIVE_SWAPS_TOKEN_ADDRESS
  };

  const erc20Token = {
    symbol: 'DAI',
    address: '0x123456789abcdef',
  };

  it('should show max balance link when all conditions are met for ERC20 token', () => {
    const result = shouldShowMaxBalanceLink({
      sourceToken: erc20Token,
      shouldUseSmartTransaction: true,
      hasBalance: true,
    });
    expect(result).toBe(true);
  });

  it('should show max balance link for native token when smart transactions enabled', () => {
    const result = shouldShowMaxBalanceLink({
      sourceToken: nativeToken,
      shouldUseSmartTransaction: true,
      hasBalance: true,
    });
    expect(result).toBe(true);
  });

  it('should not show max balance link for native token when smart transactions disabled', () => {
    const result = shouldShowMaxBalanceLink({
      sourceToken: nativeToken,
      shouldUseSmartTransaction: false,
      hasBalance: true,
    });
    expect(result).toBe(false);
  });

  it('should show max balance link for ERC20 token regardless of smart transaction setting', () => {
    let result = shouldShowMaxBalanceLink({
      sourceToken: erc20Token,
      shouldUseSmartTransaction: true,
      hasBalance: true,
    });
    expect(result).toBe(true);

    result = shouldShowMaxBalanceLink({
      sourceToken: erc20Token,
      shouldUseSmartTransaction: false,
      hasBalance: true,
    });
    expect(result).toBe(true);
  });

  it('should not show max balance link when source token is missing symbol', () => {
    const sourceToken = { ...erc20Token, symbol: null };
    const result = shouldShowMaxBalanceLink({
      sourceToken,
      shouldUseSmartTransaction: true,
      hasBalance: true,
    });
    expect(result).toBe(false);
  });

  it('should not show max balance link when user has no balance', () => {
    const result = shouldShowMaxBalanceLink({
      sourceToken: erc20Token,
      shouldUseSmartTransaction: true,
      hasBalance: false,
    });
    expect(result).toBe(false);
  });
});

describe('isSwapsAllowed', () => {
  beforeEach(() => {
    // Reset process.env
    process.env.MM_BRIDGE_UI_ENABLED = 'false';
  });

  it('should return false when swaps are not active', () => {
    // Mock AppConstants.SWAPS.ACTIVE to false
    AppConstants.SWAPS.ACTIVE = false;
    expect(isSwapsAllowed(ETH_CHAIN_ID)).toBe(false);
    // Reset to true for other tests
    AppConstants.SWAPS.ACTIVE = true;
  });

  test.each([
    [ETH_CHAIN_ID],
    [BSC_CHAIN_ID],
    [POLYGON_CHAIN_ID],
    [AVALANCHE_CHAIN_ID],
    [ARBITRUM_CHAIN_ID],
    [OPTIMISM_CHAIN_ID],
    [ZKSYNC_ERA_CHAIN_ID],
    [LINEA_CHAIN_ID],
    [BASE_CHAIN_ID],
  ])('should return true for chain ID %s', (chainId) => {
    expect(isSwapsAllowed(chainId)).toBe(true);
  });

  it('should return false for Solana mainnet when bridge UI is disabled', () => {
    process.env.MM_BRIDGE_UI_ENABLED = 'false';
    expect(isSwapsAllowed(SolScope.Mainnet)).toBe(false);
  });

  it('should return false for unsupported chain IDs', () => {
    const unsupportedChainId = '0x9999';
    expect(isSwapsAllowed(unsupportedChainId)).toBe(false);
  });
});
