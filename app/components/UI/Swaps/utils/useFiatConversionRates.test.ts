import { renderHook } from '@testing-library/react-hooks';
import { useFiatConversionRates } from './useFiatConversionRates';
import { safeToChecksumAddress } from '../../../../util/address';
import { fetchTokenContractExchangeRates } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { Quote } from '@metamask/swaps-controller/dist/types';
import React from 'react';

// Mocking dependencies
jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
}));

jest.mock('@metamask/assets-controllers', () => ({
  fetchTokenContractExchangeRates: jest.fn(),
  CodefiTokenPricesServiceV2: jest.fn().mockImplementation(() => ({
    // Mock implementation of CodefiTokenPricesServiceV2
    getTokenPrices: jest.fn(),
  })),
}));

// Create a simple mock Quote with only the properties we need for testing
// Using type assertion to avoid type errors
const mockQuoteWithTrade = {
  trade: {
    data: 'mock-trade-data',
    from: '0xSender',
    to: '0xReceiver',
    value: '0x0',
    gas: '0x0',
  },
} as unknown as Quote;

// For the no-trade case, we'll use a partial mock with trade set to null
// Using type assertion to avoid type errors
const mockQuoteWithoutTrade = {
  trade: null,
} as unknown as Quote;

describe('useFiatConversionRates', () => {
  const mockChecksumAddress = '0xChecksumAddress';
  const mockTradeTxTokenFee = {
    token: {
      address: '0xTokenAddress',
      decimals: 18,
      symbol: 'TKN',
    },
    balanceNeededToken: '0x123',
  };
  const mockChainId = '0x1' as Hex;
  const mockCurrentCurrency = 'USD';
  const mockContractExchangeRates = {
    [mockChecksumAddress]: {
      USD: 1.5,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (safeToChecksumAddress as jest.Mock).mockReturnValue(mockChecksumAddress);
    (fetchTokenContractExchangeRates as jest.Mock).mockResolvedValue(
      mockContractExchangeRates,
    );
  });

  it('should return undefined when canUseGasIncludedSwap is false', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      // Use React.useMemo to stabilize object references
      const stableProps = React.useMemo(
        () => ({
          canUseGasIncludedSwap: false,
          selectedQuote: mockQuoteWithTrade,
          tradeTxTokenFee: mockTradeTxTokenFee,
          currentCurrency: mockCurrentCurrency,
          chainId: mockChainId,
        }),
        [],
      );

      return useFiatConversionRates(stableProps);
    });

    // Initial state should be pending
    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    // After update, it should return undefined and not be pending
    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBeUndefined();
    expect(fetchTokenContractExchangeRates).not.toHaveBeenCalled();
  });

  it('should return undefined when selectedQuote has no trade', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      // Use React.useMemo to stabilize object references
      const stableProps = React.useMemo(
        () => ({
          canUseGasIncludedSwap: true,
          selectedQuote: mockQuoteWithoutTrade,
          tradeTxTokenFee: mockTradeTxTokenFee,
          currentCurrency: mockCurrentCurrency,
          chainId: mockChainId,
        }),
        [],
      );

      return useFiatConversionRates(stableProps);
    });

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBeUndefined();
    expect(fetchTokenContractExchangeRates).not.toHaveBeenCalled();
  });

  it('should return undefined when token is missing required properties', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      // Use React.useMemo to stabilize object references
      const stableProps = React.useMemo(
        () => ({
          canUseGasIncludedSwap: true,
          selectedQuote: mockQuoteWithTrade,
          tradeTxTokenFee: {
            token: {
              address: '0xAddress',
              decimals: 0, // Using 0 as a falsy value to trigger the check
              symbol: 'TKN',
            },
            balanceNeededToken: '0x123',
          },
          currentCurrency: mockCurrentCurrency,
          chainId: mockChainId,
        }),
        [],
      );

      return useFiatConversionRates(stableProps);
    });

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBeUndefined();
    expect(fetchTokenContractExchangeRates).not.toHaveBeenCalled();
  });

  it('should return undefined when balanceNeededToken is missing', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      // Use React.useMemo to stabilize object references
      const stableProps = React.useMemo(
        () => ({
          canUseGasIncludedSwap: true,
          selectedQuote: mockQuoteWithTrade,
          tradeTxTokenFee: {
            token: { address: '0xAddress', decimals: 18, symbol: 'TKN' },
            balanceNeededToken: '', // Using empty string to trigger the check
          },
          currentCurrency: mockCurrentCurrency,
          chainId: mockChainId,
        }),
        [],
      );

      return useFiatConversionRates(stableProps);
    });

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBeUndefined();
    expect(fetchTokenContractExchangeRates).not.toHaveBeenCalled();
  });

  it('should return undefined when checksumAddress is null', async () => {
    (safeToChecksumAddress as jest.Mock).mockReturnValue(null);

    const { result, waitForNextUpdate } = renderHook(() => {
      // Use React.useMemo to stabilize object references
      const stableProps = React.useMemo(
        () => ({
          canUseGasIncludedSwap: true,
          selectedQuote: mockQuoteWithTrade,
          tradeTxTokenFee: mockTradeTxTokenFee,
          currentCurrency: mockCurrentCurrency,
          chainId: mockChainId,
        }),
        [],
      );

      return useFiatConversionRates(stableProps);
    });

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBeUndefined();
    expect(fetchTokenContractExchangeRates).not.toHaveBeenCalled();
  });

  it('should fetch and return exchange rates when all conditions are met', async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      // Use React.useMemo to stabilize object references
      const stableProps = React.useMemo(
        () => ({
          canUseGasIncludedSwap: true,
          selectedQuote: mockQuoteWithTrade,
          tradeTxTokenFee: mockTradeTxTokenFee,
          currentCurrency: mockCurrentCurrency,
          chainId: mockChainId,
        }),
        [],
      );

      return useFiatConversionRates(stableProps);
    });

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(result.current.pending).toBe(false);
    expect(result.current.value).toEqual(mockContractExchangeRates);
    expect(fetchTokenContractExchangeRates).toHaveBeenCalledWith({
      tokenPricesService: expect.any(Object),
      nativeCurrency: mockCurrentCurrency,
      tokenAddresses: [mockChecksumAddress],
      chainId: mockChainId,
    });
  });

  it('should handle errors from fetchTokenContractExchangeRates', async () => {
    const mockError = new Error('Failed to fetch exchange rates');
    (fetchTokenContractExchangeRates as jest.Mock).mockRejectedValue(mockError);

    try {
      const { result, waitForNextUpdate } = renderHook(() => {
        // Use React.useMemo to stabilize object references
        const stableProps = React.useMemo(
          () => ({
            canUseGasIncludedSwap: true,
            selectedQuote: mockQuoteWithTrade,
            tradeTxTokenFee: mockTradeTxTokenFee,
            currentCurrency: mockCurrentCurrency,
            chainId: mockChainId,
          }),
          [],
        );

        return useFiatConversionRates(stableProps);
      });

      expect(result.current.pending).toBe(true);

      await waitForNextUpdate();
      // This should throw an error with useAsyncResultOrThrow
    } catch (error) {
      expect(error).toEqual(mockError);
    }

    expect(fetchTokenContractExchangeRates).toHaveBeenCalled();
  });

  it('should re-fetch when dependencies change', async () => {
    // First render with USD
    const initialProps = {
      canUseGasIncludedSwap: true,
      selectedQuote: mockQuoteWithTrade,
      tradeTxTokenFee: mockTradeTxTokenFee,
      currentCurrency: 'USD',
      chainId: mockChainId,
    };

    const { result, waitForNextUpdate, rerender } = renderHook(
      (props) => {
        // Use React.useMemo to stabilize object references
        const stableProps = React.useMemo(() => props, [props]);
        return useFiatConversionRates(stableProps);
      },
      { initialProps },
    );

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(fetchTokenContractExchangeRates).toHaveBeenCalledTimes(1);

    // Rerender with new props (EUR instead of USD)
    rerender({
      ...initialProps,
      currentCurrency: 'EUR',
    });

    expect(result.current.pending).toBe(true);

    await waitForNextUpdate();

    expect(fetchTokenContractExchangeRates).toHaveBeenCalledTimes(2);
    expect(fetchTokenContractExchangeRates).toHaveBeenLastCalledWith({
      tokenPricesService: expect.any(Object),
      nativeCurrency: 'EUR',
      tokenAddresses: [mockChecksumAddress],
      chainId: mockChainId,
    });
  });
});
