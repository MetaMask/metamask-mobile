import { validateDateOfBirth, formatDateOfBirth } from './validateDateOfBirth';

describe('validateDateOfBirth', () => {
  // Mock Date.now() to ensure consistent test results (local timezone)
  const mockCurrentDate = new Date(2024, 0, 15);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockCurrentDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when validating age requirements', () => {
    it('returns true for person who is exactly 18 years old', () => {
      // Given: date of birth exactly 18 years ago (local timezone)
      const eighteenYearsAgo = new Date(2006, 0, 15);
      const timestamp = eighteenYearsAgo.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid
      expect(result).toBe(true);
    });

    it('returns true for person who is older than 18', () => {
      // Given: date of birth 25 years ago (local timezone)
      const twentyFiveYearsAgo = new Date(1999, 0, 15);
      const timestamp = twentyFiveYearsAgo.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid
      expect(result).toBe(true);
    });

    it('returns false for person who is younger than 18', () => {
      // Given: date of birth 17 years ago (local timezone)
      const seventeenYearsAgo = new Date(2007, 0, 15);
      const timestamp = seventeenYearsAgo.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be invalid
      expect(result).toBe(false);
    });

    it('returns false for person who turns 18 tomorrow', () => {
      // Given: date of birth that makes person turn 18 tomorrow (local timezone)
      const almostEighteen = new Date(2006, 0, 16);
      const timestamp = almostEighteen.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be invalid
      expect(result).toBe(false);
    });

    it('returns true for person who turned 18 yesterday', () => {
      // Given: date of birth that made person turn 18 yesterday (local timezone)
      const justTurnedEighteen = new Date(2006, 0, 14);
      const timestamp = justTurnedEighteen.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid
      expect(result).toBe(true);
    });
  });

  describe('when handling birthday edge cases', () => {
    it('correctly handles leap year birthdays', () => {
      // Given: current date is March 1, 2024 (leap year, local timezone)
      const leapYearDate = new Date(2024, 2, 1);
      jest.setSystemTime(leapYearDate);

      // And: person born on Feb 29, 2006 (18 years ago, leap year, local timezone)
      const leapYearBirthday = new Date(2006, 1, 29);
      const timestamp = leapYearBirthday.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid (person is 18)
      expect(result).toBe(true);
    });

    it('handles month boundary correctly when birthday has not occurred', () => {
      // Given: current date is January 10, 2024 (local timezone)
      const currentDate = new Date(2024, 0, 10);
      jest.setSystemTime(currentDate);

      // And: person born on January 15, 2006 (birthday later this month, local timezone)
      const birthdayLaterThisMonth = new Date(2006, 0, 15);
      const timestamp = birthdayLaterThisMonth.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be invalid (still 17)
      expect(result).toBe(false);
    });

    it('handles year boundary correctly', () => {
      // Given: current date is January 1, 2024 (local timezone)
      const newYearDate = new Date(2024, 0, 1);
      jest.setSystemTime(newYearDate);

      // And: person born on December 31, 2005 (18 years and 1 day old, local timezone)
      const lastYearBirthday = new Date(2005, 11, 31);
      const timestamp = lastYearBirthday.getTime();

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid
      expect(result).toBe(true);
    });
  });

  describe('when handling dates before 1970 (negative timestamps)', () => {
    it('returns true for person born in 1959 (negative timestamp)', () => {
      // Given: date of birth on September 16, 1959 (local timezone)
      const dateIn1959 = new Date(1959, 8, 16);
      const timestamp = dateIn1959.getTime(); // This will be negative in some timezones

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid (person is 65 years old in 2024)
      expect(result).toBe(true);
    });

    it('returns true for person born in 1950', () => {
      // Given: date of birth in 1950 (local timezone)
      const dateIn1950 = new Date(1950, 5, 15);
      const timestamp = dateIn1950.getTime(); // This will be negative in some timezones

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid (person is 73 years old in 2024)
      expect(result).toBe(true);
    });

    it('returns true for person born on January 1, 1900', () => {
      // Given: very old date of birth (local timezone)
      const veryOldDate = new Date(1900, 0, 1);
      const timestamp = veryOldDate.getTime(); // This will be very negative in some timezones

      // When: validating date of birth
      const result = validateDateOfBirth(timestamp);

      // Then: should be valid (person is 124 years old in 2024)
      expect(result).toBe(true);
    });
  });

  describe('when handling invalid inputs', () => {
    it('returns false for null timestamp', () => {
      // When: validating null timestamp
      const result = validateDateOfBirth(null as unknown as number);

      // Then: should be invalid
      expect(result).toBe(false);
    });

    it('returns false for undefined timestamp', () => {
      // When: validating undefined timestamp
      const result = validateDateOfBirth(undefined as unknown as number);

      // Then: should be invalid
      expect(result).toBe(false);
    });

    it('returns false for invalid date timestamp', () => {
      // When: validating invalid date timestamp
      const result = validateDateOfBirth(NaN);

      // Then: should be invalid
      expect(result).toBe(false);
    });

    it('returns false for future date', () => {
      // Given: date in the future (local timezone)
      const futureDate = new Date(2025, 0, 15);
      const timestamp = futureDate.getTime();

      // When: validating future date
      const result = validateDateOfBirth(timestamp);

      // Then: should be invalid
      expect(result).toBe(false);
    });
  });
});

