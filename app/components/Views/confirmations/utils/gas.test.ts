import { BigNumber } from 'bignumber.js';
import { getFeesFromHex, calculateGasEstimate } from './gas';
import {
  getValueFromWeiHex,
  multiplyHexes,
} from '../../../../util/conversions';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
}));

jest.mock('../../../../components/UI/SimulationDetails/formatAmount', () => ({
  formatAmount: jest.fn((_locale: string, amount: BigNumber) =>
    amount.toFixed(4),
  ),
}));

jest.mock('../../../../util/conversions', () => ({
  addHexes: jest.fn(
    (a: string, b: string) =>
      `0x${(parseInt(a, 16) + parseInt(b, 16)).toString(16)}`,
  ),
  decGWEIToHexWEI: jest.fn(() => '0x3b9aca00'),
  decimalToHex: jest.fn(() => '0x0'),
  getValueFromWeiHex: jest.fn(() => '0.05'),
  multiplyHexes: jest.fn(() => '0xabc'),
}));

const mockGetValueFromWeiHex = jest.mocked(getValueFromWeiHex);
const mockMultiplyHexes = jest.mocked(multiplyHexes);

describe('gas utils', () => {
  const mockFiatFormatter = jest.fn(
    (amount: BigNumber) => `$${amount.toFixed(2)}`,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetValueFromWeiHex.mockReturnValue('0.05' as never);
    mockMultiplyHexes.mockReturnValue('0xabc' as never);
  });

  describe('getFeesFromHex', () => {
    it('returns all nulls when nativeCurrency is undefined', () => {
      const result = getFeesFromHex({
        hexFee: '0x5572e9c22d00',
        nativeConversionRate: 3000,
        nativeCurrency: undefined,
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(result).toEqual({
        currentCurrencyFee: null,
        nativeCurrencyFee: null,
        preciseCurrentCurrencyFee: null,
        preciseNativeCurrencyFee: null,
        preciseNativeFeeInHex: null,
      });
    });

    it('computes fees when nativeConversionRate is null and nativeCurrency is defined', () => {
      const result = getFeesFromHex({
        hexFee: '0x5572e9c22d00',
        nativeConversionRate: null,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(result.nativeCurrencyFee).not.toBeNull();
      expect(result.preciseNativeCurrencyFee).toContain('ETH');
      expect(result.preciseNativeFeeInHex).toBe('0x5572e9c22d00');
    });

    it('computes fees when nativeConversionRate is undefined and nativeCurrency is defined', () => {
      const result = getFeesFromHex({
        hexFee: '0x5572e9c22d00',
        nativeConversionRate: undefined,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(result.nativeCurrencyFee).not.toBeNull();
      expect(result.preciseNativeCurrencyFee).toContain('ETH');
      expect(result.preciseNativeFeeInHex).toBe('0x5572e9c22d00');
    });

    it('passes BigNumber(0) conversionRate to getValueFromWeiHex when nativeConversionRate is null', () => {
      getFeesFromHex({
        hexFee: '0x5572e9c22d00',
        nativeConversionRate: null,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(mockGetValueFromWeiHex).toHaveBeenCalledWith(
        expect.objectContaining({
          fromCurrency: 'WEI',
          conversionRate: 1,
        }),
      );

      expect(mockGetValueFromWeiHex).toHaveBeenCalledWith(
        expect.objectContaining({
          fromCurrency: 'GWEI',
          conversionRate: new BigNumber(0),
        }),
      );
    });

    it('passes BigNumber conversionRate to getValueFromWeiHex when nativeConversionRate is a number', () => {
      getFeesFromHex({
        hexFee: '0x5572e9c22d00',
        nativeConversionRate: 3596.25,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(mockGetValueFromWeiHex).toHaveBeenCalledWith(
        expect.objectContaining({
          fromCurrency: 'GWEI',
          conversionRate: new BigNumber(3596.25),
        }),
      );
    });

    it('sets currentCurrencyFee to null when shouldHideFiat is true', () => {
      const result = getFeesFromHex({
        hexFee: '0x5572e9c22d00',
        nativeConversionRate: null,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: true,
      });

      expect(result.currentCurrencyFee).toBeNull();
      expect(result.preciseCurrentCurrencyFee).toBeNull();
      expect(result.nativeCurrencyFee).not.toBeNull();
      expect(result.preciseNativeCurrencyFee).toContain('ETH');
    });

    it('formats currentCurrencyFee as less than threshold when precise fee is below 0.01', () => {
      mockGetValueFromWeiHex.mockReturnValue('0.005' as never);

      const result = getFeesFromHex({
        hexFee: '0x100',
        nativeConversionRate: 80,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(result.currentCurrencyFee).toBe('< $0.01');
    });

    it('formats currentCurrencyFee normally when precise fee is 0.01 or above', () => {
      mockGetValueFromWeiHex.mockReturnValue('0.05' as never);

      const result = getFeesFromHex({
        hexFee: '0x100',
        nativeConversionRate: 3000,
        nativeCurrency: 'ETH',
        fiatFormatter: mockFiatFormatter,
        shouldHideFiat: false,
      });

      expect(result.currentCurrencyFee).toBe('$0.05');
    });
  });

  describe('calculateGasEstimate', () => {
    const mockGetFeesFromHexFn = jest.fn(() => ({
      currentCurrencyFee: '$1.00',
      nativeCurrencyFee: '0.001',
      preciseCurrentCurrencyFee: '1.00',
      preciseNativeCurrencyFee: '0.001 ETH',
      preciseNativeFeeInHex: '0xabc',
    }));

    beforeEach(() => {
      mockGetFeesFromHexFn.mockClear();
    });

    it('returns fees from receipt gas price when receiptGasPrice is provided', () => {
      mockMultiplyHexes.mockReturnValue('0xdef' as never);

      calculateGasEstimate({
        feePerGas: '0x100',
        priorityFeePerGas: '0x10',
        gasPrice: '0x50',
        gas: '0x5208',
        shouldUseEIP1559FeeLogic: true,
        estimatedBaseFee: '10',
        getFeesFromHexFn: mockGetFeesFromHexFn,
        receiptGasPrice: '0x200',
      });

      expect(mockMultiplyHexes).toHaveBeenCalledWith('0x200', '0x5208');
      expect(mockGetFeesFromHexFn).toHaveBeenCalledWith('0xdef');
    });
  });
});
