import { renderHook } from '@testing-library/react-hooks';
import { useWithdrawTokens } from './useWithdrawTokens';
import {
  USDC_SYMBOL,
  USDC_DECIMALS,
  USDC_NAME,
  HYPERLIQUID_MAINNET_CHAIN_ID,
} from '@metamask/perps-controller';

describe('useWithdrawTokens', () => {
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
});
