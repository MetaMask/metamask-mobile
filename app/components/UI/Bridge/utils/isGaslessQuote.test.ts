import { Quote } from '@metamask/bridge-controller';
import { isGaslessQuote } from './isGaslessQuote';

describe('isGaslessQuote', () => {
  describe('returns false', () => {
    it('returns false when quote is undefined', () => {
      // Arrange
      const quote = undefined;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when quote has neither gasIncluded nor gasIncluded7702', () => {
      // Arrange
      const quote = {
        gasIncluded: false,
        gasIncluded7702: false,
      } as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when quote object is empty', () => {
      // Arrange
      const quote = {} as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('returns true for gasIncluded', () => {
    it('returns true when gasIncluded is true', () => {
      // Arrange
      const quote = {
        gasIncluded: true,
        gasIncluded7702: false,
      } as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(true);
    });

    it('returns true when only gasIncluded is present and true', () => {
      // Arrange
      const quote = {
        gasIncluded: true,
      } as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('returns true for gasIncluded7702', () => {
    it('returns true when gasIncluded7702 is true', () => {
      // Arrange
      const quote = {
        gasIncluded: false,
        gasIncluded7702: true,
      } as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(true);
    });

    it('returns true when only gasIncluded7702 is present and true', () => {
      // Arrange
      const quote = {
        gasIncluded7702: true,
      } as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('returns true when both properties are true', () => {
    it('returns true when both gasIncluded and gasIncluded7702 are true', () => {
      // Arrange
      const quote = {
        gasIncluded: true,
        gasIncluded7702: true,
      } as Quote;

      // Act
      const result = isGaslessQuote(quote);

      // Assert
      expect(result).toBe(true);
    });
  });
});
