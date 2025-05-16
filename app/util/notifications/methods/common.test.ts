import {
  formatMenuItemDate,
  shortenString,
  getLeadingZeroCount,
  formatAmount,
  getUsdAmount,
} from './common';
import { strings } from '../../../../locales/i18n';

describe('formatMenuItemDate', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2024, 5, 7, 9, 40, 0))); // 2024-06-07T09:40:00Z
  });

  afterAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('returns "No date" if date is not provided', () => {
    expect(formatMenuItemDate()).toBe(strings('notifications.no_date'));
  });

  it('formats date as time if the date is today', () => {
    const assertToday = (modifyDate?: (d: Date) => void) => {
      const testDate = new Date();
      modifyDate?.(testDate);
      expect(formatMenuItemDate(testDate)).toMatch(/^\d{2}:\d{2}$/u); // HH:mm
    };

    // assert current date
    assertToday();

    // assert 1 hour ago
    assertToday((testDate) => {
      testDate.setUTCHours(testDate.getUTCHours() - 1);
      return testDate;
    });
  });

  it('formats date as "yesterday" if the date was yesterday', () => {
    const assertYesterday = (modifyDate: (d: Date) => void) => {
      const testDate = new Date();
      modifyDate(testDate);
      expect(formatMenuItemDate(testDate)).toBe(
        strings('notifications.yesterday'),
      );
    };

    // assert exactly 1 day ago
    assertYesterday((testDate) => {
      testDate.setUTCDate(testDate.getUTCDate() - 1);
    });

    // assert almost a day ago, but was still yesterday
    // E.g. if Today way 09:40AM, but date to test was 23 hours ago (yesterday at 10:40AM), we still want to to show yesterday
    assertYesterday((testDate) => {
      testDate.setUTCDate(testDate.getUTCDate() - 1);
      testDate.setUTCHours(testDate.getUTCHours() + 1);
    });
  });

  it('should format date as "Month DD" if the date is this year but not today or yesterday', () => {
    const assertMonthsAgo = (modifyDate: (d: Date) => Date | void) => {
      let testDate = new Date();
      testDate = modifyDate(testDate) ?? testDate;
      expect(formatMenuItemDate(testDate)).toMatch(/^\w{3} \d{1,2}$/u); // E.g. Apr 7
    };

    // assert exactly 1 month ago
    assertMonthsAgo((testDate) => {
      testDate.setUTCMonth(testDate.getUTCMonth() - 1);
    });

    // assert 2 months ago
    assertMonthsAgo((testDate) => {
      testDate.setUTCMonth(testDate.getUTCMonth() - 2);
    });

    // assert almost a month ago (where it is a new month, but not 30 days)
    assertMonthsAgo(
      () =>
        // jest mock date is set in july, so we will test with month may
        new Date(Date.UTC(2024, 4, 20, 9, 40, 0)), // 2024-05-20T09:40:00Z
    );
  });

  it('should format date as "Mon DD, YYYY" if the date is not this year', () => {
    const assertYearsAgo = (modifyDate: (d: Date) => Date | void) => {
      let testDate = new Date();
      testDate = modifyDate(testDate) ?? testDate;
      expect(formatMenuItemDate(testDate)).toMatch(/^\w{3} \d{1,2}, \d{4}$/u);
    };

    // assert exactly 1 year ago
    assertYearsAgo((testDate) => {
      testDate.setUTCFullYear(testDate.getUTCFullYear() - 1);
    });

    // assert 2 years ago
    assertYearsAgo((testDate) => {
      testDate.setUTCFullYear(testDate.getUTCFullYear() - 2);
    });

    // assert almost a year ago (where it is a new year, but not 365 days ago)
    assertYearsAgo(
      () =>
        // jest mock date is set in 2024, so we will test with year 2023
        new Date(Date.UTC(2023, 10, 20, 9, 40, 0)), // 2023-11-20T09:40:00Z
    );
  });
});

describe('getNotificationData - getLeadingZeroCount() tests', () => {
  test('Should handle all test cases', () => {
    expect(getLeadingZeroCount(0)).toBe(0);
    expect(getLeadingZeroCount(-1)).toBe(0);
    expect(getLeadingZeroCount(1e-1)).toBe(0);

    expect(getLeadingZeroCount('1.01')).toBe(1);
    expect(getLeadingZeroCount('3e-2')).toBe(1);
    expect(getLeadingZeroCount('100.001e1')).toBe(1);

    expect(getLeadingZeroCount('0.00120043')).toBe(2);
  });
});

