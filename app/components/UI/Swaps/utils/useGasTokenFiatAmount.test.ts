import { renderHook } from '@testing-library/react-hooks';
import { useGasTokenFiatAmount } from './useGasTokenFiatAmount';
import { swapsUtils } from '@metamask/swaps-controller';
import { toWei, weiToFiat } from '../../../../util/number/legacy';
import { hexToDecimal } from '../../../../util/conversions';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Quote } from '@metamask/swaps-controller/dist/types';
import { ContractExchangeRates } from '@metamask/assets-controllers';
import BigNumber from 'bignumber.js';

// Mocking dependencies
jest.mock('@metamask/swaps-controller', () => ({
  swapsUtils: {
    calcTokenAmount: jest.fn(),
  },
}));

jest.mock('../../../../util/number/legacy', () => ({
  toWei: jest.fn(),
  weiToFiat: jest.fn(),
}));

jest.mock('../../../../util/conversions', () => ({
  hexToDecimal: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  toChecksumHexAddress: jest.fn(),
}));

// Create a simple mock Quote with only the properties we need for testing
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
const mockQuoteWithoutTrade = {
  trade: null,
} as unknown as Quote;

describe('useGasTokenFiatAmount', () => {
  const mockChecksumAddress = '0xChecksumAddress';
  const mockTokenFee = {
    token: {
      address: '0xTokenAddress',
      decimals: 18,
      symbol: 'TKN',
    },
    balanceNeededToken: '0x123',
  };
  const mockCurrentCurrency = 'USD';
  // Create a mock that matches the ContractExchangeRates type
  const mockFiatConversionRates = {
    [mockChecksumAddress]: 1.5,
  } as unknown as ContractExchangeRates;

  beforeEach(() => {
    jest.clearAllMocks();
    (hexToDecimal as jest.Mock).mockReturnValue('123');
    (toChecksumHexAddress as jest.Mock).mockReturnValue(mockChecksumAddress);
    (swapsUtils.calcTokenAmount as jest.Mock).mockReturnValue(
      new BigNumber('0.000123'),
    );
    (toWei as jest.Mock).mockReturnValue('123000000000000');
    (weiToFiat as jest.Mock).mockReturnValue('0.18');
  });

  it('should return undefined when gas included swap is not available', () => {
    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: false,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBeUndefined();
    expect(hexToDecimal).not.toHaveBeenCalled();
    expect(swapsUtils.calcTokenAmount).not.toHaveBeenCalled();
    expect(toWei).not.toHaveBeenCalled();
    expect(weiToFiat).not.toHaveBeenCalled();
  });

  it('should return undefined when selected quote has no trade', () => {
    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithoutTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBeUndefined();
    expect(hexToDecimal).not.toHaveBeenCalled();
    expect(swapsUtils.calcTokenAmount).not.toHaveBeenCalled();
    expect(toWei).not.toHaveBeenCalled();
    expect(weiToFiat).not.toHaveBeenCalled();
  });

  it('should return undefined when token fee is missing required data', () => {
    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: {
          token: { address: '0xTokenAddress', symbol: 'TKN', decimals: 0 },
          balanceNeededToken: '0x123',
        },
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBeUndefined();
    expect(hexToDecimal).not.toHaveBeenCalled();
    expect(swapsUtils.calcTokenAmount).not.toHaveBeenCalled();
    expect(toWei).not.toHaveBeenCalled();
    expect(weiToFiat).not.toHaveBeenCalled();
  });

  it('should return undefined when token fee is missing balanceNeededToken', () => {
    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: {
          token: { address: '0xTokenAddress', symbol: 'TKN', decimals: 18 },
        },
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBeUndefined();
    expect(hexToDecimal).not.toHaveBeenCalled();
    expect(swapsUtils.calcTokenAmount).not.toHaveBeenCalled();
    expect(toWei).not.toHaveBeenCalled();
    expect(weiToFiat).not.toHaveBeenCalled();
  });

  it('should return undefined when checksumAddress is not available', () => {
    (toChecksumHexAddress as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBeUndefined();
    expect(hexToDecimal).toHaveBeenCalledWith('0x123');
    expect(swapsUtils.calcTokenAmount).toHaveBeenCalled();
    expect(
      String((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][0]),
    ).toEqual('123');
    expect((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][1]).toBe(18);
    expect(toWei).not.toHaveBeenCalled();
    expect(weiToFiat).not.toHaveBeenCalled();
  });

  it('should calculate and return the fiat amount when all data is available', () => {
    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBe('0.18');
    expect(hexToDecimal).toHaveBeenCalledWith('0x123');
    expect(swapsUtils.calcTokenAmount).toHaveBeenCalled();
    expect(
      String((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][0]),
    ).toEqual('123');
    expect((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][1]).toBe(18);
    expect(toWei).toHaveBeenCalledWith('0.000123');
    expect(weiToFiat).toHaveBeenCalledWith('123000000000000', 1.5, 'USD');
  });

  it('should return empty string when weiToFiat returns falsy value', () => {
    (weiToFiat as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBe('');
    expect(hexToDecimal).toHaveBeenCalledWith('0x123');
    expect(swapsUtils.calcTokenAmount).toHaveBeenCalled();
    expect(
      String((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][0]),
    ).toEqual('123');
    expect((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][1]).toBe(18);
    expect(toWei).toHaveBeenCalledWith('0.000123');
    expect(weiToFiat).toHaveBeenCalledWith('123000000000000', 1.5, 'USD');
  });

  it('should handle missing fiatConversionRates', () => {
    (weiToFiat as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: undefined,
      }),
    );

    expect(result.current).toBe('');
    expect(hexToDecimal).toHaveBeenCalledWith('0x123');
    expect(swapsUtils.calcTokenAmount).toHaveBeenCalled();
    expect(
      String((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][0]),
    ).toEqual('123');
    expect((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][1]).toBe(18);
    expect(toWei).toHaveBeenCalledWith('0.000123');
    expect(weiToFiat).toHaveBeenCalledWith('123000000000000', undefined, 'USD');
  });

  it('should handle invalid token address in fiatConversionRates', () => {
    (toChecksumHexAddress as jest.Mock).mockReturnValue('0xInvalidAddress');
    (weiToFiat as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useGasTokenFiatAmount({
        canUseGasIncludedSwap: true,
        selectedQuote: mockQuoteWithTrade,
        tradeTxTokenFee: mockTokenFee,
        currentCurrency: mockCurrentCurrency,
        fiatConversionRates: mockFiatConversionRates,
      }),
    );

    expect(result.current).toBe('');
    expect(hexToDecimal).toHaveBeenCalledWith('0x123');
    expect(swapsUtils.calcTokenAmount).toHaveBeenCalled();
    expect(
      String((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][0]),
    ).toEqual('123');
    expect((swapsUtils.calcTokenAmount as jest.Mock).mock.calls[0][1]).toBe(18);
    expect(toWei).toHaveBeenCalledWith('0.000123');
    expect(weiToFiat).toHaveBeenCalledWith('123000000000000', undefined, 'USD');
  });
});
