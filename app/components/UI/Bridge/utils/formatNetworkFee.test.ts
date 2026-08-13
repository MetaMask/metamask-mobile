import {
  QuoteMetadata,
  QuoteResponse,
  toQuoteMetadataV2,
} from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import formatFiat from '../../../../util/formatFiat';
import { formatNetworkFee } from './formatNetworkFee';
import { isGaslessQuote } from './isGaslessQuote';
import { merge } from 'lodash';

jest.mock('../../../../util/formatFiat');
jest.mock('../../../../util/number');
jest.mock('./isGaslessQuote');

const mockFormatFiat = formatFiat as jest.MockedFunction<typeof formatFiat>;
const mockIsGaslessQuote = isGaslessQuote as jest.MockedFunction<
  typeof isGaslessQuote
>;

describe('formatNetworkFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      mockFormatFiat.mockReturnValue('$5.00');

      const quote = merge(
        {},
        { quote: { gasIncluded: true } },
        toQuoteMetadataV2({
          includedTxFees: {
            amount: '0.002',
            valueInCurrency: '5.00',
          },
        }),
      );

      const result = formatNetworkFee('USD', quote);

      expect(mockIsGaslessQuote).toHaveBeenCalledWith(quote.quote);
      expect(mockFormatFiat).toHaveBeenCalledWith(new BigNumber('5.00'), 'USD');
      expect(result).toBe('$5.00');
    });

    it('returns "-" when includedTxFees.valueInCurrency is null', () => {
      const quote = merge(
        {},
        { quote: { gasIncluded: true } },
        {
          quote: { gasIncluded: true },
          includedTxFees: {
            amount: '0.002',
            valueInCurrency: undefined,
          },
        },
      );

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
      const quote = {
        totalNetworkFee: {
          amount: 'invalid',
          valueInCurrency: '100',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
    });

    it('returns "-" when totalNetworkFee.valueInCurrency is not a valid number', () => {
      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: 'invalid',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));
      expect(result).toBe('-');
    });

    it('formats fee with USD currency', () => {
      mockFormatFiat.mockReturnValue('$10.50');

      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.50',
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('10.50'), 'USD');
      expect(result).toBe('$10.50');
    });

    it('formats fee with EUR currency', () => {
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
      mockFormatFiat.mockReturnValue('<$0.01');

      const quote = {
        gasFee: {
          total: {
            amount: '0.000001',
            valueInCurrency: '0.005',
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('0.005'), 'USD');
      expect(result).toBe('<$0.01');
    });

    it('handles zero network fee', () => {
      mockFormatFiat.mockReturnValue('$0');

      const quote = {
        gasFee: {
          total: {
            amount: '0',
            valueInCurrency: '0',
          },
        },
      };

      const result = formatNetworkFee('USD', toQuoteMetadataV2(quote));

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('0'), 'USD');
      expect(result).toBe('$0');
    });
  });
});
