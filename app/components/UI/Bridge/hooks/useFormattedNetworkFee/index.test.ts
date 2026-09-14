import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useFormattedNetworkFee } from './index';
import { formatNetworkFee } from '../../utils/formatNetworkFee';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  toQuoteMetadataV2,
  type QuoteResponse,
} from '@metamask/bridge-controller';

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
    mockSelectCurrentCurrency.mockReturnValue('usd');
    mockFormatNetworkFee.mockReturnValue('-');
  });

  describe('when quote is undefined', () => {
    it('returns formatted network fee with undefined quote', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(undefined),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', undefined);
    });
  });

  describe('when quote is null', () => {
    it('returns formatted network fee with null quote', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('eur');
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(null),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('eur', null);
    });
  });

  describe('when quote has valid totalNetworkFee', () => {
    it('returns formatted network fee with USD currency', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.50',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('$10.50');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$10.50');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', quote);
    });

    it('returns formatted network fee with EUR currency', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '25.00',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('eur');
      mockFormatNetworkFee.mockReturnValue('€25.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('€25.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('eur', quote);
    });

    it('returns formatted network fee with GBP currency', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.005',
          valueInCurrency: '5.25',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('gbp');
      mockFormatNetworkFee.mockReturnValue('£5.25');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('£5.25');
      expect(formatNetworkFee).toHaveBeenCalledWith('gbp', quote);
    });

    it('returns formatted network fee with JPY currency', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.1',
          valueInCurrency: '1500',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('jpy');
      mockFormatNetworkFee.mockReturnValue('¥1,500');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('¥1,500');
      expect(formatNetworkFee).toHaveBeenCalledWith('jpy', quote);
    });
  });

  describe('when network fee is small', () => {
    it('returns formatted small network fee', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.000001',
          valueInCurrency: '0.005',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('<$0.01');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('<$0.01');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', quote);
    });
  });

  describe('when network fee is large', () => {
    it('returns formatted large network fee', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '1.5',
          valueInCurrency: '1234.56',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('$1,234.56');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$1,234.56');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', quote);
    });
  });

  describe('when network fee is zero', () => {
    it('returns formatted zero network fee', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0',
          valueInCurrency: '0',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('$0');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$0');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', quote);
    });
  });

  describe('when quote changes', () => {
    it('recalculates formatted network fee when quote changes', () => {
      // Arrange
      const initialQuote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('$10.00');

      // Act - initial render
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(initialQuote),
        { state: {} },
      );

      // Assert initial
      expect(result.current).toBe('$10.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', initialQuote);

      // Arrange - update mock for different quote
      const updatedQuote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '20.00',
        },
      }) as unknown as QuoteResponse;

      mockFormatNetworkFee.mockReturnValue('$20.00');

      // Act - new render with updated quote
      const { result: updatedResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(updatedQuote),
        { state: {} },
      );

      // Assert after update
      expect(updatedResult.current).toBe('$20.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', updatedQuote);
    });
  });

  describe('when currency changes', () => {
    it('recalculates formatted network fee when currency changes', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      }) as unknown as QuoteResponse;

      // Act - initial render with USD
      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockReturnValue('$10.00');

      const { result: usdResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert initial
      expect(usdResult.current).toBe('$10.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', quote);

      // Arrange - change currency
      mockSelectCurrentCurrency.mockReturnValue('eur');
      mockFormatNetworkFee.mockReturnValue('€10.00');

      // Act - new render with EUR
      const { result: eurResult } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert after currency change
      expect(eurResult.current).toBe('€10.00');
      expect(formatNetworkFee).toHaveBeenCalledWith('eur', quote);
    });
  });

  describe('memoization', () => {
    it('memoizes result when quote and currency remain unchanged', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');
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
      const initialQuote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      }) as unknown as QuoteResponse;

      const updatedQuote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.02',
          valueInCurrency: '20.00',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockReturnValue('usd');

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
      const quote = {} as never;

      mockSelectCurrentCurrency.mockReturnValue('usd');
      mockFormatNetworkFee.mockClear();
      mockFormatNetworkFee.mockReturnValue('-');

      // Act
      const { result } = renderHookWithProvider(
        () => useFormattedNetworkFee(quote),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('-');
      expect(formatNetworkFee).toHaveBeenCalledWith('usd', quote);
    });

    it('handles unknown currency code', () => {
      // Arrange
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockClear();
      // Deliberately bypass selector contract to test formatter behavior.
      mockSelectCurrentCurrency.mockReturnValue('XYZ' as never);
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
      const quote = toQuoteMetadataV2({
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10.00',
        },
      }) as unknown as QuoteResponse;

      mockSelectCurrentCurrency.mockClear();
      // Deliberately bypass selector contract to test formatter behavior.
      mockSelectCurrentCurrency.mockReturnValue('' as never);
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
