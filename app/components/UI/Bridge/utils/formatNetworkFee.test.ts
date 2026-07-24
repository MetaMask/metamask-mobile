import {
  QuoteMetadata,
  QuoteResponse,
  toQuoteMetadataV2,
} from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import formatFiat from '../../../../util/formatFiat';
import { isNumberValue } from '../../../../util/number';
import { formatNetworkFee } from './formatNetworkFee';
import { isGaslessQuote } from './isGaslessQuote';

jest.mock('../../../../util/formatFiat');
jest.mock('../../../../util/number');
jest.mock('./isGaslessQuote');

const mockFormatFiat = formatFiat as jest.MockedFunction<typeof formatFiat>;
const mockIsNumberValue = isNumberValue as jest.MockedFunction<
  typeof isNumberValue
>;
const mockIsGaslessQuote = isGaslessQuote as jest.MockedFunction<
  typeof isGaslessQuote
>;

describe('formatNetworkFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNumberValue.mockReset();
    mockFormatFiat.mockReset();
    mockIsGaslessQuote.mockReturnValue(false);
  });

  describe('when quote is null or undefined', () => {
    it('returns "-" when quote is undefined', () => {
      const result = formatNetworkFee('USD', undefined);
      expect(result).toBe('-');
    });

    it('returns "-" when quote is null', () => {
      const result = formatNetworkFee('USD', null);
      expect(result).toBe('-');
    });
  });

  describe('gasless quotes', () => {
    beforeEach(() => {
      mockIsGaslessQuote.mockReturnValue(true);
    });

    it('returns formatted fiat when includedTxFees has valid amount and valueInCurrency', () => {
      mockIsNumberValue.mockReturnValue(true);
      mockFormatFiat.mockReturnValue('$5.00');

      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: '0.002',
          valueInCurrency: '5.00',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(mockIsGaslessQuote).toHaveBeenCalledWith(quote.quote);
      expect(mockFormatFiat).toHaveBeenCalledWith(new BigNumber('5.00'), 'USD');
      expect(result).toBe('$5.00');
    });

    it('returns "-" when includedTxFees.valueInCurrency is null', () => {
      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: '0.002',
          valueInCurrency: undefined,
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when includedTxFees.amount is null', () => {
      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: undefined,
          valueInCurrency: '5.00',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when includedTxFees.amount is not a valid number', () => {
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: 'invalid',
          valueInCurrency: '5.00',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when includedTxFees.valueInCurrency is not a valid number', () => {
      mockIsNumberValue.mockReturnValueOnce(true);
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: '0.002',
          valueInCurrency: 'invalid',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when includedTxFees is not set', () => {
      const quote = {
        quote: { gasIncluded: true },
      };

      const result = formatNetworkFee(
        'USD',
        toQuoteMetadataV2(quote as QuoteResponse & QuoteMetadata),
      );

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('does not fall through to totalNetworkFee when gasless', () => {
      const quote = {
        quote: { gasIncluded: true },
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });
  });

  describe('non-gasless quotes — totalNetworkFee path', () => {
    it('returns "-" when totalNetworkFee is undefined', () => {
      const quote = {} as QuoteResponse & QuoteMetadata;
      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee is null', () => {
      const quote = {
        totalNetworkFee: undefined,
      };
      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.amount is null', () => {
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: undefined,
          valueInCurrency: '100',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.valueInCurrency is null', () => {
      mockIsNumberValue.mockReturnValueOnce(true);
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: undefined,
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.amount is not a valid number', () => {
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: 'invalid',
          valueInCurrency: '100',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
      expect(isNumberValue).toHaveBeenCalledWith('invalid');
    });

    it('returns "-" when totalNetworkFee.valueInCurrency is not a valid number', () => {
      mockIsNumberValue.mockReturnValueOnce(true);
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: 'invalid',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
      expect(isNumberValue).toHaveBeenCalledWith('0.01');
      expect(isNumberValue).toHaveBeenCalledWith('invalid');
    });

    it('formats fee with USD currency', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.01' || value === '10.50',
      );
      mockFormatFiat.mockReturnValue('$10.50');

      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.50',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(isNumberValue).toHaveBeenCalledWith('0.01');
      expect(isNumberValue).toHaveBeenCalledWith('10.50');
      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('10.50'), 'USD');
      expect(result).toBe('$10.50');
    });

    it('formats fee with EUR currency', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.02' || value === '25.00',
      );
      mockFormatFiat.mockReturnValue('€25.00');

      const quote = {
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '25.00',
        },
      };

      const result = formatNetworkFee('EUR', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('25.00'), 'EUR');
      expect(result).toBe('€25.00');
    });

    it('handles small network fees', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.000001' || value === '0.005',
      );
      mockFormatFiat.mockReturnValue('<$0.01');

      const quote = {
        totalNetworkFee: {
          amount: '0.000001',
          valueInCurrency: '0.005',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('0.005'), 'USD');
      expect(result).toBe('<$0.01');
    });

    it('handles zero network fee', () => {
      mockIsNumberValue.mockImplementation((value) => value === '0');
      mockFormatFiat.mockReturnValue('$0');

      const quote = {
        totalNetworkFee: {
          amount: '0',
          valueInCurrency: '0',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('0'), 'USD');
      expect(result).toBe('$0');
    });
  });

  describe('non-gasless quotes — gasFee.total fallback path', () => {
    it('returns formatted fiat from gasFee.total when totalNetworkFee is missing', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.005' || value === '8.00',
      );
      mockFormatFiat.mockReturnValue('$8.00');

      const quote = {
        gasFee: {
          total: {
            amount: '0.005',
            valueInCurrency: '8.00',
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('8.00'), 'USD');
      expect(result).toBe('$8.00');
    });

    it('returns formatted fiat from gasFee.total when totalNetworkFee values are invalid', () => {
      mockIsNumberValue
        .mockReturnValueOnce(false) // totalNetworkFee.amount invalid
        .mockReturnValueOnce(true) // gasFee.total.amount
        .mockReturnValueOnce(true); // gasFee.total.valueInCurrency
      mockFormatFiat.mockReturnValue('$3.50');

      const quote = {
        totalNetworkFee: {
          amount: 'invalid',
          valueInCurrency: '10.00',
        },
        gasFee: {
          total: {
            amount: '0.002',
            valueInCurrency: '3.50',
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('3.50'), 'USD');
      expect(result).toBe('$3.50');
    });

    it('returns "-" when gasFee.total.valueInCurrency is null', () => {
      const quote = {
        gasFee: {
          total: {
            amount: '0.002',
            valueInCurrency: undefined,
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when gasFee.total.amount is null', () => {
      const quote = {
        gasFee: {
          total: {
            amount: undefined,
            valueInCurrency: '8.00',
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when gasFee.total has invalid number values', () => {
      mockIsNumberValue.mockReturnValue(false);

      const quote = {
        gasFee: {
          total: {
            amount: 'bad',
            valueInCurrency: 'bad',
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when neither totalNetworkFee nor gasFee.total is available', () => {
      const quote = {} as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });
  });
});