describe('getNotificationData - formatAmount() tests', () => {
  test('Should format large numbers', () => {
    expect(formatAmount(1000)).toBe('1K');
    expect(formatAmount(1500)).toBe('1.5K');
    expect(formatAmount(1000000)).toBe('1M');
    expect(formatAmount(1000000000)).toBe('1B');
    expect(formatAmount(1000000000000)).toBe('1T');
    expect(formatAmount(1234567)).toBe('1.23M');
  });

  test('Should format smaller numbers (<1000) with custom decimal place', () => {
    const formatOptions = { decimalPlaces: 18 };
    expect(formatAmount(100.0012, formatOptions)).toBe('100.0012');
    expect(formatAmount(100.001200001, formatOptions)).toBe('100.001200001');
    expect(formatAmount(1e-18, formatOptions)).toBe('0.000000000000000001');
    expect(formatAmount(1e-19, formatOptions)).toBe('0'); // number is smaller than decimals given, hence 0
  });

  test('Should format small numbers (<1000) up to 4 decimals otherwise uses ellipses', () => {
    const formatOptions = { shouldEllipse: true };
    expect(formatAmount(100.1, formatOptions)).toBe('100.1');
    expect(formatAmount(100.01, formatOptions)).toBe('100.01');
    expect(formatAmount(100.001, formatOptions)).toBe('100.001');
    expect(formatAmount(100.0001, formatOptions)).toBe('100.0001');
    expect(formatAmount(100.00001, formatOptions)).toBe('100.0000...'); // since number is has >4 decimals, it will be truncated
    expect(formatAmount(0.00001, formatOptions)).toBe('0.0000...'); // since number is has >4 decimals, it will be truncated
  });

  test('Should format small numbers (<1000) to custom decimal places and ellipse', () => {
    const formatOptions = { decimalPlaces: 2, shouldEllipse: true };
    expect(formatAmount(100.1, formatOptions)).toBe('100.1');
    expect(formatAmount(100.01, formatOptions)).toBe('100.01');
    expect(formatAmount(100.001, formatOptions)).toBe('100.00...');
    expect(formatAmount(100.0001, formatOptions)).toBe('100.00...');
    expect(formatAmount(100.00001, formatOptions)).toBe('100.00...'); // since number is has >2 decimals, it will be truncated
    expect(formatAmount(0.00001, formatOptions)).toBe('0.00...'); // since number is has >2 decimals, it will be truncated
  });
});

describe('getUsdAmount', () => {
  it('should return formatted USD amount based on token amount, decimals, and USD rate', () => {
    const amount = '1000000000000000000'; // 1 Ether (1e18 wei)
    const decimals = '18';
    const usdRate = '2000'; // 1 Ether = $2000

    const result = getUsdAmount(amount, decimals, usdRate);
    expect(result).toBe('2K'); // Since 1 Ether * $2000 = $2000, formatted as '2K'
  });

  it('should return an empty string if any of the parameters are missing', () => {
    expect(getUsdAmount('', '18', '2000')).toBe('');
    expect(getUsdAmount('1000000000000000000', '', '2000')).toBe('');
    expect(getUsdAmount('1000000000000000000', '18', '')).toBe('');
  });

  it('should handle small amounts correctly', () => {
    const amount = '1000000000000000'; // 0.001 Ether (1e15 wei)
    const decimals = '18';
    const usdRate = '1500'; // 1 Ether = $1500

    const result = getUsdAmount(amount, decimals, usdRate);
    expect(result).toBe('1.5'); // Since 0.001 Ether * $1500 = $1.5
  });

  it('should handle large amounts correctly', () => {
    const amount = '5000000000000000000000'; // 5000 Ether
    const decimals = '18';
    const usdRate = '1000'; // 1 Ether = $1000

    const result = getUsdAmount(amount, decimals, usdRate);
    expect(result).toBe('5M'); // Since 5000 Ether * $1000 = $5,000,000, formatted as '5M'
  });
});

describe('shortenString', () => {
  it('should return the same string if it is shorter than TRUNCATED_NAME_CHAR_LIMIT', () => {
    expect(shortenString('string')).toStrictEqual('string');
  });

  it('should return the shortened string according to the specified options', () => {
    expect(
      shortenString('0x1234567890123456789012345678901234567890', {
        truncatedCharLimit: 10,
        truncatedStartChars: 4,
        truncatedEndChars: 4,
      }),
    ).toStrictEqual('0x12...7890');
  });

  it('should shorten the string and remove all characters from the end if skipCharacterInEnd is true', () => {
    expect(
      shortenString('0x1234567890123456789012345678901234567890', {
        truncatedCharLimit: 10,
        truncatedStartChars: 4,
        truncatedEndChars: 4,
        skipCharacterInEnd: true,
      }),
    ).toStrictEqual('0x12...');
  });
});
