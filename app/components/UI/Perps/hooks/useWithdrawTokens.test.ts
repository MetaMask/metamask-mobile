import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useWithdrawTokens } from './useWithdrawTokens';
import {
  USDC_SYMBOL,
  USDC_DECIMALS,
  USDC_NAME,
  HYPERLIQUID_MAINNET_CHAIN_ID,
} from '../constants/hyperLiquidConfig';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock token icon utils
jest.mock('../utils/tokenIconUtils');

import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';

describe('useWithdrawTokens', () => {
  const mockTokenList = {
    '0xa4b1_0x0000000000000000000000000000000000000000': {
      symbol: USDC_SYMBOL,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      iconUrl: 'https://test.com/usdc.png',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock enhanceTokenWithIcon to add image property
    (enhanceTokenWithIcon as jest.Mock).mockImplementation(({ token }) => ({
      ...token,
      image: 'https://test.com/usdc.png',
    }));

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector.name === 'selectTokenList') {
        return mockTokenList;
      }
      if (selector.name === 'selectIsIpfsGatewayEnabled') {
        return false;
      }
      return null;
    });
  });

  it('should return source and destination tokens', () => {
    const { result } = renderHook(() => useWithdrawTokens());

    expect(result.current.sourceToken).toBeDefined();
    expect(result.current.destToken).toBeDefined();
  });

  it('should configure source token with correct properties', () => {
    const { result } = renderHook(() => useWithdrawTokens());

    expect(result.current.sourceToken.symbol).toBe(USDC_SYMBOL);
    expect(result.current.sourceToken.decimals).toBe(USDC_DECIMALS);
    expect(result.current.sourceToken.name).toBe(USDC_NAME);
    expect(result.current.sourceToken.chainId).toBe(
      HYPERLIQUID_MAINNET_CHAIN_ID,
    );
    expect(result.current.sourceToken.currencyExchangeRate).toBe(1);
  });

  it('should configure destination token with correct properties', () => {
    const { result } = renderHook(() => useWithdrawTokens());

    expect(result.current.destToken.symbol).toBe(USDC_SYMBOL);
    expect(result.current.destToken.decimals).toBe(USDC_DECIMALS);
    expect(result.current.destToken.name).toBe(USDC_NAME);
    expect(result.current.destToken.chainId).toBe('0xa4b1'); // Arbitrum mainnet
    expect(result.current.destToken.currencyExchangeRate).toBe(1);
  });

  it('should work with token list', () => {
    // For this test, just verify that when tokenList is present,
    // the tokens are still returned with the expected properties
    const { result } = renderHook(() => useWithdrawTokens());

    // The important thing is that tokens are returned with correct base properties
    expect(result.current.sourceToken).toBeDefined();
    expect(result.current.destToken).toBeDefined();
    expect(result.current.sourceToken.symbol).toBe(USDC_SYMBOL);
    expect(result.current.destToken.symbol).toBe(USDC_SYMBOL);
  });

  it('should handle missing token list', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector.name === 'selectTokenList') {
        return null;
      }
      if (selector.name === 'selectIsIpfsGatewayEnabled') {
        return false;
      }
      return null;
    });

    const { result } = renderHook(() => useWithdrawTokens());

    expect(result.current.sourceToken).toBeDefined();
    expect(result.current.destToken).toBeDefined();
    expect(result.current.sourceToken.image).toBeUndefined();
    expect(result.current.destToken.image).toBeUndefined();
  });
});
