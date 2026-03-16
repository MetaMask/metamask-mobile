import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import formatFiat from '../../../../util/formatFiat';
import { isNumberValue } from '../../../../util/number';
import { formatNetworkFee } from './formatNetworkFee';

jest.mock('../../../../util/formatFiat');
jest.mock('../../../../util/number');

const mockFormatFiat = formatFiat as jest.MockedFunction<typeof formatFiat>;
const mockIsNumberValue = isNumberValue as jest.MockedFunction<
  typeof isNumberValue
>;

describe('formatNetworkFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNumberValue.mockReset();
    mockFormatFiat.mockReset();
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

  describe('when totalNetworkFee is missing', () => {
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
  });

  describe('when totalNetworkFee properties are invalid', () => {
    it('returns "-" when amount is null', () => {
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

    it('returns "-" when valueInCurrency is null', () => {
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

    it('returns "-" when amount is undefined', () => {
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: undefined,
          valueInCurrency: '100',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);
      expect(result).toBe('-');
    });

    it('returns "-" when valueInCurrency is undefined', () => {
      mockIsNumberValue.mockReturnValueOnce(true);
      mockIsNumberValue.mockReturnValueOnce(false);

      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: undefined,
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);
      expect(result).toBe('-');
    });

    it('returns "-" when amount is not a valid number value', () => {
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

    it('returns "-" when valueInCurrency is not a valid number value', () => {
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
  });

  describe('when totalNetworkFee is valid', () => {
    it('formats the network fee correctly with USD', () => {
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

    it('formats the network fee correctly with EUR', () => {
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

    it('formats the network fee correctly with GBP', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.005' || value === '5.25',
      );
      mockFormatFiat.mockReturnValue('£5.25');

      const quote = {
        totalNetworkFee: {
          amount: '0.005',
          valueInCurrency: '5.25',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('GBP', quote);

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('5.25'), 'GBP');
      expect(result).toBe('£5.25');
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

    it('handles large network fees', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '1.5' || value === '1234.56',
      );
      mockFormatFiat.mockReturnValue('$1,234.56');

      const quote = {
        totalNetworkFee: {
          amount: '1.5',
          valueInCurrency: '1234.56',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const result = formatNetworkFee('USD', quote);

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('1234.56'), 'USD');
      expect(result).toBe('$1,234.56');
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

  describe('edge cases', () => {
    it('passes the currency parameter correctly to formatFiat', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '1' || value === '100',
      );
      mockFormatFiat.mockReturnValue('100 XYZ');

      const quote = {
        totalNetworkFee: {
          amount: '1',
          valueInCurrency: '100',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      formatNetworkFee('XYZ', quote);

      expect(formatFiat).toHaveBeenCalledWith(new BigNumber('100'), 'XYZ');
    });

    it('creates a new BigNumber instance with the valueInCurrency', () => {
      mockIsNumberValue.mockImplementation(
        (value) => value === '0.05' || value === '42.99',
      );
      mockFormatFiat.mockImplementation((value) => {
        expect(value).toBeInstanceOf(BigNumber);
        expect(value.toString()).toBe('42.99');
        return '$42.99';
      });

      const quote = {
        totalNetworkFee: {
          amount: '0.05',
          valueInCurrency: '42.99',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      formatNetworkFee('USD', quote);

      expect(formatFiat).toHaveBeenCalled();
    });
  });
});