describe('formatDateOfBirth', () => {
  describe('when formatting valid timestamps', () => {
    it('formats valid timestamp string to YYYY-MM-DD', () => {
      // Given: date created in local timezone (Jan 15, 2006)
      const date = new Date(2006, 0, 15);
      const timestampString = date.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return formatted date
      expect(result).toBe('2006-01-15');
    });

    it('handles leap year dates correctly', () => {
      // Given: leap year date created in local timezone (Feb 29, 2004)
      const leapYearDate = new Date(2004, 1, 29);
      const timestampString = leapYearDate.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return correct leap year date
      expect(result).toBe('2004-02-29');
    });
  });

  describe('when handling invalid inputs', () => {
    it('returns empty string for empty string input', () => {
      // When: formatting empty string
      const result = formatDateOfBirth('');

      // Then: should return empty string
      expect(result).toBe('');
    });

    it('returns empty string for whitespace-only string', () => {
      // When: formatting whitespace string
      const result = formatDateOfBirth('   ');

      // Then: should return empty string
      expect(result).toBe('');
    });

    it('returns empty string for null input', () => {
      // When: formatting null input
      const result = formatDateOfBirth(null as unknown as string);

      // Then: should return empty string
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      // When: formatting undefined input
      const result = formatDateOfBirth(undefined as unknown as string);

      // Then: should return empty string
      expect(result).toBe('');
    });

    it('returns empty string for invalid timestamp string', () => {
      // When: formatting invalid timestamp
      const result = formatDateOfBirth('invalid-timestamp');

      // Then: should return empty string
      expect(result).toBe('');
    });

    it('returns empty string for NaN timestamp', () => {
      // When: formatting NaN timestamp
      const result = formatDateOfBirth('NaN');

      // Then: should return empty string
      expect(result).toBe('');
    });

    it('returns empty string for non-numeric string', () => {
      // When: formatting non-numeric string
      const result = formatDateOfBirth('not-a-number');

      // Then: should return empty string
      expect(result).toBe('');
    });
  });

  describe('when handling edge cases', () => {
    it('formats very old dates correctly', () => {
      // Given: very old date (year 1900) created in local timezone
      const oldDate = new Date(1900, 0, 1);
      const timestampString = oldDate.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return correct old date
      expect(result).toBe('1900-01-01');
    });

    it('formats dates before 1970 with negative timestamps correctly', () => {
      // Given: date before Unix epoch (September 16, 1959)
      const dateIn1959 = new Date(1959, 8, 16); // Month is 0-indexed, so 8 = September
      const timestampString = dateIn1959.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return correct date
      expect(result).toBe('1959-09-16');
    });

    it('formats dates from 1950 with negative timestamps correctly', () => {
      // Given: date from 1950
      const dateIn1950 = new Date(1950, 5, 15); // Month is 0-indexed, so 5 = June
      const timestampString = dateIn1950.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return correct date
      expect(result).toBe('1950-06-15');
    });

    it('formats recent dates correctly', () => {
      // Given: date created in local timezone (matching PersonalDetails.tsx parsing)
      const recentDate = new Date(2023, 11, 31);
      const timestampString = recentDate.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return correct recent date
      expect(result).toBe('2023-12-31');
    });

    it('handles zero timestamp correctly', () => {
      // Given: epoch date created in local timezone
      const epochLocal = new Date(1970, 0, 1);
      const timestampString = epochLocal.getTime().toString();

      // When: formatting timestamp
      const result = formatDateOfBirth(timestampString);

      // Then: should return epoch date
      expect(result).toBe('1970-01-01');
    });
  });
});
