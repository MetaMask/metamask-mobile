import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useFormattedNetworkFee } from './index';
import { formatNetworkFee } from '../../utils/formatNetworkFee';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';

jest.mock('../../utils/formatNetworkFee');
jest.mock('../../../../../selectors/currencyRateController');

const mockFormatNetworkFee = formatNetworkFee as jest.MockedFunction<
  typeof formatNetworkFee
>;
const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;

describe('useFormattedNetworkFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockFormatNetworkFee.mockReturnValue('-');
  });

  describe('when quote is undefined', () => {
    it('returns formatted network fee with undefined quote', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(undefined),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', undefined);
    });
  });

  describe('when quote is null', () => {
    it('returns formatted network fee with null quote', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('EUR');
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(null),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('EUR', null);
    });
  });

  describe('when quote has valid totalNetworkFee', () => {
    it('returns formatted network fee with USD currency', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.50',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('$10.50');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$10.50');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', quote);
    });

    it('returns formatted network fee with EUR currency', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '25.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('EUR');
      mockFormatNetworkFee.mockReturnValue('€25.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('€25.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('EUR', quote);
    });

    it('returns formatted network fee with GBP currency', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.005',
          valueInCurrency: '5.25',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('GBP');
      mockFormatNetworkFee.mockReturnValue('£5.25');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('£5.25');
      expect(formatNetworkFee).toHaveBeenCalledWith('GBP', quote);
    });

    it('returns formatted network fee with JPY currency', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.1',
          valueInCurrency: '1500',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('JPY');
      mockFormatNetworkFee.mockReturnValue('¥1,500');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('¥1,500');
      expect(formatNetworkFee).toHaveBeenCalledWith('JPY', quote);
    });
  });

  describe('when network fee is small', () => {
    it('returns formatted small network fee', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.000001',
          valueInCurrency: '0.005',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('<$0.01');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('<$0.01');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', quote);
    });
  });

  describe('when network fee is large', () => {
    it('returns formatted large network fee', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '1.5',
          valueInCurrency: '1234.56',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('$1,234.56');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$1,234.56');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', quote);
    });
  });

  describe('when network fee is zero', () => {
    it('returns formatted zero network fee', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0',
          valueInCurrency: '0',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('$0');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$0');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', quote);
    });
  });

  describe('when quote changes', () => {
    it('recalculates formatted network fee when quote changes', () => {
      // Arrange
      const initialQuote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('$10.00');

      // Act - initial render
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(initialQuote),
        { state: {} },
      );

      // Assert initial
      expect(result.current).toBe('$10.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', initialQuote);

      // Arrange - update mock for different quote
      const updatedQuote = {
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '20.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockFormatNetworkFee.mockReturnValue('$20.00');

      // Act - new render with updated quote
      const { result: updatedResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(updatedQuote),
        { state: {} },
      );

      // Assert after update
      expect(updatedResult.current).toBe('$20.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', updatedQuote);
    });
  });

  describe('when currency changes', () => {
    it('recalculates formatted network fee when currency changes', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      // Act - initial render with USD
      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('$10.00');

      const { result: usdResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert initial
      expect(usdResult.current).toBe('$10.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', quote);

      // Arrange - change currency
      mockSelectCurrentCurrency.mockReturnValue('EUR');
      mockFormatNetworkFee.mockReturnValue('€10.00');

      // Act - new render with EUR
      const { result: eurResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert after currency change
      expect(eurResult.current).toBe('€10.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('EUR', quote);
    });
  });

  describe('memoization', () => {
    it('memoizes result when quote and currency remain unchanged', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockReturnValue('$10.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$10.00');
      expect(formatNetworkFee).toHaveBeenCalledTimes(1);
    });

    it('does not memoize result when quote changes', () => {
      // Arrange
      const initialQuote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      const updatedQuote = {
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '20.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');

      // Act - first render
      mockFormatNetworkFee.mockReturnValue('$10.00');
      const { result: firstResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(initialQuote),
        { state: {} },
      );

      // Act - second render with different quote
      mockFormatNetworkFee.mockReturnValue('$20.00');
      const { result: secondResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(updatedQuote),
        { state: {} },
      );

      // Assert
      expect(firstResult.current).toBe('$10.00');
      expect(secondResult.current).toBe('$20.00');
      expect(firstResult.current).not.toBe(secondResult.current);
    });
  });

  describe('edge cases', () => {
    it('handles missing totalNetworkFee in quote', () => {
      // Arrange
      const quote = {} as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockReturnValue('USD');
      mockFormatNetworkFee.mockClear();
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('USD', quote);
    });

    it('handles unknown currency code', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockClear();
      mockSelectCurrentCurrency.mockReturnValue('XYZ');
      mockFormatNetworkFee.mockClear();
      mockFormatNetworkFee.mockReturnValue('10.00 XYZ');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('10.00 XYZ');
      expect(formatNetworkFee).toHaveBeenCalledWith('XYZ', quote);
    });

    it('handles empty string currency', () => {
      // Arrange
      const quote = {
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      } as unknown as QuoteResponse & QuoteMetadata;

      mockSelectCurrentCurrency.mockClear();
      mockSelectCurrentCurrency.mockReturnValue('');
      mockFormatNetworkFee.mockClear();
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('', quote);
    });
  });
});
