import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(mockIsGaslessQuote).toHaveBeenCalledWith(quote.quote);
      expect(mockFormatFiat).toHaveBeenCalledWith(new BigNumber('5.00'), 'USD');
      expect(result).toBe('$5.00');
    });

    it('returns "-" when includedTxFees.valueInCurrency is null', () => {
      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: '0.002',
          valueInCurrency: null,
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when includedTxFees.amount is null', () => {
      const quote = {
        quote: { gasIncluded: true },
        includedTxFees: {
          amount: null,
          valueInCurrency: '5.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when includedTxFees is not set', () => {
      const quote = {
        quote: { gasIncluded: true },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });
  });

  describe('non-gasless quotes — totalNetworkFee path', () => {
    it('returns "-" when totalNetworkFee is undefined', () => {
      const quote = {} as QuoteResponse & QuoteMetadata;
      const result = formatNetworkFee('USD', quote);
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee is null', () => {
      const quote = {
        totalNetworkFee: null,
      } as unknown as QuoteResponse & QuoteMetadata;
      const result = formatNetworkFee('USD', quote);
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.amount is null', () => {
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: null,
          valueInCurrency: '100',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.valueInCurrency is null', () => {
      mockIsNumberValue.mockReturnValueOnce(true);
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: null,
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.amount is not a valid number', () => {
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: 'invalid',
          valueInCurrency: '100',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);
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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);
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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('EUR', quote);

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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

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
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('0'), 'USD');
      expect(result).toBe('$0');
    });
  });

  describe('non-gasless quotes — gasFee.effective fallback path', () => {
    it('returns formatted fiat from gasFee.effective when totalNetworkFee is missing', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.005' || value === '8.00',
      );
      mockFormatFiat.mockReturnValue('$8.00');

      const quote = {
        gasFee: {
          effective: {
            amount: '0.005',
            valueInCurrency: '8.00',
          },
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('8.00'), 'USD');
      expect(result).toBe('$8.00');
    });

    it('returns formatted fiat from gasFee.effective when totalNetworkFee values are invalid', () => {
      mockIsNumberValue
        .mockReturnValueOnce(false) // totalNetworkFee.amount invalid
        .mockReturnValueOnce(true) // gasFee.effective.amount
        .mockReturnValueOnce(true); // gasFee.effective.valueInCurrency
      mockFormatFiat.mockReturnValue('$3.50');

      const quote = {
        totalNetworkFee: {
          amount: 'invalid',
          valueInCurrency: '10.00',
        },
        gasFee: {
          effective: {
            amount: '0.002',
            valueInCurrency: '3.50',
          },
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('3.50'), 'USD');
      expect(result).toBe('$3.50');
    });

    it('returns "-" when gasFee.effective.valueInCurrency is null', () => {
      const quote = {
        gasFee: {
          effective: {
            amount: '0.002',
            valueInCurrency: null,
          },
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when gasFee.effective.amount is null', () => {
      const quote = {
        gasFee: {
          effective: {
            amount: null,
            valueInCurrency: '8.00',
          },
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when gasFee.effective has invalid number values', () => {
      mockIsNumberValue.mockReturnValue(false);

      const quote = {
        gasFee: {
          effective: {
            amount: 'bad',
            valueInCurrency: 'bad',
          },
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('returns "-" when neither totalNetworkFee nor gasFee.effective is available', () => {
      const quote = {} as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(result).toBe('-');
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });
  });
});
