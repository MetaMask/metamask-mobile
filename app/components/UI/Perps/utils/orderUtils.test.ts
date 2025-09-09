import { getOrderDirection } from './orderUtils';
import { strings } from '../../../../../locales/i18n';

// Mock the i18n module
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

describe('getOrderDirection', () => {
  const mockStrings = strings as jest.MockedFunction<typeof strings>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock return values
    mockStrings.mockImplementation((key: string) => {
      if (key === 'perps.market.long') return 'Long';
      if (key === 'perps.market.short') return 'Short';
      return key;
    });
  });

  describe('when no position exists', () => {
    it('returns "Long" for buy side', () => {
      const result = getOrderDirection('buy', undefined);
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });

    it('returns "Short" for sell side', () => {
      const result = getOrderDirection('sell', undefined);
      expect(result).toBe('Short');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.short');
    });

    it('treats null position size as no position', () => {
      const result = getOrderDirection('buy', null as unknown as string);
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });
  });

  describe('when position exists', () => {
    it('returns "Long" for positive position size', () => {
      const result = getOrderDirection('sell', '100');
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });

    it('returns "Short" for negative position size', () => {
      const result = getOrderDirection('buy', '-100');
      expect(result).toBe('Short');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.short');
    });

    it('handles decimal position sizes', () => {
      const result = getOrderDirection('sell', '0.5');
      expect(result).toBe('Long');
      expect(mockStrings).toHaveBeenCalledWith('perps.market.long');
    });
  });
});
