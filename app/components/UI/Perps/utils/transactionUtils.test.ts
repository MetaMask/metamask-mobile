import { getUserFundingsListTimePeriod } from './transactionUtils';

describe('getUserFundingsListTimePeriod', () => {
  beforeEach(() => {
    // Mock Date.now to ensure consistent test results
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return timestamp for 7 days ago from current time', () => {
    // Arrange
    const mockCurrentTime = 1700000000000; // Fixed timestamp for testing
    jest.setSystemTime(mockCurrentTime);
    const expectedSevenDaysAgo = mockCurrentTime - 7 * 24 * 60 * 60 * 1000;

    // Act
    const result = getUserFundingsListTimePeriod();

    // Assert
    expect(result).toBe(expectedSevenDaysAgo);
  });

  it('should return different values when called at different times', () => {
    // Arrange
    const firstTime = 1700000000000;
    const secondTime = 1700000000000 + 1000; // 1 second later

    // Act
    jest.setSystemTime(firstTime);
    const firstResult = getUserFundingsListTimePeriod();

    jest.setSystemTime(secondTime);
    const secondResult = getUserFundingsListTimePeriod();

    // Assert
    expect(secondResult).toBe(firstResult + 1000);
  });

  it('should return a valid timestamp format', () => {
    // Arrange
    const mockCurrentTime = 1700000000000;
    jest.setSystemTime(mockCurrentTime);

    // Act
    const result = getUserFundingsListTimePeriod();

    // Assert
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
    expect(Number.isInteger(result)).toBe(true);
  });
});
