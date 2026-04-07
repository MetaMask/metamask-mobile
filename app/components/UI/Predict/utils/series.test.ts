import {
  parseRecurrenceToSeconds,
  SERIES_PAST_WINDOW_MS,
  SERIES_FUTURE_WINDOW_MS,
  SERIES_MAX_EVENTS,
} from './series';

describe('series utilities', () => {
  describe('parseRecurrenceToSeconds', () => {
    it.each([
      ['5m', 300],
      ['15m', 900],
      ['30m', 1800],
      ['1h', 3600],
      ['hourly', 3600],
      ['daily', 86400],
      ['weekly', 604800],
      ['', 0],
      ['unknown', 0],
    ])('converts %s to %d seconds', (input, expected) => {
      // Arrange
      const recurrence = input;

      // Act
      const result = parseRecurrenceToSeconds(recurrence);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('exported constants', () => {
    it('exports SERIES_PAST_WINDOW_MS with correct value', () => {
      // Arrange
      const expectedValue = 108000000; // 30 * 60 * 60 * 1000

      // Act & Assert
      expect(SERIES_PAST_WINDOW_MS).toBe(expectedValue);
    });

    it('exports SERIES_FUTURE_WINDOW_MS with correct value', () => {
      // Arrange
      const expectedValue = 86400000; // 24 * 60 * 60 * 1000

      // Act & Assert
      expect(SERIES_FUTURE_WINDOW_MS).toBe(expectedValue);
    });

    it('exports SERIES_MAX_EVENTS with correct value', () => {
      // Arrange
      const expectedValue = 50;

      // Act & Assert
      expect(SERIES_MAX_EVENTS).toBe(expectedValue);
    });
  });
});
